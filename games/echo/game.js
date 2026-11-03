'use strict';

const PADS = [
  { color: '#c4452d', freq: 262 },
  { color: '#d4a017', freq: 330 },
  { color: '#3f8f6b', freq: 392 },
  { color: '#3b7fa6', freq: 523 },
];
const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));

let sequence = [], input = [], phase = 'idle'; // idle | showing | input
let best = NG.get('echo-best', 0);
let runId = 0; // bumps on every start so a stale playback can't leak into a new run

const els = PADS.map((p, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'pad'; b.style.setProperty('--c', p.color);
  b.setAttribute('aria-label', `Pad ${i + 1}`);
  b.innerHTML = `<kbd>${i + 1}</kbd>`;
  b.addEventListener('click', () => tap(i));
  return b;
});
$('#pads').replaceChildren(...els);

function setStatus(t) { $('#status').textContent = t; }
function show() {
  $('#round').textContent = Math.max(sequence.length - 1, 0);
  $('#best').textContent = best;
  els.forEach(e => { e.disabled = phase !== 'input'; });
  $('#pads').classList.toggle('off', phase !== 'input');
}

async function flash(i, ms) {
  els[i].classList.add('lit');
  NG.tone(PADS[i].freq, ms / 1000, 'triangle', .14);
  await wait(ms);
  els[i].classList.remove('lit');
}

async function playback(id) {
  phase = 'showing'; show(); setStatus('Watch…');
  const speed = Math.max(.35, 1 - sequence.length * .035); // gets quicker each round
  await wait(600);
  for (const i of sequence) {
    if (id !== runId) return;
    await flash(i, 420 * speed);
    await wait(180 * speed);
  }
  if (id !== runId) return;
  phase = 'input'; input = []; show(); setStatus('Your turn');
}

function nextRound() {
  sequence.push(Math.floor(Math.random() * PADS.length));
  return playback(runId);
}

async function tap(i) {
  if (phase !== 'input') return;
  const id = runId;
  await flash(i, 160);
  if (id !== runId) return;
  input.push(i);
  const k = input.length - 1;

  if (input[k] !== sequence[k]) return fail();
  if (input.length === sequence.length) {
    phase = 'showing'; show(); setStatus('Nice.');
    NG.tone(660, .15, 'sine', .08);
    await wait(500);
    if (id === runId) nextRound();
  }
}

function fail() {
  const score = sequence.length - 1;
  phase = 'idle';
  if (score > best) { best = score; NG.set('echo-best', best); setStatus(`Missed. New best: ${score}!`); }
  else setStatus(`Missed. You reached round ${score}.`);
  NG.tone(140, .4, 'sawtooth', .08);
  $('#go').textContent = 'Play again';
  show();
}

function start() {
  runId++; sequence = []; input = [];
  $('#go').textContent = 'Restart';
  nextRound();
}

$('#go').addEventListener('click', start);
document.addEventListener('keydown', e => {
  const i = '1234'.indexOf(e.key);
  if (i >= 0) tap(i);
});

show();
