'use strict';

const BASE_POINTS = 100;
const SPEED_BONUS = 50;     // extra points for answering instantly, scaled down to 0 as time runs out
const REVEAL_MS = 1800;     // auto-advance delay after an answer
const LETTERS = ['A', 'B', 'C', 'D'];

const $ = s => document.querySelector(s);
const shuffle = a => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

const CATEGORIES = ['All', ...new Set(QUESTIONS.map(q => q[0]))];
const cfg = { cat: NG.get('tv-cat', 'All'), count: NG.get('tv-count', 10), time: NG.get('tv-time', 15) };
let best = NG.get('tv-best', 0);

let round, index, score, correct, streak, bestStreak, missed, answered, deadline, raf, advanceTimer;

// ---------- setup ----------
function buildChips() {
  $('#cats').replaceChildren(...CATEGORIES.map(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = c;
    b.setAttribute('aria-pressed', c === cfg.cat);
    b.addEventListener('click', () => {
      cfg.cat = c; NG.set('tv-cat', c);
      $('#cats').querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x.textContent === c));
    });
    return b;
  }));
}

function show(name) {
  ['menu', 'play', 'end'].forEach(id => { $('#' + id).hidden = id !== (name === 'menu' ? 'menu' : name); });
}

// ---------- round ----------
function startRound() {
  const pool = QUESTIONS.filter(q => cfg.cat === 'All' || q[0] === cfg.cat);
  round = shuffle(pool).slice(0, cfg.count).map(([cat, text, right, wrong]) => ({
    cat, text, right, options: shuffle([right, ...wrong]),
  }));
  index = 0; score = 0; correct = 0; streak = 0; bestStreak = 0; missed = [];
  show('play');
  ask();
}

function ask() {
  clearTimeout(advanceTimer);
  const q = round[index];
  answered = false;
  $('#progress').textContent = `Question ${index + 1} of ${round.length}`;
  $('#cat').textContent = q.cat;
  $('#pts').textContent = `${score} pts`;
  $('#question').textContent = q.text;
  $('#feedback').textContent = '';
  $('#next').hidden = true;
  $('#options').replaceChildren(...q.options.map((text, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt';
    b.innerHTML = `<span class="k">${LETTERS[i]}</span><span></span><span class="mk"></span>`;
    b.children[1].textContent = text;
    b.addEventListener('click', () => choose(i));
    return b;
  }));
  startTimer();
}

function startTimer() {
  const total = cfg.time * 1000;
  deadline = performance.now() + total;
  const bar = $('#bar');
  cancelAnimationFrame(raf);
  (function tick() {
    const left = Math.max(0, deadline - performance.now());
    bar.firstElementChild.style.transform = `scaleX(${left / total})`;
    bar.classList.toggle('low', left < total * .3);
    $('#secs').textContent = Math.ceil(left / 1000);
    if (left <= 0) return timeUp();
    raf = requestAnimationFrame(tick);
  })();
}

function reveal(pickedIndex) {
  answered = true;
  cancelAnimationFrame(raf);
  const q = round[index];
  [...$('#options').children].forEach((b, i) => {
    b.disabled = true;
    const isRight = q.options[i] === q.right;
    b.classList.add(isRight ? 'right' : i === pickedIndex ? 'wrong' : 'dim');
    if (isRight) b.querySelector('.mk').textContent = '✓';
    else if (i === pickedIndex) b.querySelector('.mk').textContent = '✗';
  });
  $('#pts').textContent = `${score} pts`;
  const last = index === round.length - 1;
  $('#next').textContent = last ? 'See results' : 'Next question';
  $('#next').hidden = false;
  advanceTimer = setTimeout(next, REVEAL_MS + (pickedIndex === -1 ? 600 : 0));
}

function choose(i) {
  if (answered) return;
  const q = round[index];
  const left = Math.max(0, deadline - performance.now()) / (cfg.time * 1000);
  if (q.options[i] === q.right) {
    const gained = BASE_POINTS + Math.round(SPEED_BONUS * left) + Math.min(streak, 5) * 10;
    score += gained; correct++; streak++; bestStreak = Math.max(bestStreak, streak);
    $('#feedback').textContent = `Correct, +${gained}${streak > 1 ? ` · ${streak} in a row` : ''}`;
    NG.tone(660, .15, 'sine', .1);
  } else {
    streak = 0; missed.push(q);
    $('#feedback').textContent = `Not quite. The answer is ${q.right}.`;
    NG.tone(170, .3, 'sawtooth', .07);
  }
  reveal(i);
}

function timeUp() {
  if (answered) return;
  const q = round[index];
  streak = 0; missed.push(q);
  $('#feedback').textContent = `Time's up. The answer is ${q.right}.`;
  NG.tone(170, .3, 'sawtooth', .07);
  reveal(-1);
}

function next() {
  if (!answered) return;
  clearTimeout(advanceTimer);
  if (++index < round.length) ask(); else finish();
}

// ---------- result ----------
function finish() {
  cancelAnimationFrame(raf);
  const isBest = score > best;
  if (isBest) { best = score; NG.set('tv-best', best); }
  $('#finalScore').textContent = score;
  const pct = Math.round(correct / round.length * 100);
  $('#finalNote').textContent = `${pct}% correct${isBest && score > 0 ? ' · a new personal best' : ''}`;
  $('#tCorrect').textContent = `${correct}/${round.length}`;
  $('#tStreak').textContent = bestStreak;
  $('#tBest').textContent = best;
  $('#review').hidden = !missed.length;
  $('#missed').replaceChildren(...missed.map(q => {
    const li = document.createElement('li');
    li.textContent = q.text;
    const s = document.createElement('small');
    s.append('Answer: ');
    const b = document.createElement('b'); b.textContent = q.right; s.append(b);
    li.append(s);
    return li;
  }));
  NG.tone(correct >= round.length / 2 ? 660 : 220, .3);
  show('end');
}

// ---------- wiring ----------
NG.seg($('#segCount'), [[5, '5'], [10, '10'], [15, '15']], cfg.count, v => { cfg.count = +v; NG.set('tv-count', +v); });
NG.seg($('#segTime'), [[10, '10 seconds'], [15, '15 seconds'], [25, '25 seconds']], cfg.time, v => { cfg.time = +v; NG.set('tv-time', +v); });
$('#start').addEventListener('click', startRound);
$('#again').addEventListener('click', startRound);
$('#settings').addEventListener('click', () => show('menu'));
$('#next').addEventListener('click', next);
document.addEventListener('keydown', e => {
  if ($('#play').hidden) return;
  const i = '1234'.indexOf(e.key);
  if (i >= 0 && i < round[index].options.length) choose(i);
  else if (e.key === 'Enter') next();
});

buildChips();
