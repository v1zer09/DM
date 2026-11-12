// 2.13: визуальная подсветка боевых бонусов стака в PvP (командные ауры, предмет на главном герое, синергии)
(function () {
  if (window.__D2M_PVP_STACK_FX__) return;
  window.__D2M_PVP_STACK_FX__ = true;
  const style = document.createElement('style');
  style.textContent = '#bt-left .unit.pvp-stack-aura{animation:d2mStackAura 1.8s ease-in-out infinite alternate}' +
    '#bt-left .unit.pvp-main-item-aura{outline:2px solid rgba(255,205,92,.75);box-shadow:0 0 16px rgba(255,190,60,.45),inset 0 0 12px rgba(255,190,60,.12)}' +
    '@keyframes d2mStackAura{from{filter:drop-shadow(0 0 1px rgba(100,210,255,.15))}to{filter:drop-shadow(0 0 9px rgba(100,210,255,.65))}}' +
    '@media (prefers-reduced-motion:reduce){#bt-left .unit.pvp-stack-aura{animation:none}}';
  document.head.appendChild(style);
  const orig = window.startBattle;
  if (typeof orig !== 'function') return;
  window.startBattle = function () {
    const before = typeof BT !== 'undefined' ? BT : null;
    const res = orig.apply(this, arguments);
    try {
      if (typeof BT === 'undefined' || !BT || BT === before || !BT.def || !BT.def.pvp) return res;
      const tm = BT.def.team || {};
      const units = document.querySelectorAll('#bt-left .unit');
      const buff = ['atk', 'hp', 'taken', 'aoe', 'stunExtra'].some(k => tm[k] != null && (k === 'stunExtra' ? +tm[k] > 0 : Math.abs(+tm[k] - 1) > 0.001));
      if (buff) units.forEach(u => u.classList.add('pvp-stack-aura'));
      if (units[0] && typeof S !== 'undefined' && S.shop && S.shop.slots && S.shop.slots.length) units[0].classList.add('pvp-main-item-aura');
      const syn = typeof activeSynergies === 'function' ? activeSynergies(BT.team.map(t => t.id)) : [];
      if (syn.length) feed('🧩 Синергии стака активны: ' + syn.map(x => x.name).join(', '));
      if (buff) feed('✨ Командные ауры усиливают весь стак');
    } catch (e) { console.warn('PvP stack FX', e); }
    return res;
  };
})();
