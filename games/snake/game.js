'use strict';

const G = 20;                       // grid is G x G
const SPEEDS = { slow: 150, normal: 105, fast: 70 };
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };

const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');

const cfg = { player: NG.get('snake-player', 'human'), speed: NG.get('snake-speed', 'normal') };
let best = NG.get('snake-best', { human: 0, ai: 0 });
let snake, prev, dir, queue, food, score, phase = 'ready', timer; // phase: ready | running | paused | over
let stepAt = 0, stepMs = 100, frozenT = 1; // timing of the last step, used to animate between steps

const idx = (x, y) => y * G + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < G && y < G;

// ---------- game state ----------
function reset() {
  clearTimeout(timer);
  const mid = G >> 1;
  snake = [[mid, mid], [mid - 1, mid], [mid - 2, mid]]; // head first
  prev = snake.slice();
  dir = 'right'; queue = []; score = 0; frozenT = 1;
  placeFood();
  showScore();
}

function placeFood() {
  const taken = new Set(snake.map(([x, y]) => idx(x, y)));
  const free = [];
  for (let i = 0; i < G * G; i++) if (!taken.has(i)) free.push(i);
  if (!free.length) { food = null; return; }
  const i = free[Math.floor(Math.random() * free.length)];
  food = [i % G, Math.floor(i / G)];
}

function showScore() {
  $('#score').textContent = score;
  $('#best').textContent = best[cfg.player];
}

function step() {
  if (phase !== 'running') return;
  if (cfg.player === 'ai') dir = aiDirection();
  else if (queue.length) dir = queue.shift();

  const [dx, dy] = VEC[dir];
  const head = [snake[0][0] + dx, snake[0][1] + dy];
  const eating = food && head[0] === food[0] && head[1] === food[1];
  const body = eating ? snake : snake.slice(0, -1); // the tail moves away unless we grow
  if (!inside(...head) || body.some(([x, y]) => x === head[0] && y === head[1])) return gameOver();

  prev = snake.slice();
  snake.unshift(head);
  if (eating) {
    score++; NG.tone(520 + Math.min(score, 20) * 12, .08, 'square', .05);
    placeFood();
    if (!food) return gameOver(true);
  } else snake.pop();
  showScore();
  stepMs = SPEEDS[cfg.speed] * (cfg.player === 'ai' ? .6 : 1);
  stepAt = performance.now();
  timer = setTimeout(step, stepMs);
}

function gameOver(won = false) {
  phase = 'over';
  if (score > best[cfg.player]) { best[cfg.player] = score; NG.set('snake-best', best); }
  showScore();
  NG.tone(won ? 700 : 160, .35, 'sawtooth', .06);
  overlay(won ? 'Board cleared' : 'Game over', `You scored ${score}.`, 'Play again');
}

function overlay(title, text, button) {
  $('#ovTitle').textContent = title; $('#ovText').textContent = text; $('#go').textContent = button;
  $('#overlay').hidden = false;
}

function start() {
  if (phase === 'over' || phase === 'ready') { reset(); }
  phase = 'running';
  $('#overlay').hidden = true;
  clearTimeout(timer);
  prev = snake.slice();
  stepMs = SPEEDS[cfg.speed] * (cfg.player === 'ai' ? .6 : 1);
  stepAt = performance.now();
  timer = setTimeout(step, stepMs);
}

function pause() {
  if (phase !== 'running') return;
  phase = 'paused'; clearTimeout(timer);
  prev = snake.slice(); frozenT = 1;
  overlay('Paused', 'Take a breath.', 'Resume');
}

function turn(d) {
  if (cfg.player === 'ai') return;
  const last = queue.length ? queue[queue.length - 1] : dir;
  if (d === last || d === OPPOSITE[last] || queue.length >= 2) return;
  queue.push(d);
  if (phase === 'ready' || phase === 'paused') start();
}

