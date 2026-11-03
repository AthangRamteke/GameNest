'use strict';

const ROWS = 6, COLS = 7, AI_DELAY = 350;
const ORDER = [3, 2, 4, 1, 5, 0, 6]; // centre-first ordering makes pruning far more effective
const DEPTH = { easy: 2, medium: 4, hard: 6 };
const BLUNDER = { easy: 0.3, medium: 0.05, hard: 0 }; // chance of ignoring the search entirely
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

const $ = s => document.querySelector(s);
const other = p => 3 - p;

const state = {
  mode: NG.get('c4-mode', 'ai'), difficulty: NG.get('c4-diff', 'medium'),
  board: [], turn: 1, starter: 1, over: false, history: [], win: null,
};
const scores = NG.get('c4-scores', {});
const scoreKey = () => (state.mode === 'ai' ? 'ai-' + state.difficulty : 'pvp');
const tally = () => (scores[scoreKey()] ||= { 1: 0, 2: 0, D: 0 });

// ---------- rules ----------
const dropRow = (b, c) => { for (let r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + c]) return r; return -1; };

// Cells of a four-in-a-row through idx for player p, or null.
function lineThrough(b, idx, p) {
  const r0 = Math.floor(idx / COLS), c0 = idx % COLS;
  for (const [dr, dc] of DIRS) {
    const cells = [idx];
    for (const s of [1, -1]) {
      let r = r0 + dr * s, c = c0 + dc * s;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r * COLS + c] === p) {
        cells.push(r * COLS + c); r += dr * s; c += dc * s;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

// ---------- AI ----------
function evaluate(b, p) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (b[r * COLS + 3] === p) score += 3; else if (b[r * COLS + 3] === other(p)) score -= 3;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of DIRS) {
      const er = r + dr * 3, ec = c + dc * 3;
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
      let mine = 0, theirs = 0;
      for (let k = 0; k < 4; k++) {
        const v = b[(r + dr * k) * COLS + c + dc * k];
        if (v === p) mine++; else if (v) theirs++;
      }
      if (mine && theirs) continue;
      if (mine === 3) score += 6; else if (mine === 2) score += 2;
      if (theirs === 3) score -= 7; else if (theirs === 2) score -= 2;
    }
  }
  return score;
}

// Negamax with alpha-beta; score is from the point of view of the player to move.
function negamax(b, depth, alpha, beta, p) {
  if (!ORDER.some(c => !b[c])) return 0;
  if (depth === 0) return evaluate(b, p);
  let best = -Infinity;
  for (const c of ORDER) {
    const r = dropRow(b, c);
    if (r < 0) continue;
    const i = r * COLS + c;
    b[i] = p;
    const s = lineThrough(b, i, p) ? 1000 + depth : -negamax(b, depth - 1, -beta, -alpha, other(p));
    b[i] = 0;
    if (s > best) best = s;
    alpha = Math.max(alpha, s);
    if (alpha >= beta) break;
  }
  return best;
}

function chooseColumn() {
  const open = ORDER.filter(c => !state.board[c]);
  if (Math.random() < BLUNDER[state.difficulty]) return open[Math.floor(Math.random() * open.length)];
  const b = [...state.board], p = 2;
  let best = -Infinity, pick = open[0];
  for (const c of open) {
    const i = dropRow(b, c) * COLS + c;
    b[i] = p;
    const s = lineThrough(b, i, p) ? 1e6 : -negamax(b, DEPTH[state.difficulty] - 1, -Infinity, Infinity, other(p));
    b[i] = 0;
    if (s > best) { best = s; pick = c; }
  }
  return pick;
}

// ---------- UI ----------
const name = p => (state.mode === 'pvp' ? (p === 1 ? 'Red' : 'Yellow') : (p === 1 ? 'You' : 'Computer'));
const dot = p => `<span style="color:var(--${p === 1 ? 'x' : 'gold'})">●</span>`;

function buildBoard() {
  $('#board').replaceChildren(...Array.from({ length: COLS }, (_, c) => {
    const col = document.createElement('button');
    col.className = 'col'; col.type = 'button';
    col.setAttribute('aria-label', `Column ${c + 1}`);
    col.addEventListener('click', () => onColumn(c));
    for (let r = 0; r < ROWS; r++) { const s = document.createElement('div'); s.className = 'slot'; col.appendChild(s); }
    return col;
  }));
}

