'use strict';

const N = 8, AI_DELAY = 550;
const DEPTH = { easy: 1, medium: 3, hard: 5 };
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// Corners are gold, squares next to corners are traps.
const WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 3, 1, 1, 3, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 3, 1, 1, 3, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];

const $ = s => document.querySelector(s);
const other = p => 3 - p; // 1 = black, 2 = white

const state = {
  mode: NG.get('oth-mode', 'ai'), difficulty: NG.get('oth-diff', 'medium'),
  board: [], turn: 1, over: false, history: [], last: -1, flipped: [], note: '',
};
const records = NG.get('oth-records', {});
const recKey = () => state.difficulty;
const record = () => (records[recKey()] ||= { w: 0, l: 0, d: 0 });

// ---------- rules ----------
function flipsFor(b, idx, p) {
  if (b[idx]) return [];
  const r0 = Math.floor(idx / N), c0 = idx % N, out = [];
  for (const [dr, dc] of DIRS) {
    const run = [];
    let r = r0 + dr, c = c0 + dc;
    while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === other(p)) { run.push(r * N + c); r += dr; c += dc; }
    if (run.length && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) out.push(...run);
  }
  return out;
}
const legalMoves = (b, p) => { const m = []; for (let i = 0; i < 64; i++) if (flipsFor(b, i, p).length) m.push(i); return m; };
const count = (b, p) => b.reduce((n, v) => n + (v === p), 0);

function applyMove(b, idx, p) {
  const flips = flipsFor(b, idx, p);
  const nb = b.slice();
  nb[idx] = p;
  for (const f of flips) nb[f] = p;
  return nb;
}

// ---------- AI ----------
function evaluate(b, me) {
  const op = other(me);
  let pos = 0;
  for (let i = 0; i < 64; i++) if (b[i] === me) pos += WEIGHTS[i]; else if (b[i] === op) pos -= WEIGHTS[i];
  const mob = legalMoves(b, me).length - legalMoves(b, op).length;
  return pos + mob * 6;
}

