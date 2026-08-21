(() => {
  'use strict';

  // =========================================================
  // Screen router — click-through Minecraft-client navigation.
  // Screens are toggled by class; the URL hash just mirrors the
  // active screen so links stay shareable/bookmarkable.
  // =========================================================
  const screens = document.querySelectorAll('.mc-screen');

  function showScreen(name, opts){
    opts = opts || {};
    if (!screens.length) return;
    const target = document.querySelector(`.mc-screen[data-screen="${name}"]`) ? name : 'title';

    screens.forEach((s) => s.classList.toggle('is-active', s.dataset.screen === target));

    const inner = document.querySelector(`.mc-screen[data-screen="${target}"] .mc-screen-inner`);
    if (inner) inner.scrollTop = 0;

    if (opts.push !== false){
      const url = target === 'title' ? location.pathname + location.search : `#${target}`;
      history.replaceState(null, '', url);
    }
  }
  window.showScreen = showScreen;

  if (screens.length){
    document.querySelectorAll('[data-goto]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen(el.dataset.goto);
      });
    });

    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => showScreen('title'));
    });

    window.addEventListener('hashchange', () => {
      showScreen(location.hash.slice(1) || 'title', { push:false });
    });

    showScreen(location.hash.slice(1) || 'title', { push:false });
  }

  // =========================================================
  // Language toggle (🌐 button, MC-style — CZ/EN only)
  // =========================================================
  document.querySelectorAll('.lang-toggle-mc').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof window.applyLanguage !== 'function') return;
      const next = document.documentElement.lang === 'en' ? 'cs' : 'en';
      window.applyLanguage(next);
    });
  });

  // =========================================================
  // IP / server-address copy — click to clipboard + flash
  // =========================================================
  async function copyText(text){
    if (navigator.clipboard && window.isSecureContext){
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) { /* fall through to legacy method */ }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (err) {
      return false;
    }
  }

  document.querySelectorAll('.addr[data-ip], .ip-box').forEach((box) => {
    box.addEventListener('click', async () => {
      const ip = box.dataset.ip || 'mc.tapkacraft.cz';
      const ok = await copyText(ip);
      if (!ok) return;

      box.classList.remove('copied');
      void box.offsetWidth; // restart any transition
      box.classList.add('copied');

      clearTimeout(box._copyTimeout);
      box._copyTimeout = setTimeout(() => box.classList.remove('copied'), 2200);
    });
  });

  // =========================================================
  // Live server status (mcsrvstat.us — free, no key needed)
  // Text is language-aware: re-rendered on every i18n switch from
  // the last fetched result, no extra network round-trip needed.
  // =========================================================
  let lastStatus = null; // null = loading, 'error', or {online, players, max}

  function renderStatus(){
    const pill = document.getElementById('liveStatus');
    if (!pill) return;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'cs';
    const dict = (window.I18N && window.I18N[lang] && window.I18N[lang]) || {};
    const t = {
      loading: dict['status.loading'] || 'Zjišťuji stav serveru…',
      online: dict['status.online'] || 'Server online · {online}/{max} hráčů',
      offline: dict['status.offline'] || 'Server offline',
      error: dict['status.error'] || 'Stav serveru nelze zjistit',
    };

    if (lastStatus === null){
      pill.innerHTML = '<span class="dot"></span>' + t.loading;
    } else if (lastStatus === 'error'){
      pill.innerHTML = '<span class="dot off"></span>' + t.error;
    } else if (lastStatus.online){
      const txt = t.online.replace('{online}', lastStatus.players).replace('{max}', lastStatus.max);
      pill.innerHTML = '<span class="dot"></span>' + txt;
    } else {
      pill.innerHTML = '<span class="dot off"></span>' + t.offline;
    }
  }

  async function loadServerStatus(){
    if (!document.getElementById('liveStatus')) return;
    try {
      const res = await fetch('https://api.mcsrvstat.us/3/mc.tapkacraft.cz');
      const data = await res.json();
      if (data.online){
        lastStatus = {
          online: true,
          players: data.players && data.players.online != null ? data.players.online : 0,
          max: data.players && data.players.max != null ? data.players.max : '?',
        };
      } else {
        lastStatus = { online: false };
      }
    } catch (err) {
      lastStatus = 'error';
    }
    renderStatus();
  }

  window.renderStatus = renderStatus;
  loadServerStatus();
  setInterval(loadServerStatus, 60000);

})();
