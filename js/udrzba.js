/* =========================================================
   TapkaCraft: maintenance countdown
   Standalone. i18n.js supplies the copy, this only supplies
   the numbers and the language row.
   ========================================================= */
(function(){
  'use strict';

  // Prague time, spelled with its offset so the page counts to the same
  // moment for a visitor in any timezone. January is CET, so +01:00.
  var TARGET = new Date('2027-01-01T00:00:00+01:00').getTime();

  var root = document.getElementById('maint');
  var elD  = document.getElementById('cdD');
  var elH  = document.getElementById('cdH');
  var elM  = document.getElementById('cdM');
  var elS  = document.getElementById('cdS');

  function pad(n){ return n < 10 ? '0' + n : String(n); }

  function tick(){
    var left = TARGET - Date.now();

    if (left <= 0){
      root.setAttribute('data-state', 'live');
      elD.textContent = elH.textContent = elM.textContent = elS.textContent = '00';
      return; // no reschedule: nothing left to count
    }

    var s = Math.floor(left / 1000);
    elD.textContent = pad(Math.floor(s / 86400));
    elH.textContent = pad(Math.floor(s / 3600) % 24);
    elM.textContent = pad(Math.floor(s / 60) % 60);
    elS.textContent = pad(s % 60);

    // Recomputed from the clock every tick and aimed just past the next whole
    // second, so a backgrounded tab that throttles timers catches straight up
    // instead of drifting further behind with every missed interval.
    setTimeout(tick, 1000 - (Date.now() % 1000) + 20);
  }

  if (root && elD && elH && elM && elS) tick();

  /* ===== language row =====
     Reuses applyLanguage from i18n.js, so the choice is stored under the same
     key as the main site and carries across when the visitor goes back. */
  var langRow = document.getElementById('maintLangs');

  function markLangRow(){
    if (!langRow) return;
    var current = document.documentElement.lang;
    langRow.querySelectorAll('button').forEach(function(b){
      b.setAttribute('aria-current', b.getAttribute('data-lang') === current ? 'true' : 'false');
    });
  }
  // applyLanguage calls this after every pass, the same way the main site's
  // language screen keeps its own list highlighted
  window.markLangRow = markLangRow;

  if (langRow){
    langRow.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-lang]');
      if (btn && typeof window.applyLanguage === 'function') window.applyLanguage(btn.getAttribute('data-lang'));
    });
  }

  markLangRow();
})();