function search(b, depth, alpha, beta, p, me) {
  const moves = legalMoves(b, p);
  if (!moves.length) {
    const oppMoves = legalMoves(b, other(p));
    if (!oppMoves.length) return (count(b, me) - count(b, other(me))) * 1000; // game over
    return search(b, depth, alpha, beta, other(p), me); // pass
  }
  if (depth === 0) return evaluate(b, me);
  const maximizing = p === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const s = search(applyMove(b, m, p), depth - 1, alpha, beta, other(p), me);
    if (maximizing) { best = Math.max(best, s); alpha = Math.max(alpha, s); }
    else { best = Math.min(best, s); beta = Math.min(beta, s); }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseMove() {
  const moves = legalMoves(state.board, 2);
  if (state.difficulty === 'easy' && Math.random() < 0.4) return moves[Math.floor(Math.random() * moves.length)];
  let best = -Infinity, pick = moves[0];
  for (const m of moves) {
    const s = search(applyMove(state.board, m, 2), DEPTH[state.difficulty] - 1, -Infinity, Infinity, 1, 2);
    if (s > best) { best = s; pick = m; }
  }
  return pick;
}

// ---------- UI ----------
const name = p => (state.mode === 'pvp' ? (p === 1 ? 'Black' : 'White') : (p === 1 ? 'You' : 'Computer'));
const dot = p => `<span style="color:${p === 1 ? 'var(--o)' : 'var(--ink)'}">●</span>`;
const isAiTurn = () => state.mode === 'ai' && state.turn === 2;

function buildBoard() {
  $('#board').replaceChildren(...Array.from({ length: 64 }, (_, i) => {
    const s = document.createElement('button');
    s.className = 'sq'; s.type = 'button';
    s.addEventListener('click', () => onSquare(i));
    return s;
  }));
}

function render() {
  const legal = state.over || isAiTurn() ? [] : legalMoves(state.board, state.turn);
  document.querySelectorAll('.sq').forEach((sq, i) => {
    const v = state.board[i];
    sq.className = 'sq' + (legal.includes(i) ? ' ok' : '') + (i === state.last ? ' last' : '');
    sq.disabled = !legal.includes(i);
    sq.setAttribute('aria-label', `${String.fromCharCode(97 + i % 8)}${Math.floor(i / 8) + 1}${v ? (v === 1 ? ', black' : ', white') : ''}`);
    const stone = sq.firstChild;
    if (!v) { if (stone) sq.replaceChildren(); return; }
    const cls = 'stone ' + (v === 1 ? 'b' : 'w');
    if (!stone) {
      const el = document.createElement('div');
      el.className = cls + ' pop'; sq.appendChild(el);
    } else {
      const changed = !stone.className.startsWith(cls);
      stone.className = cls + (changed ? ' flip' : '');
      if (changed) void stone.offsetWidth;
    }
  });
  const b = count(state.board, 1), w = count(state.board, 2);
  $('#cB').textContent = b; $('#cW').textContent = w; $('#cE').textContent = 64 - b - w;
  $('#nB').textContent = `${name(1)} · Black`; $('#nW').textContent = `${name(2)} · White`;
  $('#sB').classList.toggle('on', !state.over && state.turn === 1);
  $('#sW').classList.toggle('on', !state.over && state.turn === 2);
  $('#undo').disabled = state.over || !state.history.length;
  const r = record();
  $('#record').textContent = state.mode === 'ai' ? `Record on ${state.difficulty}: ${r.w} won · ${r.l} lost · ${r.d} drawn` : '';
}

function announce() {
  const p = state.turn;
  const lead = state.note ? state.note + ' ' : '';
  $('#status').innerHTML = lead + (state.mode === 'ai'
    ? (p === 1 ? `Your turn ${dot(1)}` : `Computer is thinking ${dot(2)}`)
    : `${name(p)}'s turn ${dot(p)}`);
}

function newGame() {
  clearTimeout(timer);
  const b = Array(64).fill(0);
  b[27] = 2; b[36] = 2; b[28] = 1; b[35] = 1;
  Object.assign(state, { board: b, turn: 1, over: false, history: [], last: -1, note: '' });
  document.querySelectorAll('.sq').forEach(s => s.replaceChildren());
  announce(); render(); maybeAi();
}

function move(idx) {
  const p = state.turn;
  state.history.push({ board: state.board, turn: p, last: state.last });
  state.board = applyMove(state.board, idx, p);
  state.last = idx; state.note = '';
  NG.tone(p === 1 ? 300 : 380, .1);
  advance();
}

// Hand the turn over, handling passes and the end of the game.
function advance() {
  const next = other(state.turn);
  if (legalMoves(state.board, next).length) state.turn = next;
  else if (legalMoves(state.board, state.turn).length) state.note = `${name(next)} must pass.`;
  else return finish();
  announce(); render(); maybeAi();
}

function finish() {
  state.over = true;
  const b = count(state.board, 1), w = count(state.board, 2);
  if (b === w) $('#status').textContent = `A draw, ${b}–${w}`;
  else {
    const p = b > w ? 1 : 2;
    $('#status').innerHTML = `${name(p) === 'You' ? 'You win' : name(p) + ' wins'} ${dot(p)} ${Math.max(b, w)}–${Math.min(b, w)}`;
  }
  if (state.mode === 'ai') {
    const r = record();
    if (b === w) r.d++; else if (b > w) r.w++; else r.l++;
    NG.set('oth-records', records);
  }
  NG.tone(b >= w ? 660 : 220, .3);
  render();
}

function onSquare(i) {
  if (state.over || isAiTurn() || !flipsFor(state.board, i, state.turn).length) return;
  move(i);
}

let timer;
function maybeAi() {
  clearTimeout(timer);
  if (!isAiTurn() || state.over) return;
  timer = setTimeout(() => { if (isAiTurn() && !state.over) move(chooseMove()); }, AI_DELAY);
}

function undo() {
  if (state.over || !state.history.length) return;
  clearTimeout(timer);
  let snap;
  do { snap = state.history.pop(); } while (state.mode === 'ai' && snap.turn !== 1 && state.history.length);
  Object.assign(state, { board: snap.board, turn: snap.turn, last: snap.last, note: '' });
  announce(); render(); maybeAi();
}

// ---------- wiring ----------
NG.seg($('#segDiff'), [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], state.difficulty, v => {
  state.difficulty = v; NG.set('oth-diff', v); newGame();
});
NG.seg($('#segMode'), [['ai', 'Computer'], ['pvp', 'Friend']], state.mode, v => {
  state.mode = v; NG.set('oth-mode', v); $('#fDiff').hidden = v !== 'ai'; newGame();
});
$('#fDiff').hidden = state.mode !== 'ai';
$('#again').addEventListener('click', newGame);
$('#undo').addEventListener('click', undo);

buildBoard();
newGame();
