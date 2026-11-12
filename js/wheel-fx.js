// 2.13.0 · часть 11: эффект «взрыва» на колесе героев (частицы, кольцо, вспышка, тряска)
(function () {
  const KIND = { jackpot: 'epic', triple: 'epic', skin: 'big', eq: 'big', gems: 'mid', level: 'small' };
  const COLORS = ['#f0d27a', '#ffd34d', '#ff9e3d', '#fff3c4', '#ffffff'];
  function noAnim() { return document.body.classList.contains('noanim') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  window.wheelBurst = function (seg) {
    const host = document.getElementById('hero-wheel');
    if (!host || !seg) return;
    const kind = KIND[seg.type];
    if (!kind) { // провал — короткая тряска без частиц
      if (!noAnim()) { host.classList.remove('wf-shake'); void host.offsetWidth; host.classList.add('wf-shake'); setTimeout(() => host.classList.remove('wf-shake'), 500); }
      return;
    }
    if (noAnim()) return;
    const n = { small: 10, mid: 16, big: 26, epic: 44 }[kind];
    const dist = { small: 90, mid: 120, big: 160, epic: 210 }[kind];
    const box = document.createElement('div'); box.className = 'wf-burst wf-' + kind;
    const flash = document.createElement('i'); flash.className = 'wf-flash'; box.appendChild(flash);
    const ring = document.createElement('i'); ring.className = 'wf-ring'; box.appendChild(ring);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('b');
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = dist * (0.55 + Math.random() * 0.6);
      p.style.setProperty('--dx', Math.round(Math.cos(ang) * d) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(ang) * d) + 'px');
      p.style.setProperty('--c', COLORS[i % COLORS.length]);
      p.style.setProperty('--s', (4 + Math.random() * (kind === 'epic' ? 8 : 5)).toFixed(1) + 'px');
      p.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
      box.appendChild(p);
    }
    host.appendChild(box);
    if (kind === 'epic' || kind === 'big') { host.classList.remove('wf-shake'); void host.offsetWidth; host.classList.add('wf-shake'); setTimeout(() => host.classList.remove('wf-shake'), 500); }
    setTimeout(() => box.remove(), 1400);
  };
  const _apply = window.applySegment;
  if (typeof _apply === 'function') {
    window.applySegment = applySegment = function (seg, cost) {
      const r = _apply.apply(this, arguments);
      try { wheelBurst(seg); } catch (e) { console.warn('wheelBurst', e); }
      return r;
    };
  }
})();
