'use strict';

const N = 5;
const $ = s => document.querySelector(s);

let level = NG.get('lo-level', 1);
let high = NG.get('lo-high', 1);
let start, startTaps, board, solution, moves, solved;

const toggle = (b, i) => {
  const x = i % N, y = Math.floor(i / N);
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < N && ny >= 0 && ny < N) b[ny * N + nx] = !b[ny * N + nx];
  }
};

// Scramble a solved board with random taps, so the level is solvable by construction.
// Taps commute, so `solution` is simply the set of cells still needing a tap.
function generate() {
  const b = Array(N * N).fill(false), taps = new Set();
  const count = Math.min(3 + level, 14);
  const order = [...b.keys()].sort(() => Math.random() - .5);
  for (const i of order.slice(0, count)) { toggle(b, i); taps.add(i); }
  if (b.every(v => !v)) return generate();
  return { board: b, taps };
}

// A new level makes a fresh puzzle; restarting replays the same one from its start.
function load(fresh) {
  if (fresh) ({ board: start, taps: startTaps } = generate());
  board = start.slice();
  solution = new Set(startTaps);
  moves = 0; solved = false;
  render(); setStatus();
}

function press(i) {
  if (solved) return;
  toggle(board, i);
  solution.has(i) ? solution.delete(i) : solution.add(i);
  moves++;
  NG.tone(300 + (i % N) * 60 + Math.floor(i / N) * 20, .07, 'triangle', .07);
  if (board.every(v => !v)) {
    solved = true;
    if (level >= high) { high = level + 1; NG.set('lo-high', high); }
    NG.tone(660, .25);
  }
  render(); setStatus();
}

function setStatus() {
  $('#status').textContent = solved ? `Solved in ${moves} ${moves === 1 ? 'move' : 'moves'}` : 'Turn every light off';
  $('#next').hidden = !solved;
  $('#hint').disabled = solved;
}

function render(hintIdx = -1) {
  const lights = $('#grid').children;
  board.forEach((on, i) => {
    lights[i].className = 'l' + (on ? ' on' : '') + (i === hintIdx ? ' hint' : '');
  });
  $('#grid').classList.toggle('solved', solved);
  $('#level').textContent = level; $('#high').textContent = high; $('#moves').textContent = moves;
}

$('#grid').replaceChildren(...Array.from({ length: N * N }, (_, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'l'; b.setAttribute('aria-label', `Light ${i % N + 1}, ${Math.floor(i / N) + 1}`);
  b.addEventListener('click', () => press(i));
  return b;
}));

$('#hint').addEventListener('click', () => {
  const pick = [...solution][0];
  if (pick !== undefined) render(pick);
});
$('#reset').addEventListener('click', () => load(false));
$('#next').addEventListener('click', () => { level++; NG.set('lo-level', level); load(true); });

load(true);
