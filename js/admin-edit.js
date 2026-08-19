(() => {
  'use strict';

  const REPO = 'TapkaCS/web';
  const I18N_PATH = 'js/i18n.js';
  const BRANCH = 'main';

  function ensureWidgetLoaded(cb) {
    if (window.netlifyIdentity) { cb(); return; }
    const script = document.createElement('script');
    script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
    script.onload = cb;
    document.head.appendChild(script);
  }

  function createAdminButton() {
    const btn = document.createElement('button');
    btn.id = 'adminLoginBtn';
    btn.textContent = 'Admin';
    btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;padding:10px 16px;'
        + 'border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.6);'
        + 'color:#fff;font-family:sans-serif;font-size:.8rem;cursor:pointer;backdrop-filter:blur(8px);';
    document.body.appendChild(btn);
    return btn;
  }

  function createSaveBar() {
    const bar = document.createElement('div');
    bar.id = 'adminSaveBar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;display:none;'
        + 'align-items:center;justify-content:center;gap:12px;padding:14px;background:#111;'
        + 'border-top:1px solid rgba(255,255,255,.15);color:#fff;font-family:sans-serif;font-size:.85rem;';
    bar.innerHTML =
        '<span>Edit mode - click any text to change it</span>' +
        '<button id="adminSaveBtn" style="padding:8px 16px;border-radius:6px;border:0;background:#57fdf3;color:#07070b;font-weight:600;cursor:pointer;">Save changes</button>' +
        '<button id="adminCancelBtn" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;cursor:pointer;">Cancel</button>' +
        '<button id="adminLogoutBtn" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;cursor:pointer;">Log out</button>' +
        '<span id="adminSaveStatus"></span>';
    document.body.appendChild(bar);
    return bar;
  }

  function enterEditMode() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.setAttribute('contenteditable', 'true');
      el.dataset.originalHtml = el.innerHTML;
      el.style.outline = '1px dashed rgba(87,253,243,.5)';
    });
    document.getElementById('adminSaveBar').style.display = 'flex';
    document.getElementById('adminLoginBtn').style.display = 'none';
  }

  function exitEditMode(revert) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.style.outline = '';
      if (revert && el.dataset.originalHtml !== undefined) {
        el.innerHTML = el.dataset.originalHtml;
      }
    });
    document.getElementById('adminSaveBar').style.display = 'none';
    document.getElementById('adminLoginBtn').style.display = 'block';
    document.getElementById('adminSaveStatus').textContent = '';
  }

  function collectChanges() {
    const changes = {};
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const before = el.dataset.originalHtml;
      const after = el.innerHTML;
      if (before !== after) {
        changes[key] = after;
      }
    });
    return changes;
  }

  function escapeForRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /** Replaces one "key": "value" pair inside a single language block (cs {...} or en {...}) only. */
  function replaceKeyInLangBlock(source, langBlockStart, nextBlockStart, key, newValueHtml) {
    const blockStartIdx = source.indexOf(langBlockStart);
    if (blockStartIdx === -1) throw new Error('Language block not found: ' + langBlockStart);
    const blockEndIdx = nextBlockStart ? source.indexOf(nextBlockStart, blockStartIdx) : source.length;
    const endIdx = blockEndIdx === -1 ? source.length : blockEndIdx;

    const before = source.slice(0, blockStartIdx);
    const block = source.slice(blockStartIdx, endIdx);
    const after = source.slice(endIdx);

    const keyRegex = new RegExp('("' + escapeForRegex(key) + '":\\s*")((?:[^"\\\\]|\\\\.)*)(")');
    if (!keyRegex.test(block)) {
      throw new Error('Key "' + key + '" not found in this language block');
    }
    const newBlock = block.replace(keyRegex, '$1' + escapeJsString(newValueHtml) + '$3');
    return before + newBlock + after;
  }

  async function gitGatewayRequest(user, method, path, body) {
    const token = await user.jwt();
    const res = await fetch('/.netlify/git/github/repos/' + REPO + path, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('GitHub API ' + res.status + ': ' + text.slice(0, 200));
    }
    return res.json();
  }

  function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }

  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function saveChanges(identity) {
    const changes = collectChanges();
    const statusEl = document.getElementById('adminSaveStatus');
    if (Object.keys(changes).length === 0) {
      statusEl.textContent = 'No changes.';
      exitEditMode(false);
      return;
    }
    const lang = document.documentElement.lang === 'en' ? 'en' : 'cs';
    statusEl.textContent = 'Saving...';
    try {
      const user = identity.currentUser();
      const file = await gitGatewayRequest(user, 'GET', '/contents/' + I18N_PATH + '?ref=' + BRANCH);
      let source = base64ToUtf8(file.content);

      for (const [key, value] of Object.entries(changes)) {
        source = lang === 'cs'
            ? replaceKeyInLangBlock(source, '  cs: {', '\n  en: {', key, value)
            : replaceKeyInLangBlock(source, '  en: {', null, key, value);
      }

      await gitGatewayRequest(user, 'PUT', '/contents/' + I18N_PATH, {
        message: 'Content edit via admin panel (' + lang + ')',
        content: utf8ToBase64(source),
        sha: file.sha,
        branch: BRANCH,
      });

      statusEl.textContent = 'Saved! Live site updates in about a minute.';
      exitEditMode(false);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }

  ensureWidgetLoaded(() => {
    const identity = window.netlifyIdentity;
    const adminBtn = createAdminButton();
    createSaveBar();

    adminBtn.addEventListener('click', () => {
      if (identity.currentUser()) {
        enterEditMode();
      } else {
        identity.open();
      }
    });

    document.getElementById('adminSaveBtn').addEventListener('click', () => saveChanges(identity));
    document.getElementById('adminCancelBtn').addEventListener('click', () => exitEditMode(true));
    document.getElementById('adminLogoutBtn').addEventListener('click', () => identity.logout());

    identity.on('login', () => {
      identity.close();
      enterEditMode();
    });
    identity.on('logout', () => exitEditMode(true));

    identity.init();
  });
})();
