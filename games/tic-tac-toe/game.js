'use strict';

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const AI_DELAY = 450;
// Chance that the computer plays its best move, by difficulty.
const STRENGTH = { easy: 0.25, medium: 0.7, hard: 1 };

const $ = s => document.querySelector(s);
const other = p => (p === 'X' ? 'O' : 'X');

const state = {
  mode: 'ai', difficulty: 'medium', human: 'X', ai: 'O',
  board: [], turn: 'X', over: false, history: [], starter: 'X',
};

// ---------- persistence ----------
const store = {
  read() { try { return JSON.parse(localStorage.getItem('ttt-scores')) || {}; } catch { return {}; } },
  write(v) { try { localStorage.setItem('ttt-scores', JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const scores = store.read();
const scoreKey = () => (state.mode === 'ai' ? `ai-${state.difficulty}-${state.human}` : 'pvp');
const currentScore = () => (scores[scoreKey()] ||= { X: 0, O: 0, D: 0 });

// ---------- rules + AI ----------
function winnerOf(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a], line };
  }
  return null;
}
const emptyCells = b => b.flatMap((v, i) => (v ? [] : [i]));

function minimax(b, player, me, alpha, beta) {
  const result = winnerOf(b);
  if (result) return { score: result.player === me ? 1 : -1 };
  const moves = emptyCells(b);
  if (!moves.length) return { score: 0 };

  const maximizing = player === me;
  let best = { score: maximizing ? -Infinity : Infinity, move: moves[0] };
  for (const m of moves) {
    b[m] = player;
    const { score } = minimax(b, other(player), me, alpha, beta);
    b[m] = null;
    if (maximizing ? score > best.score : score < best.score) best = { score, move: m };
    if (maximizing) alpha = Math.max(alpha, score); else beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiMove() {
  const moves = emptyCells(state.board);
  if (Math.random() < STRENGTH[state.difficulty]) {
    return minimax([...state.board], state.ai, state.ai, -Infinity, Infinity).move;
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

// ---------- rendering ----------
const SVG_X = '<svg viewBox="0 0 100 100"><path pathLength="1" d="M10 10L90 90"/><path pathLength="1" d="M90 10L10 90"/></svg>';
const SVG_O = '<svg viewBox="0 0 100 100"><circle pathLength="1" cx="50" cy="50" r="40" transform="rotate(-90 50 50)"/></svg>';

function buildBoard() {
  const el = $('#board');
  el.replaceChildren(...Array.from({ length: 9 }, (_, i) => {
    const b = document.createElement('button');
    b.className = 'cell';
    b.type = 'button';
    b.addEventListener('click', () => onCell(i));
    return b;
  }));
}

function playerName(p) {
  if (state.mode === 'pvp') return p === 'X' ? 'Player 1' : 'Player 2';
  return p === state.human ? 'You' : 'Computer';
}
const mark = p => `<span class="m ${p}">${p}</span>`;

function setStatus(html) { $('#status').innerHTML = html; }

function render(win) {
  const cells = document.querySelectorAll('.cell');
  cells.forEach((c, i) => {
    const v = state.board[i];
    const was = c.dataset.v || '';
    if ((v || '') !== was) {
      c.dataset.v = v || '';
      c.innerHTML = v === 'X' ? SVG_X : v === 'O' ? SVG_O : '';
    }
    c.className = 'cell' + (v ? ' ' + v : '') + (win && win.line.includes(i) ? ' win' : '');
    c.disabled = state.over || !!v || (state.mode === 'ai' && state.turn === state.ai);
    c.setAttribute('aria-label', `Cell ${i + 1}${v ? `, ${v}` : ', empty'}`);
  });
  $('#board').classList.toggle('over', state.over && !!win);

  const s = currentScore();
  $('#sx').textContent = s.X; $('#so').textContent = s.O; $('#sd').textContent = s.D;
  $('#nameX').textContent = `${playerName('X')} · X`;
  $('#nameO').textContent = `${playerName('O')} · O`;
  $('#scoreX').classList.toggle('on', !state.over && state.turn === 'X');
  $('#scoreO').classList.toggle('on', !state.over && state.turn === 'O');
  $('#undo').disabled = state.over || state.history.length === 0;
}

function drawStrike(win) {
  const svg = document.querySelector('.strike');
  const line = $('#strike');
  svg.classList.remove('show');
  if (!win) return;
  const c = i => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
  const [a, , d] = win.line;
  let [x1, y1] = c(a), [x2, y2] = c(d);
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  x1 -= ux * 30; y1 -= uy * 30; x2 += ux * 30; y2 += uy * 30; // overshoot the end cells a little
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  void svg.getBoundingClientRect(); // restart the animation
  svg.classList.add('show');
}

// ---------- game flow ----------
function newRound() {
  state.board = Array(9).fill(null);
  state.over = false;
  state.history = [];
  state.turn = state.starter;
  drawStrike(null);
  document.querySelectorAll('.cell').forEach(c => { c.dataset.v = ''; });
  announceTurn();
  render();
  maybeAiMove();
}

function announceTurn() {
  const p = state.turn;
  if (state.mode === 'ai') {
    setStatus(p === state.human ? `Your turn ${mark(p)}` : `Computer is thinking ${mark(p)}`);
  } else {
    setStatus(`${playerName(p)}, you're up ${mark(p)}`);
  }
}

function place(i) {
  state.board[i] = state.turn;
  state.history.push(i);
  tone(state.turn === 'X' ? 440 : 330);

  const win = winnerOf(state.board);
  if (win) return finish(win);
  if (!emptyCells(state.board).length) return finish(null);

  state.turn = other(state.turn);
  announceTurn();
  render();
  maybeAiMove();
}

function finish(win) {
  state.over = true;
  const s = currentScore();
  if (win) {
    s[win.player]++;
    const name = playerName(win.player);
    setStatus(name === 'You' ? `You win ${mark(win.player)}` : `${name} wins ${mark(win.player)}`);
    tone(win.player === state.human || state.mode === 'pvp' ? 660 : 220, .3);
  } else {
    s.D++;
    setStatus('A draw');
    tone(260, .25);
  }
  store.write(scores);
  state.starter = other(state.starter); // alternate who opens
  render(win);
  drawStrike(win);
}

function onCell(i) {
  if (state.over || state.board[i]) return;
  if (state.mode === 'ai' && state.turn === state.ai) return;
  place(i);
}

let aiTimer;
function maybeAiMove() {
  clearTimeout(aiTimer);
  if (state.mode !== 'ai' || state.over || state.turn !== state.ai) return;
  aiTimer = setTimeout(() => {
    if (!state.over && state.turn === state.ai) place(chooseAiMove());
  }, AI_DELAY);
}

function undo() {
  if (state.over || !state.history.length) return;
  clearTimeout(aiTimer);
  const pop = () => { state.board[state.history.pop()] = null; };
  if (state.mode === 'ai') {
    if (state.turn === state.human) pop(); // computer's reply
    pop();                                  // your move
    state.turn = state.human;
  } else {
    pop();
    state.turn = other(state.turn);
  }
  announceTurn();
  render();
}

// ---------- screens ----------
function showScreen(name) {
  clearTimeout(aiTimer);
  $('#menu').hidden = name !== 'menu';
  $('#game').hidden = name !== 'game';
}

function syncSetup() {
  const mode = document.querySelector('input[name=mode]:checked').value;
  $('#aiOptions').hidden = mode !== 'ai';
}

$('#setup').addEventListener('change', syncSetup);
$('#setup').addEventListener('submit', e => {
  e.preventDefault();
  const v = name => document.querySelector(`input[name=${name}]:checked`).value;
  state.mode = v('mode');
  state.difficulty = v('difficulty');
  state.human = v('side');
  state.ai = other(state.human);
  state.starter = 'X';
  showScreen('game');
  buildBoard();
  newRound();
});
$('#again').addEventListener('click', newRound);
$('#undo').addEventListener('click', undo);
$('#menuBtn').addEventListener('click', () => showScreen('menu'));
const tone = NG.tone;

syncSetup();