// ---------- the AI ----------
// Breadth-first search over free cells. `blocked` is a Set of cell indices.
function bfs(from, isGoal, blocked) {
  const prev = new Map([[idx(...from), null]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    if (isGoal(cur) && cur !== from) {
      const path = [];
      for (let c = cur; c !== from; c = prev.get(idx(...c))) path.push(c);
      return path.reverse();
    }
    for (const [dx, dy] of Object.values(VEC)) {
      const n = [cur[0] + dx, cur[1] + dy], k = idx(...n);
      if (!inside(...n) || prev.has(k) || blocked.has(k)) continue;
      prev.set(k, cur); q.push(n);
    }
  }
  return null;
}
const cellSet = cells => new Set(cells.map(c => idx(...c)));
const dirTo = (a, b) => Object.keys(VEC).find(k => VEC[k][0] === b[0] - a[0] && VEC[k][1] === b[1] - a[1]);

function aiDirection() {
  const head = snake[0], tail = snake[snake.length - 1];
  const blocked = cellSet(snake.slice(0, -1)); // tail will have moved

  // 1. Go for the food, but only if we could still reach our tail afterwards (never trap ourselves).
  const toFood = food && bfs(head, c => c[0] === food[0] && c[1] === food[1], blocked);
  if (toFood) {
    const grown = toFood.slice().reverse().concat(snake).slice(0, snake.length + 1);
    const safe = bfs(grown[0], c => c[0] === grown.at(-1)[0] && c[1] === grown.at(-1)[1], cellSet(grown.slice(0, -1)));
    if (safe || grown.length === G * G) return dirTo(head, toFood[0]);
  }
  // 2. Otherwise stall by chasing the tail.
  const toTail = bfs(head, c => c[0] === tail[0] && c[1] === tail[1], blocked);
  if (toTail) return dirTo(head, toTail[0]);
  // 3. Any legal move that keeps us alive.
  for (const d of Object.keys(VEC)) {
    const n = [head[0] + VEC[d][0], head[1] + VEC[d][1]];
    if (inside(...n) && !blocked.has(idx(...n))) return d;
  }
  return dir;
}

// ---------- drawing ----------
// The logic steps on a grid, but we draw between steps so movement is smooth.
const PALETTE = { grassA: '#527f3c', grassB: '#4a7636', outline: '#5e4012', blotch: '#4d3213' };
let bg;

function buildBackground() {
  bg = document.createElement('canvas');
  bg.width = bg.height = cv.width;
  const b = bg.getContext('2d');
  b.setTransform(cv.width / G, 0, 0, cv.height / G, 0, 0);
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    b.fillStyle = (x + y) % 2 ? PALETTE.grassA : PALETTE.grassB;
    b.fillRect(x, y, 1, 1);
  }
  let seed = 7; // fixed seed: the lawn looks the same every time
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  b.lineCap = 'round'; b.lineWidth = .035;
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * G, y = rnd() * G, h = .1 + rnd() * .14, lean = (rnd() - .5) * .1;
    b.strokeStyle = rnd() < .5 ? 'rgba(20,45,12,.3)' : 'rgba(180,215,120,.22)';
    b.beginPath(); b.moveTo(x, y); b.lineTo(x + lean, y - h); b.stroke();
  }
}

function fit() {
  const size = cv.getBoundingClientRect().width || 460, dpr = window.devicePixelRatio || 1;
  cv.width = cv.height = Math.round(size * dpr);
  ctx.setTransform(cv.width / G, 0, 0, cv.height / G, 0, 0); // draw in grid units
  buildBackground();
}

// Centre-line of the body, interpolated between the previous and current step.
function pose() {
  let t;
  if (phase === 'running') { t = Math.min(1, (performance.now() - stepAt) / stepMs); frozenT = t; }
  else t = frozenT;
  return snake.map((c, i) => {
    const o = prev[Math.min(i, prev.length - 1)];
    return [o[0] + (c[0] - o[0]) * t + .5, o[1] + (c[1] - o[1]) * t + .5];
  });
}

