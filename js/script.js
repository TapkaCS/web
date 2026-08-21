(() => {
  'use strict';

  const screens = document.querySelectorAll('.mc-screen');
  const mcBg = document.getElementById('mcBg');
  if (!screens.length) return;

  // =========================================================
  // Click-to-select rows that reveal a matching detail panel
  // (Multiplayer edition, Team member, Support tier, Novinky tile)
  // =========================================================
  const selection = { mp: 'java', team: 'owner', tier: '1', nov: '1' };

  function applySelection(group){
    document.querySelectorAll(`[data-select="${group}"]`).forEach((row) => {
      row.classList.toggle('is-selected', row.dataset.key === selection[group]);
    });
    document.querySelectorAll(`[data-detail="${group}"]`).forEach((row) => {
      row.classList.toggle('is-open', row.dataset.key === selection[group]);
    });
  }

  document.querySelectorAll('[data-select]').forEach((row) => {
    row.addEventListener('click', () => {
      const group = row.dataset.select;
      selection[group] = row.dataset.key;
      applySelection(group);
    });
  });

  // =========================================================
  // Screen router — click-through Minecraft-client navigation.
  // The URL hash mirrors the active screen so links stay
  // shareable/bookmarkable, but the interaction is pure clicking.
  // =========================================================
  function showScreen(name, opts){
    opts = opts || {};
    const target = document.querySelector(`.mc-screen[data-screen="${name}"]`) ? name : 'title';

    screens.forEach((s) => s.classList.toggle('is-active', s.dataset.screen === target));
    if (mcBg) mcBg.classList.toggle('dim', target !== 'title');

    const panel = document.querySelector(`.mc-screen[data-screen="${target}"] .mp-panel`);
    if (panel) panel.scrollTop = 0;

    if (opts.push !== false){
      const url = target === 'title' ? location.pathname + location.search : `#${target}`;
      history.replaceState(null, '', url);
    }
  }
  window.showScreen = showScreen;

  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => showScreen(el.dataset.goto));
  });
  document.querySelectorAll('[data-back]').forEach((el) => {
    el.addEventListener('click', () => showScreen('title'));
  });
  window.addEventListener('hashchange', () => {
    showScreen(location.hash.slice(1) || 'title', { push:false });
  });
  showScreen(location.hash.slice(1) || 'title', { push:false });

  // =========================================================
  // Language screen — real switch, highlight follows the
  // active language whenever it changes (including on load).
  // =========================================================
  function markLangRow(){
    const active = document.documentElement.lang === 'en' ? 'en' : 'cs';
    document.querySelectorAll('[data-lang-row]').forEach((row) => {
      row.classList.toggle('is-selected', row.dataset.langRow === active);
    });
  }
  window.markLangRow = markLangRow;

  document.querySelectorAll('[data-lang-row]').forEach((row) => {
    row.addEventListener('click', () => {
      if (typeof window.applyLanguage === 'function') window.applyLanguage(row.dataset.langRow);
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

  document.querySelectorAll('.addr[data-ip]').forEach((box) => {
    box.addEventListener('click', async () => {
      const ok = await copyText(box.dataset.ip);
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
  // Feeds the title-screen status line and the player counts
  // on the Multiplayer screen's Java/Bedrock rows (one shared
  // player pool). Text is language-aware, re-rendered on every
  // i18n switch from the last fetched result.
  // =========================================================
  let lastStatus = null; // null = loading, 'error', or {online, players, max}

  function renderStatus(){
    const pill = document.getElementById('liveStatus');
    const lang = document.documentElement.lang === 'en' ? 'en' : 'cs';
    const dict = (window.I18N && window.I18N[lang]) || {};
    const t = {
      loading: dict['status.loading'] || 'Zjišťuji stav serveru…',
      online: dict['status.online'] || 'Online · {online}/{max} hráčů',
      offline: dict['status.offline'] || 'Server offline',
      error: dict['status.error'] || 'Stav serveru nelze zjistit',
    };

    if (pill){
      if (lastStatus === null){
        pill.innerHTML = '<span class="dot"></span>' + t.loading;
      } else if (lastStatus === 'error'){
        pill.innerHTML = '<span class="dot off"></span>' + t.error;
      } else if (lastStatus.online){
        pill.innerHTML = '<span class="dot"></span>' + t.online.replace('{online}', lastStatus.players).replace('{max}', lastStatus.max);
      } else {
        pill.innerHTML = '<span class="dot off"></span>' + t.offline;
      }
    }

    const playersEls = document.querySelectorAll('[data-players]');
    playersEls.forEach((el) => {
      el.textContent = (lastStatus && lastStatus.online) ? `${lastStatus.players}/${lastStatus.max}` : '· · ·';
    });
  }

  async function loadServerStatus(){
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
