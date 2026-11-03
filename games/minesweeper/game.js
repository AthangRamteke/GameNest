'use strict';

const LEVELS = {
  easy: { w: 9, h: 9, mines: 10, label: 'Easy · 9×9' },
  medium: { w: 12, h: 12, mines: 24, label: 'Medium · 12×12' },
  hard: { w: 16, h: 16, mines: 50, label: 'Hard · 16×16' },
};
const LONG_PRESS = 380;

const $ = s => document.querySelector(s);
const FLAG = '<svg viewBox="0 0 24 24"><path d="M7 21V3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7 4l11 4.5L7 13z" fill="var(--x)"/></svg>';
const MINE = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5.5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const cfg = { level: NG.get('ms-level', 'easy'), tool: 'reveal' };
const bests = NG.get('ms-best', {});
let W, H, MINES, cells, phase, startedAt, ticker, flags;
// cells[i] = { mine, open, flag, n }

const neighbours = i => {
  const x = i % W, y = Math.floor(i / W), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H) out.push((y + dy) * W + x + dx);
  }
  return out;
};

function newGame() {
  ({ w: W, h: H, mines: MINES } = LEVELS[cfg.level]);
  cells = Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: false, n: 0 }));
  phase = 'ready'; flags = 0;
  clearInterval(ticker);
  $('#time').textContent = '0';
  $('#status').textContent = '';
  const g = $('#grid');
  g.style.gridTemplateColumns = `repeat(${W},1fr)`;
  g.replaceChildren(...cells.map((_, i) => {
    const t = document.createElement('button');
    t.className = 't'; t.type = 'button'; t.dataset.i = i;
    return t;
  }));
  paint();
}

// Mines are placed after the first click so it can never be one (nor its neighbours).
function plant(safe) {
  const banned = new Set([safe, ...neighbours(safe)]);
  const pool = cells.map((_, i) => i).filter(i => !banned.has(i));
  for (let k = 0; k < MINES; k++) {
    const j = k + Math.floor(Math.random() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
    cells[pool[k]].mine = true;
  }
  cells.forEach((c, i) => { c.n = neighbours(i).filter(j => cells[j].mine).length; });
}

function reveal(i) {
  const c = cells[i];
  if (phase === 'over' || phase === 'won' || c.open || c.flag) return;
  if (phase === 'ready') {
    plant(i); phase = 'playing'; startedAt = Date.now();
    ticker = setInterval(() => { $('#time').textContent = Math.floor((Date.now() - startedAt) / 1000); }, 250);
  }
  if (c.mine) return lose(i);

  const stack = [i];
  while (stack.length) { // flood fill through empty areas
    const k = stack.pop(), cell = cells[k];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (!cell.n) stack.push(...neighbours(k));
  }
  NG.tone(300 + c.n * 40, .05, 'triangle', .06);
  if (cells.every(x => x.open || x.mine)) win();
  paint();
}

function toggleFlag(i) {
  const c = cells[i];
  if (phase === 'over' || phase === 'won' || c.open) return;
  c.flag = !c.flag; flags += c.flag ? 1 : -1;
  NG.tone(c.flag ? 520 : 400, .04, 'square', .04);
  paint();
}

function chord(i) {
  const c = cells[i];
  if (!c.open || !c.n) return;
  const around = neighbours(i);
  if (around.filter(j => cells[j].flag).length !== c.n) return;
  for (const j of around) { if (cells[j].mine && !cells[j].flag) return lose(j); reveal(j); }
}

function lose(hit) {
  phase = 'over'; clearInterval(ticker);
  cells[hit].boom = true;
  cells.forEach(c => { if (c.mine) c.open = c.open || !c.flag; });
  $('#status').textContent = 'Boom. Better luck next time.';
  NG.tone(120, .4, 'sawtooth', .08);
  paint();
}

function win() {
  phase = 'won'; clearInterval(ticker);
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  $('#time').textContent = secs;
  cells.forEach(c => { if (c.mine) c.flag = true; });
  flags = MINES;
  const prev = bests[cfg.level];
  if (!prev || secs < prev) { bests[cfg.level] = secs; NG.set('ms-best', bests); $('#status').textContent = `Cleared in ${secs}s. New best!`; }
  else $('#status').textContent = `Cleared in ${secs}s.`;
  NG.tone(660, .3);
}

function paint() {
  const els = $('#grid').children;
  cells.forEach((c, i) => {
    const el = els[i];
    const lost = phase === 'over';
    let cls = 't', html = '';
    if (c.open && c.mine) { cls += ' open' + (c.boom ? ' boom' : ''); html = MINE; }
    else if (c.open) { cls += ' open'; if (c.n) { cls += ' n' + c.n; html = c.n; } }
    else if (c.flag) { html = FLAG; if (lost && !c.mine) cls += ' wrong'; }
    el.className = cls;
    if (el.innerHTML !== String(html)) el.innerHTML = html;
    el.setAttribute('aria-label', c.open ? (c.mine ? 'mine' : `${c.n} nearby`) : c.flag ? 'flag' : 'hidden');
  });
  $('#left').textContent = MINES - flags;
  $('#best').textContent = bests[cfg.level] ? bests[cfg.level] + 's' : '–';
}

// ---------- input ----------
const grid = $('#grid');
let pressTimer, longPressed;
const target = e => { const t = e.target.closest('.t'); return t ? +t.dataset.i : -1; };

grid.addEventListener('pointerdown', e => {
  longPressed = false;
  const i = target(e);
  if (i < 0 || e.button === 2) return;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { longPressed = true; toggleFlag(i); navigator.vibrate?.(20); }, LONG_PRESS);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => grid.addEventListener(t, () => clearTimeout(pressTimer)));
grid.addEventListener('click', e => {
  const i = target(e);
  if (i < 0 || longPressed) return;
  if (cells[i].open) return chord(i);
  if (cfg.tool === 'flag') toggleFlag(i); else reveal(i);
});
grid.addEventListener('contextmenu', e => { e.preventDefault(); const i = target(e); if (i >= 0) toggleFlag(i); });

NG.seg($('#segLevel'), Object.entries(LEVELS).map(([k, v]) => [k, v.label.split(' · ')[0]]), cfg.level, v => {
  cfg.level = v; NG.set('ms-level', v); newGame();
});
NG.seg($('#segTool'), [['reveal', 'Reveal'], ['flag', 'Flag']], cfg.tool, v => { cfg.tool = v; });
$('#again').addEventListener('click', newGame);

newGame();
