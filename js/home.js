// ================= ЕДИНЫЙ АДРЕС ИГРЫ (2.13.2) =================
// Игра открывается только по MAIN_URL. Старый адрес (GitHub Pages) лишь отправляет на него:
//  · в браузере нет аккаунтов — сразу переходим (метка ?ref и #вкладка сохраняются);
//  · аккаунты есть — остаёмся: сохранения в браузере у каждого адреса свои, поэтому показываем плашку, как перенести прогресс.
// Подключается в <head>, чтобы переход случался до отрисовки страницы.
const MAIN_URL = 'https://dm-rouge.vercel.app/';
const OLD_HOSTS = ['v1zer09.github.io'];
// что делать на этом адресе: 'stay' | 'redirect' | 'notice' (чистая функция — её проверяет tools/tests.js)
function addressPlan(host, search, hasAccounts) {
  if (!OLD_HOSTS.includes(host) || /[?&]sim=1/.test(search || '')) return 'stay';
  return hasAccounts ? 'notice' : 'redirect';
}
// адрес для приглашений и карточки «Поделиться»: со старого адреса даём основной
function siteUrl() { return OLD_HOSTS.includes(location.hostname) ? MAIN_URL : location.origin + location.pathname.replace(/[^/]*$/, ''); }
function goMain() { try { if (typeof save === 'function') save(); } catch (e) { } location.href = MAIN_URL + location.hash; }
function hideMoveBar() { const b = document.getElementById('move-bar'); if (b) b.remove(); try { sessionStorage.setItem('d2m_move_hide', '1'); } catch (e) { } }
function openMoveInfo() {
  const logged = typeof USER !== 'undefined' && USER, online = logged && typeof cloud === 'function' && cloud();
  const how = online ? 'У этого аккаунта включён онлайн. Нажми «Сохранить в облако», затем открой новый адрес и войди тем же ником и паролем — прогресс загрузится сам.'
    : logged ? 'У этого аккаунта онлайн не подключён. Нажми «Перенос прогресса» и скопируй код или скачай файл. На новом адресе зарегистрируйся, открой Профиль → Аккаунт → «Перенос прогресса» и нажми «Импорт».'
      : 'Сначала войди здесь в свой аккаунт — после входа эта подсказка покажет нужные кнопки. Если онлайн у аккаунта был включён (пароль от 6 символов), можно сразу открыть новый адрес и войти тем же ником и паролем.';
  const btns = [];
  if (online) btns.push({ t: '☁ Сохранить в облако', c: 'gold', f: () => { manualCloudSave(); } });
  if (logged) btns.push({ t: '💾 Перенос прогресса', c: online ? '' : 'gold', f: openTransfer });
  btns.push({ t: 'Открыть новый адрес', c: 'green', f: goMain }, { t: 'Закрыть', c: 'ghost', f: closeModal });
  showModal('🏠', 'Игра переехала', '<div style="text-align:left;font-size:.9rem"><p>Игра теперь открывается только по адресу <b style="white-space:nowrap">dm-rouge.vercel.app</b>. Сохранения лежат в браузере отдельно для каждого адреса, поэтому прогресс с этого адреса нужно перенести один раз.</p><p style="margin-top:8px">' + how + '</p></div>', '', { html: true, buttons: btns });
}
(function oneAddress() {
  let has = false;
  try { has = Object.keys(JSON.parse(localStorage.getItem('d2m_accounts') || '{}') || {}).length > 0; } catch (e) { }
  const plan = addressPlan(location.hostname, location.search, has);
  if (plan === 'redirect') {
    // прячем страницу на время перехода; если перейти не вышло (нет сети) — показываем её снова
    document.documentElement.style.visibility = 'hidden';
    setTimeout(() => { document.documentElement.style.visibility = ''; }, 4000);
    location.replace(MAIN_URL + location.search + location.hash);
    return;
  }
  if (plan !== 'notice') return;
  document.addEventListener('DOMContentLoaded', () => {
    try { if (sessionStorage.getItem('d2m_move_hide')) return; } catch (e) { }
    const b = document.createElement('div'); b.id = 'move-bar'; b.setAttribute('role', 'status');
    b.innerHTML = '<span>🏠 Игра переехала на <b>dm-rouge.vercel.app</b></span><button class="btn sm green" data-click="openMoveInfo()">Как перенести прогресс</button><button class="btn sm ghost" data-click="hideMoveBar()" aria-label="Скрыть">✕</button>';
    document.body.appendChild(b);
  });
})();
