/* ================================================================
   DEMO BUILD: STANDARD 3D CHESS + PUZZLES ONLY
   For the demo event, Arcade and Capture-the-Flag are hidden from
   every entry point and switched off at every match start. Nothing
   is deleted: set AURORA_DEMO_MODES = false (or drop this script tag)
   and both modes come back exactly as they were.
================================================================ */
var AURORA_DEMO_MODES = true;

(function() {
  if (!AURORA_DEMO_MODES) return;

  // ── 1. Hide every control that picks Arcade or CTF ─────────────
  var css = document.createElement('style');
  css.id = 'auroraDemoModes';
  css.textContent = [
    '#gmArcadeBtn, #gmCTFBtn,',                 // Game Modes cards
    '#ps1Arcade, #ps1CTF,',                     // Play step 1
    '#openArcadeBtn, #arcadeMenu, #ctfMenu,',   // legacy + their sub-menus
    '#ps3ArcadeSection,',                       // arcade settings in step 3
    '#tutTab_arcade, #tutTab_ctf,',             // tutorial section tabs
    '[data-lobbymode="arcade"], [data-lobbymode="flag"],',
    '[data-ratmode="arcade"], [data-ratmode="ctf"], [data-ratmode="flag"]',
    '{ display: none !important; }'
  ].join('\n');
  document.head.appendChild(css);
  // Those two cards sit in their own wrapper divs; hide the wrappers so
  // the menu does not keep two empty 8px gaps.
  ['gmArcadeBtn', 'gmCTFBtn'].forEach(function(id) {
    var b = document.getElementById(id);
    if (b && b.parentElement) b.parentElement.style.display = 'none';
  });
  // "Arcade Auras" display setting: meaningless without the mode.
  document.querySelectorAll('.settingRow').forEach(function(row) {
    var l = row.querySelector('label');
    if (l && /arcade/i.test(l.textContent)) row.style.display = 'none';
  });

  // ── 2. Tutorial: drop the Arcade and Flag lessons ──────────────
  // NEXT walks the whole TUTS list, so hiding the tabs alone would still
  // lead into them. They are the last six entries, so removing them leaves
  // every earlier index (and the 't'+index solved keys) unchanged.
  if (typeof TUTS !== 'undefined') {
    for (var i = TUTS.length - 1; i >= 0; i--) {
      if (TUTS[i].section === 'arcade' || TUTS[i].section === 'ctf') TUTS.splice(i, 1);
    }
  }
  if (typeof TUT_SECTIONS !== 'undefined') {
    for (var j = TUT_SECTIONS.length - 1; j >= 0; j--) {
      if (TUT_SECTIONS[j].id === 'arcade' || TUT_SECTIONS[j].id === 'ctf') TUT_SECTIONS.splice(j, 1);
    }
  }

  // ── 3. Online: never offer or accept a non-standard mode ───────
  // The invite dialog builds its <select> on the fly; iOS Safari ignores
  // display:none on <option>, so the options are removed instead.
  new MutationObserver(function() {
    var sel = document.getElementById('_invMode');
    if (!sel) return;
    Array.prototype.slice.call(sel.options).forEach(function(o) {
      if (o.value !== 'standard') o.remove();
    });
  }).observe(document.body, { childList: true, subtree: true });
  if (typeof onlineLobbySetMode === 'function') {
    var _setMode = onlineLobbySetMode;
    onlineLobbySetMode = function(mode) { _setMode.call(this, 'standard'); };
  }

  // ── 4. Belt and braces: every local match starts as standard ───
  if (typeof startLocalGame === 'function') {
    var _start = startLocalGame;
    startLocalGame = function() {
      if (typeof _playMode !== 'undefined') _playMode = 'standard';
      if (typeof arcadeSettings !== 'undefined') arcadeSettings.enabled = false;
      if (typeof ctfMode !== 'undefined') ctfMode = false;
      return _start.apply(this, arguments);
    };
  }
})();
