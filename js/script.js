(() => {
  'use strict';

  const screens = document.querySelectorAll('.mc-screen');
  const mcBg = document.getElementById('mcBg');
  if (!screens.length) return;

  // The selectable rows are plain divs, so a keyboard user could tab through
  // the menu and then hit a dead end on the screen it opened: no way to pick
  // Bedrock and read the port, or to switch language. Wiring role/tabindex
  // here rather than in the markup keeps it honest, since the rows are only
  // controls once this script has run.
  function makeActivatable(el, onActivate){
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', onActivate);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar'){
        e.preventDefault(); // Space would scroll the panel out from under them
        onActivate();
      }
    });
  }

  // Which dictionary to read. Anything we don't ship falls back to Czech,
  // so an unknown <html lang> can't blank the page.
  function currentLang(){
    const lang = document.documentElement.lang;
    return (window.I18N && window.I18N[lang]) ? lang : 'cs';
  }

  // =========================================================
  // Click-to-select rows that reveal a matching detail panel
  // (Multiplayer edition, Team member, Support tier, Novinky tile)
  // =========================================================
  const selection = { mp: 'java', team: 'owner', tier: '1', nov: '1', start: 'first' };

  function applySelection(group){
    document.querySelectorAll(`[data-select="${group}"]`).forEach((row) => {
      const on = row.dataset.key === selection[group];
      row.classList.toggle('is-selected', on);
      row.setAttribute('aria-pressed', String(on)); // colour alone says nothing aloud
    });
    document.querySelectorAll(`[data-detail="${group}"]`).forEach((row) => {
      row.classList.toggle('is-open', row.dataset.key === selection[group]);
    });
  }

  document.querySelectorAll('[data-select]').forEach((row) => {
    makeActivatable(row, () => {
      const group = row.dataset.select;
      selection[group] = row.dataset.key;
      applySelection(group);
    });
  });

  // =========================================================
  // Screen router: click-through Minecraft-client navigation.
  // The URL hash mirrors the active screen so links stay
  // shareable/bookmarkable, but the interaction is pure clicking.
  // =========================================================
  // The tab title follows the open screen, so bookmarks and history entries
  // say which one they point at instead of all reading the same thing.
  let currentScreen = 'title';

  function applyScreenTitle(){
    const lang = currentLang();
    const dict = (window.I18N && window.I18N[lang]) || {};
    const home = dict['meta.title.home'] || 'TapkaCraft';
    const name = currentScreen === 'title' ? null : dict['title.' + currentScreen];
    document.title = name ? `${name} · TapkaCraft` : home;
  }
  window.applyScreenTitle = applyScreenTitle;

  function showScreen(name, opts){
    opts = opts || {};
    const target = document.querySelector(`.mc-screen[data-screen="${name}"]`) ? name : 'title';

    if (typeof window.closePlayerPop === 'function') window.closePlayerPop();
    screens.forEach((s) => s.classList.toggle('is-active', s.dataset.screen === target));
    if (mcBg) mcBg.classList.toggle('dim', target !== 'title');

    currentScreen = target;
    applyScreenTitle();

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
  // Splash text: one line picked at random per visit, like the
  // game's own title screen. The index is fixed for the visit,
  // so switching language re-translates the same line instead
  // of rerolling a new one.
  // =========================================================
  const splashEl = document.querySelector('.hero-splash');
  let splashIndex = 0;

  function splashList(lang){
    const dict = (window.I18N && window.I18N[lang]) || {};
    const list = dict['hero.splashes'];
    return Array.isArray(list) && list.length ? list : null;
  }

  function applySplash(){
    if (!splashEl) return;
    const lang = currentLang();
    const list = splashList(lang) || splashList('cs');
    if (!list) return; // leave the inline fallback text alone
    splashEl.textContent = list[splashIndex % list.length];
  }
  window.applySplash = applySplash;

  if (splashEl){
    const base = splashList('cs');
    if (base) splashIndex = Math.floor(Math.random() * base.length);
    applySplash();
  }

  // =========================================================
  // Novinky: content lives in data/novinky.json so the owner can
  // add an entry on github.com without touching HTML or the
  // dictionaries. Rendered here, in the same tile/detail shape the
  // hand-written version used.
  // =========================================================
  const novTiles = document.getElementById('novTiles');
  const novDetails = document.getElementById('novDetails');
  const novError = document.getElementById('novError');
  let novItems = null;

  function novText(item, lang){
    // Only cs is required. Anything the owner has not translated falls back to
    // it, so a new entry shows up everywhere instead of leaving a blank tile.
    const t = item[lang] || item.cs || {};
    const cs = item.cs || {};
    return { name: t.name || cs.name || '', desc: t.desc || cs.desc || '' };
  }

  function renderNovinky(){
    if (!novTiles || !novDetails || !novItems) return;
    const lang = currentLang();
    const dict = (window.I18N && window.I18N[lang]) || {};
    const kicker = dict['novinky.kicker'] || 'NOVÝ POKROK ODEMČEN';

    novTiles.textContent = '';
    novDetails.textContent = '';

    novItems.forEach((item, i) => {
      const key = String(i + 1);
      const t = novText(item, lang);

      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.select = 'nov';
      tile.dataset.key = key;
      const icn = document.createElement('span');
      icn.className = 'ticn';
      icn.textContent = item.icon || '📜';
      const nm = document.createElement('span');
      nm.className = 'tname';
      nm.textContent = t.name;
      tile.append(icn, nm);
      // textContent throughout: the JSON is content, not markup, so a stray
      // angle bracket in a description stays a character
      makeActivatable(tile, () => { selection.nov = key; applySelection('nov'); });
      novTiles.appendChild(tile);

      const detail = document.createElement('div');
      detail.className = 'detail';
      detail.dataset.detail = 'nov';
      detail.dataset.key = key;
      const k = document.createElement('span');
      k.className = 'kicker';
      k.textContent = kicker;
      detail.appendChild(k);
      if (item.photo){
        const img = document.createElement('img');
        img.className = 'detail-photo';
        img.src = item.photo;
        img.alt = '';
        img.loading = 'lazy';
        detail.appendChild(img);
      }
      const b = document.createElement('b');
      b.textContent = t.name;
      const p = document.createElement('p');
      p.textContent = t.desc;
      detail.append(b, p);
      novDetails.appendChild(detail);
    });

    if (!novItems.some((_, i) => String(i + 1) === selection.nov)) selection.nov = '1';
    applySelection('nov');
  }
  window.renderNovinky = renderNovinky;

  if (novTiles){
    // no-cache so an edit to the JSON reaches visitors on their next load
    // instead of waiting out a cached copy; unchanged files still answer 304
    fetch('data/novinky.json', { cache: 'no-cache' })
      .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
      .then((data) => {
        novItems = Array.isArray(data.novinky) ? data.novinky : [];
        if (novError) novError.hidden = novItems.length > 0;
        renderNovinky();
      })
      .catch(() => { if (novError) novError.hidden = false; });
  }

  // =========================================================
  // Language screen: real switch, highlight follows the
  // active language whenever it changes (including on load).
  // =========================================================
  function markLangRow(){
    const active = currentLang();
    document.querySelectorAll('[data-lang-row]').forEach((row) => {
      const on = row.dataset.langRow === active;
      row.classList.toggle('is-selected', on);
      row.setAttribute('aria-pressed', String(on));
    });
  }
  window.markLangRow = markLangRow;

  document.querySelectorAll('[data-lang-row]').forEach((row) => {
    makeActivatable(row, () => {
      if (typeof window.applyLanguage === 'function') window.applyLanguage(row.dataset.langRow);
    });
  });

  // =========================================================
  // IP / server-address copy: click to clipboard + flash
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
  // Background music. Browsers refuse to start audio until the
  // visitor has interacted with the page, so the first play()
  // is attempted anyway and, when it is rejected, the track is
  // armed to start on the first click, tap or key instead. On a
  // click-through site that lands almost immediately.
  // =========================================================
  const bgm = document.getElementById('bgm');
  const muteBtn = document.getElementById('muteBtn');
  const MUTE_KEY = 'tapkacraft-muted';

  function isMuted(){
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
  }
  function storeMuted(v){
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) {}
  }

  function paintMute(muted){
    if (!muteBtn) return;
    const lang = currentLang();
    const dict = (window.I18N && window.I18N[lang]) || {};
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.setAttribute('aria-label', muted
      ? (dict['music.unmute'] || 'Zapnout hudbu')
      : (dict['music.mute'] || 'Ztlumit hudbu'));
  }
  window.paintMute = paintMute;
  window.isMusicMuted = isMuted;

  function startMusic(){
    if (!bgm || isMuted()) return Promise.reject();
    bgm.volume = 0.25;                       // background, not a performance
    if (bgm.preload === 'none') bgm.preload = 'auto';
    return bgm.play();
  }

  if (bgm && muteBtn){
    paintMute(isMuted());

    if (!isMuted()){
      // fails on a first visit, which is expected and not an error
      startMusic().catch(() => {
        const kick = () => {
          startMusic().catch(() => {});
          ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
            document.removeEventListener(ev, kick));
        };
        ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
          document.addEventListener(ev, kick, { passive: true }));
      });
    }

    muteBtn.addEventListener('click', () => {
      const next = !isMuted();
      storeMuted(next);
      paintMute(next);
      if (next) bgm.pause();
      else startMusic().catch(() => {});
    });
  }

  // =========================================================
  // Who is online: the game shows the names behind the player
  // count when you hover it in the server list, so this does the
  // same. Tap opens it on a phone, where there is no hover.
  // =========================================================
  let popEl = null;
  let popAnchor = null;
  let popByHover = false;   // opened by a hover, so a mouseleave may close it

  function popNode(){
    if (popEl) return popEl;
    popEl = document.createElement('div');
    popEl.className = 'playerpop';
    popEl.setAttribute('role', 'tooltip');
    popEl.id = 'playerPop';
    // on <body>, not inside the panel, or the scrolling screen would clip it
    document.body.appendChild(popEl);
    return popEl;
  }

  function fillPop(){
    const lang = currentLang();
    const dict = (window.I18N && window.I18N[lang]) || {};
    const list = (lastStatus && lastStatus.list) || [];
    const el = popNode();
    el.textContent = '';

    const h = document.createElement('h4');
    h.textContent = dict['players.title'] || 'Právě online';
    el.appendChild(h);

    const ul = document.createElement('ul');
    list.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;   // a player name is text, never markup
      ul.appendChild(li);
    });
    el.appendChild(ul);

    // the ping sample is capped, so say so rather than under-reporting
    const hidden = (lastStatus && lastStatus.players ? lastStatus.players : 0) - list.length;
    if (hidden > 0){
      const p = document.createElement('p');
      p.className = 'more';
      p.textContent = (dict['players.more'] || 'a další: {n}').replace('{n}', hidden);
      el.appendChild(p);
    }
  }

  function placePop(anchor){
    const el = popNode();
    const a = anchor.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    let top = a.bottom + 8;
    if (top + b.height > window.innerHeight - 8) top = a.top - b.height - 8;
    if (top < 8) top = 8;
    let left = a.left + a.width / 2 - b.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - b.width - 8));
    el.style.top = Math.round(top) + 'px';
    el.style.left = Math.round(left) + 'px';
  }

  function openPop(anchor){
    if (!lastStatus || lastStatus === 'error' || !lastStatus.list || !lastStatus.list.length) return;
    fillPop();
    const el = popNode();
    el.classList.add('is-open');
    popAnchor = anchor;
    placePop(anchor);
    anchor.setAttribute('aria-expanded', 'true');
  }

  function closePop(){
    popByHover = false;
    if (!popEl) return;
    popEl.classList.remove('is-open');
    if (popAnchor) popAnchor.setAttribute('aria-expanded', 'false');
    popAnchor = null;
  }
  window.closePlayerPop = closePop;

  function wirePop(el, focusable){
    if (el.dataset.popWired) return;
    el.dataset.popWired = '1';
    popNode(); // so aria-describedby has something to resolve to
    // A mouse fires mouseenter and then click on the same gesture. Without
    // tracking which one opened it, the click read as a second tap and shut
    // the panel the hover had just opened. Hovering previews, clicking pins.
    el.addEventListener('mouseenter', () => { popByHover = true; openPop(el); });
    el.addEventListener('mouseleave', () => { if (popByHover){ popByHover = false; closePop(); } });
    el.addEventListener('click', (e) => {
      // the multiplayer count sits inside a row that selects an edition;
      // opening the list should not also change the selection
      e.stopPropagation();
      if (popAnchor === el && !popByHover){ closePop(); }
      else { popByHover = false; openPop(el); }
    });
    if (focusable){
      el.tabIndex = 0;
      el.setAttribute('aria-describedby', 'playerPop');
      el.addEventListener('focus', () => openPop(el));
      el.addEventListener('blur', closePop);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPop(el); }
      });
    }
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
  document.addEventListener('click', (e) => {
    if (popAnchor && !popAnchor.contains(e.target)) closePop();
  });
  window.addEventListener('resize', () => { if (popAnchor) placePop(popAnchor); });

  // =========================================================
  // Live server status (mcsrvstat.us: free, no key needed)
  // Feeds the title-screen status line and the player counts
  // on the Multiplayer screen's Java/Bedrock rows (one shared
  // player pool). Text is language-aware, re-rendered on every
  // i18n switch from the last fetched result.
  // =========================================================
  let lastStatus = null; // null = loading, 'error', or {online, players, max, list}

  function renderStatus(){
    const pill = document.getElementById('liveStatus');
    const lang = currentLang();
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

    const names = (lastStatus && lastStatus.list) || [];
    const hasList = names.length > 0;

    const playersEls = document.querySelectorAll('[data-players]');
    playersEls.forEach((el) => {
      el.textContent = (lastStatus && lastStatus.online) ? `${lastStatus.players}/${lastStatus.max}` : '· · ·';
      el.classList.toggle('has-list', hasList);
      // Focusable, so the list is reachable without a mouse. Deliberately no
      // role: it describes the count rather than performing an action, which
      // also avoids declaring a second control inside the row, itself already
      // a button that picks an edition.
      if (hasList) wirePop(el, true);
    });

    if (!hasList) closePop();
  }

  async function loadServerStatus(){
    try {
      const res = await fetch('https://api.mcsrvstat.us/3/mc.tapkacraft.cz');
      const data = await res.json();
      if (data.online){
        // players.list only arrives when the server hands out a sample with its
        // ping (or has query enabled). Plenty of servers send none, so the
        // popover is wired up only when there is something to put in it.
        const raw = (data.players && Array.isArray(data.players.list)) ? data.players.list : [];
        lastStatus = {
          online: true,
          players: data.players && data.players.online != null ? data.players.online : 0,
          max: data.players && data.players.max != null ? data.players.max : '?',
          list: raw.map((e) => (typeof e === 'string' ? e : (e && e.name) || '')).filter(Boolean),
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