function drawApple(now) {
  if (!food) return;
  const s = 1 + Math.sin(now / 350) * .03;
  ctx.save();
  ctx.translate(food[0] + .5, food[1] + .56);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(.03, .33, .3, .09, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(-.1, -.12, .04, 0, 0, .4);
  g.addColorStop(0, '#f26a55'); g.addColorStop(.6, '#c2271d'); g.addColorStop(1, '#8a1410');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, .34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.ellipse(-.12, -.14, .09, .055, -.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = .05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -.3); ctx.lineTo(.03, -.46); ctx.stroke();
  ctx.fillStyle = '#4f9a3b';
  ctx.beginPath(); ctx.ellipse(.14, -.41, .11, .05, -.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSnake(P, now) {
  const n = P.length;
  const width = i => .8 * Math.min(1, .38 + (n - 1 - i) / 7 * .62); // tapers toward the tail
  const seg = (i, w, style, dx = 0, dy = 0) => {
    ctx.strokeStyle = style; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(P[i + 1][0] + dx, P[i + 1][1] + dy); ctx.lineTo(P[i][0] + dx, P[i][1] + dy); ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  for (let i = n - 2; i >= 0; i--) seg(i, width(i) + .06, 'rgba(0,0,0,.22)', .05, .08);   // ground shadow
  for (let i = n - 2; i >= 0; i--) seg(i, width(i) + .07, PALETTE.outline);               // outline
  for (let i = n - 2; i >= 0; i--) seg(i, width(i), `hsl(41,62%,${42 + 9 * (1 - i / Math.max(n - 1, 1))}%)`);
  for (let i = n - 2; i >= 0; i--) seg(i, width(i) * .38, 'rgba(255,240,190,.24)');       // soft ridge down the back

  // saddle-shaped blotches, anchored to body segments so they travel with the snake
  for (let i = 1; i < n - 1; i++) {
    const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
    const a = Math.atan2(P[i][1] - P[i + 1][1], P[i][0] - P[i + 1][0]), w = width(i);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(a);
    ctx.fillStyle = PALETTE.blotch; ctx.globalAlpha = .88;
    ctx.beginPath(); ctx.ellipse(0, 0, i % 2 ? .24 : .2, w * .36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(i % 2 ? .22 : -.22, s * w * .43, .05, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  // head
  const a = n > 1 ? Math.atan2(P[0][1] - P[1][1], P[0][0] - P[1][0]) : 0;
  ctx.save(); ctx.translate(P[0][0], P[0][1]); ctx.rotate(a);
  const ph = (now % 2200) / 2200;
  if (phase === 'running' && ph < .2) { // flicking tongue
    const l = Math.sin(ph / .2 * Math.PI), tip = .45 + .5 * l;
    ctx.strokeStyle = '#c0281e'; ctx.lineWidth = .05;
    ctx.beginPath(); ctx.moveTo(.45, 0); ctx.lineTo(tip, 0);
    ctx.moveTo(tip, 0); ctx.lineTo(tip + .13 * l, -.1 * l);
    ctx.moveTo(tip, 0); ctx.lineTo(tip + .13 * l, .1 * l); ctx.stroke();
  }
  ctx.fillStyle = PALETTE.outline;
  ctx.beginPath(); ctx.ellipse(.06, 0, .6, .49, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d6a436';
  ctx.beginPath(); ctx.ellipse(.06, 0, .55, .44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.blotch; ctx.globalAlpha = .85;
  ctx.beginPath(); ctx.moveTo(.3, 0); ctx.lineTo(-.14, -.2); ctx.lineTo(-.28, 0); ctx.lineTo(-.14, .2); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#f0dc84';
    ctx.beginPath(); ctx.ellipse(.22, s * .27, .095, .095, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#15110a';
    ctx.beginPath(); ctx.ellipse(.23, s * .27, .03, .075, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(.5, s * .1, .025, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function draw() {
  if (!snake || !bg) return;
  const now = performance.now();
  ctx.clearRect(0, 0, G, G);
  ctx.drawImage(bg, 0, 0, G, G);
  drawApple(now);
  drawSnake(pose(), now);
}

function frame() { draw(); requestAnimationFrame(frame); }

// ---------- input + wiring ----------
document.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (KEYS[k]) { e.preventDefault(); turn(KEYS[k]); }
  else if (k === ' ' || k === 'p') {
    e.preventDefault();
    if (phase === 'running') pause(); else start();
  }
});
document.querySelectorAll('.pad button').forEach(b => b.addEventListener('click', () => turn(b.dataset.d)));

let touch;
$('#stage').addEventListener('touchstart', e => { touch = e.touches[0]; }, { passive: true });
$('#stage').addEventListener('touchend', e => {
  if (!touch) return;
  const t = e.changedTouches[0], dx = t.clientX - touch.clientX, dy = t.clientY - touch.clientY;
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});

$('#go').addEventListener('click', start);

NG.seg($('#segPlayer'), [['human', 'You'], ['ai', 'Auto-play AI']], cfg.player, v => {
  cfg.player = v; NG.set('snake-player', v); phase = 'ready'; reset();
  overlay('Snake', v === 'ai' ? 'Watch the pathfinding AI play.' : 'Arrow keys or WASD to steer. Space pauses.', 'Start');
});
NG.seg($('#segSpeed'), [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']], cfg.speed, v => {
  cfg.speed = v; NG.set('snake-speed', v);
});
window.addEventListener('resize', fit);

reset();
fit();
requestAnimationFrame(frame);
