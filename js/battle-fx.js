// ================= 2.13: экран подготовки к бою и обратная связь в бою =================
// Подключается после arena.js / arena-extras.js. Данные игры не меняет — только отображение.
(function () {
  if (window.__D2M_BATTLE_FX__) return;
  window.__D2M_BATTLE_FX__ = true;

  // ---------- запоминаем последний расчёт шанса победы, чтобы не считать его дважды ----------
  let lastWin = null;
  if (typeof winChanceEstimate === 'function') {
    const _w = winChanceEstimate;
    winChanceEstimate = function (def) { const r = _w(def); lastWin = { L: def && def.L, r, R: def && def.R }; return r; };
  }

  // ---------- панель подготовки внутри блока «All Pick» ----------
  function verdict(ch) {
    return ch >= 0.9 ? ['Лёгкая победа', 'var(--ok)'] : ch >= 0.7 ? ['Уверенный бой', 'var(--ok)'] : ch >= 0.45 ? ['Равный бой', 'var(--gold2)'] : ch >= 0.2 ? ['Опасно — усиль стак', 'var(--danger)'] : ['Почти без шансов', 'var(--danger)'];
  }
  function renderPrep() {
    const host = document.getElementById('prep-box'); if (!host) return;
    const loc = typeof arenaLoc !== 'undefined' ? String(arenaLoc) : '';
    if (loc.startsWith('f:') || (typeof arenaMode !== 'undefined' && arenaMode === 'survival') || !lastWin || lastWin.L !== arenaSel) { host.innerHTML = ''; host.style.display = 'none'; return; }
    const mine = stackPower(), foe = lastWin.R || 1, ch = lastWin.r, mx = Math.max(mine, foe, 1), v = verdict(ch);
    const syn = typeof activeSynergies === 'function' ? activeSynergies(getStack()) : [];
    host.style.display = '';
    host.innerHTML =
      '<div class="prep-row"><span class="prep-l">Твой стак</span><div class="prep-bar"><i class="me" style="width:' + Math.max(3, Math.round(mine / mx * 100)) + '%"></i></div><b>' + fmt(mine) + '</b></div>' +
      '<div class="prep-row"><span class="prep-l">Враги</span><div class="prep-bar"><i class="foe" style="width:' + Math.max(3, Math.round(foe / mx * 100)) + '%"></i></div><b>' + fmt(foe) + '</b></div>' +
      '<div class="prep-win"><div class="prep-gauge" role="img" aria-label="Шанс победы ' + Math.round(ch * 100) + '%"><i style="width:' + Math.round(ch * 100) + '%;background:' + v[1] + '"></i></div>' +
      '<div class="prep-txt"><b style="color:' + v[1] + '">' + Math.round(ch * 100) + '%</b> <span>' + v[0] + '</span></div></div>' +
      (syn.length ? '<div class="prep-syn">' + syn.map(s => '<span class="prep-chip" title="' + esc(s.d || s.desc || '') + '">🧩 ' + esc(s.name) + '</span>').join('') + '</div>' : '<div class="prep-syn muted">Синергий нет — собери пару героев из списка «Синергии стака».</div>') +
      '<button class="btn green big prep-go" data-click="startBattle(' + arenaSel + ',false)">⚔ В БОЙ · уровень ' + arenaSel + '</button>';
  }
  function decoratePicks() {
    const ids = getStack();
    document.querySelectorAll('#pick-row .pick').forEach((d, i) => {
      const id = ids[i]; if (!id || d.querySelector('.plv')) return;
      const st = S.heroes[id] || { level: 1 }, ro = (typeof ROLE_INFO !== 'undefined' && ROLE_INFO[heroRole(id)]) || null;
      const b = document.createElement('div'); b.className = 'plv'; b.textContent = 'ур. ' + st.level + (ro ? ' · ' + ro.i : ''); if (ro) b.title = ro.n; d.appendChild(b);
    });
  }
  if (typeof renderLevelInfo === 'function') {
    const _rl = renderLevelInfo;
    renderLevelInfo = function () { _rl(); try { renderPrep(); } catch (e) { console.warn('prep', e); } };
  }
  if (typeof renderArena === 'function') {
    const _ra = renderArena;
    renderArena = function () { const r = _ra.apply(this, arguments); try { decoratePicks(); if (String(arenaLoc).startsWith('f:')) renderPrep(); } catch (e) { console.warn('prep', e); } return r; };
  }

  // ---------- бой: заставка и подсветка героев с малым HP ----------
  let lowObs = null;
  function watchLow() {
    if (lowObs) { lowObs.disconnect(); lowObs = null; }
    const left = document.getElementById('bt-left'); if (!left || !('MutationObserver' in window)) return;
    lowObs = new MutationObserver(ms => ms.forEach(m => {
      const bar = m.target; const u = bar.closest && bar.closest('.unit'); if (!u) return;
      const w = parseFloat(bar.style.width); if (isNaN(w)) return;
      u.classList.toggle('low-hp', w > 0 && w <= 25);
    }));
    left.querySelectorAll('.ubar > div').forEach(b => lowObs.observe(b, { attributes: true, attributeFilter: ['style'] }));
  }
  function intro() {
    const stage = document.getElementById('bt-stage'); if (!stage || typeof BT === 'undefined' || !BT || !BT.def) return;
    const old = stage.querySelector('.bt-intro'); if (old) old.remove();
    const d = BT.def, el = document.createElement('div'); el.className = 'bt-intro';
    const title = d.coop ? 'КООП-БОСС' : d.pvp ? 'PvP' : d.roshan ? 'РОШАН' : d.survival ? 'ВЫЖИВАНИЕ' : 'УРОВЕНЬ ' + (BT.L || '');
    el.innerHTML = '<div class="bi-t">' + esc(title) + '</div><div class="bi-s"><span class="bi-me">' + fmt(stackPower()) + '</span> <small>vs</small> <span class="bi-foe">' + fmt(d.R || 0) + '</span></div>';
    stage.appendChild(el); setTimeout(() => el.remove(), 1900);
  }
  if (typeof startBattle === 'function') {
    const _sb = startBattle;
    startBattle = function () {
      const before = typeof BT !== 'undefined' ? BT : null;
      const r = _sb.apply(this, arguments);
      try { if (typeof BT !== 'undefined' && BT && BT !== before) { watchLow(); intro(); } } catch (e) { console.warn('battle fx', e); }
      return r;
    };
  }
})();
