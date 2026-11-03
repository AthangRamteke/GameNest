'use strict';

// Small helpers shared by every game: storage, sound, segmented controls.
const NG = (() => {
  const get = (k, d) => {
    try { const v = localStorage.getItem('ng-' + k); return v === null ? d : JSON.parse(v); } catch { return d; }
  };
  const set = (k, v) => {
    try { localStorage.setItem('ng-' + k, JSON.stringify(v)); } catch { /* storage unavailable */ }
  };

  let muted = get('muted', false);
  let ctx;
  function tone(freq, dur = .1, type = 'sine', vol = .12) {
    if (muted) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* audio unavailable */ }
  }

  // Segmented control built from buttons. options: [[value, label], ...]
  function seg(el, options, value, onChange) {
    let current = value;
    const paint = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === String(current)));
    el.replaceChildren(...options.map(([v, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.v = v; b.textContent = label;
      b.addEventListener('click', () => { current = v; paint(); onChange(v); });
      return b;
    }));
    paint();
    return { set(v) { current = v; paint(); }, get: () => current };
  }

  const btn = document.getElementById('mute');
  if (btn) {
    const sync = () => {
      btn.setAttribute('aria-pressed', muted);
      btn.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
    };
    btn.addEventListener('click', () => { muted = !muted; set('muted', muted); sync(); });
    sync();
  }

  return { get, set, tone, seg };
})();