function render(animateIdx = -1) {
  const cols = $('#board').children;
  const last = state.history[state.history.length - 1];
  for (let c = 0; c < COLS; c++) {
    const col = cols[c];
    col.disabled = state.over || !!state.board[c] || (state.mode === 'ai' && state.turn === 2);
    for (let r = 0; r < ROWS; r++) {
      const i = r * COLS + c, v = state.board[i], slot = col.children[r];
      const has = slot.firstChild;
      if (!v) { if (has) slot.replaceChildren(); continue; }
      let disc = has;
      if (!disc) { disc = document.createElement('div'); slot.appendChild(disc); disc.style.setProperty('--r', r); }
      else if (i !== animateIdx) disc.style.animation = 'none';
      disc.className = `disc p${v}` + (state.win?.includes(i) ? ' win' : '') + (i === last && !state.over ? ' last' : '');
    }
  }
  const t = tally();
  $('#c1').textContent = t[1]; $('#c2').textContent = t[2]; $('#cd').textContent = t.D;
  $('#n1').textContent = `${name(1)} · Red`; $('#n2').textContent = `${name(2)} · Yellow`;
  $('#s1').classList.toggle('on', !state.over && state.turn === 1);
  $('#s2').classList.toggle('on', !state.over && state.turn === 2);
  $('#undo').disabled = state.over || state.history.length === 0;
}

function announce() {
  const p = state.turn;
  $('#status').innerHTML = state.mode === 'ai'
    ? (p === 1 ? `Your turn ${dot(1)}` : `Computer is thinking ${dot(2)}`)
    : `${name(p)}, you're up ${dot(p)}`;
}

function newGame() {
  state.board = Array(ROWS * COLS).fill(0);
  state.turn = state.starter; state.over = false; state.history = []; state.win = null;
  document.querySelectorAll('.slot').forEach(s => s.replaceChildren());
  announce(); render(); maybeAi();
}

function play(c) {
  const r = dropRow(state.board, c);
  if (r < 0) return;
  const i = r * COLS + c, p = state.turn;
  state.board[i] = p; state.history.push(i);
  NG.tone(p === 1 ? 392 : 330, .12);

  const line = lineThrough(state.board, i, p);
  if (line || state.board.every(Boolean)) return finish(line, p, i);
  state.turn = other(p);
  announce(); render(i); maybeAi();
}

function finish(line, p, i) {
  state.over = true; state.win = line;
  const t = tally();
  if (line) {
    t[p]++;
    $('#status').innerHTML = (name(p) === 'You' ? 'You win ' : `${name(p)} wins `) + dot(p);
    NG.tone(state.mode === 'pvp' || p === 1 ? 660 : 220, .3);
  } else {
    t.D++; $('#status').textContent = 'A draw'; NG.tone(260, .25);
  }
  NG.set('c4-scores', scores);
  state.starter = other(state.starter);
  render(i);
}

function onColumn(c) {
  if (state.over || (state.mode === 'ai' && state.turn === 2)) return;
  play(c);
}

let timer;
function maybeAi() {
  clearTimeout(timer);
  if (state.mode !== 'ai' || state.over || state.turn !== 2) return;
  timer = setTimeout(() => { if (!state.over && state.turn === 2) play(chooseColumn()); }, AI_DELAY);
}

function undo() {
  if (state.over || !state.history.length) return;
  clearTimeout(timer);
  const pop = () => { state.board[state.history.pop()] = 0; };
  if (state.mode === 'ai') { if (state.turn === 1) pop(); pop(); state.turn = 1; }
  else { pop(); state.turn = other(state.turn); }
  announce(); render();
}

// ---------- wiring ----------
const diffSeg = NG.seg($('#segDiff'), [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], state.difficulty, v => {
  state.difficulty = v; NG.set('c4-diff', v); state.starter = 1; newGame();
});
NG.seg($('#segMode'), [['ai', 'Computer'], ['pvp', 'Friend']], state.mode, v => {
  state.mode = v; NG.set('c4-mode', v);
  $('#fDiff').hidden = v !== 'ai'; state.starter = 1; newGame();
});
$('#fDiff').hidden = state.mode !== 'ai';
$('#again').addEventListener('click', newGame);
$('#undo').addEventListener('click', undo);

buildBoard();
newGame();
