(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.getElementById('siteHeader');
  const navCtas = document.getElementById('navCtas');

  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  // =========================================================
  // Scroll-driven effects (header, hero logo, hearts, nav CTAs)
  // =========================================================
  let ticking = false;

  function updateScroll(){
    const y = window.scrollY || window.pageYOffset;

    header.classList.toggle('is-scrolled', y > 20);

    // logo + subheading: rise and fade out
    const heroP = clamp01(y / 260);
    root.style.setProperty('--hero-opacity', (1 - heroP).toFixed(3));
    root.style.setProperty('--hero-shift', (-heroP * 50).toFixed(1) + 'px');

    // header CTA buttons: sink and vanish faster than the rest of the header
    const ctaP = clamp01(y / 130);
    root.style.setProperty('--nav-cta-opacity', (1 - ctaP).toFixed(3));
    root.style.setProperty('--nav-cta-shift', (ctaP * 26).toFixed(1) + 'px');
    if (navCtas) navCtas.classList.toggle('is-hidden', ctaP >= 1);

    // floating hearts: rise faster than the page, blur and fade out
    const heartP = clamp01(y / 420);
    root.style.setProperty('--hearts-lift', (-heartP * 260).toFixed(1) + 'px');
    root.style.setProperty('--heart-opacity', (1 - heartP).toFixed(3));
    root.style.setProperty('--heart-blur', (heartP * 9).toFixed(1) + 'px');

    ticking = false;
  }

  function onScroll(){
    if (!ticking){
      requestAnimationFrame(updateScroll);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  updateScroll();

  // =========================================================
  // Scroll reveal for glass cards / text blocks
  // =========================================================
  const revealEls = document.querySelectorAll('.reveal, .glass-card');

  if ('IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting){
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold:.15, rootMargin:'0px 0px -40px 0px' });

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  // =========================================================
  // IP copy boxes: click -> clipboard + flash + tooltip
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

  document.querySelectorAll('.ip-box').forEach((box) => {
    box.addEventListener('click', async () => {
      const ip = box.dataset.ip || 'mc.tapkacraft.cz';
      const ok = await copyText(ip);
      if (!ok) return;

      box.classList.remove('flash');
      void box.offsetWidth; // restart the flash animation
      box.classList.add('flash', 'copied');

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
