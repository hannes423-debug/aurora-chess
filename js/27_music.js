/* ============================================================================
   27_music.js — background music.

   Deliberately an <audio> element rather than the Web Audio graph in
   01_audio.js: that engine synthesises every effect and holds no buffers, while
   this is a 6 MB file that should stream and loop. Decoding it into an
   AudioBuffer for gapless looping would cost well over 100 MB of PCM held
   resident, which is not a trade worth making for a background track.

   Ported from js/26_music.js in Flag Raid, which shares this codebase's
   ancestry — same settings-panel wiring, same autoplay handling.

   Track: "Aurora — Ambient Chill" by Julius H., from Pixabay.
   Credited in the help overlay under MUSIC.
   ========================================================================= */
(function () {
  'use strict';

  var SRC      = 'assets/audio/aurora-ambient.mp3';
  var K_ON     = 'ac_music_on';
  var K_VOL    = 'ac_music_vol';
  var DEF_VOL  = 0.35;          // under the effects, which sit at SND.vol 0.6
  var FADE_MS  = 700;

  function readPref(key, dflt) {
    try { var v = localStorage.getItem(key); return v === null ? dflt : v; }
    catch (e) { return dflt; }
  }
  function writePref(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }

  var MUSIC = {
    on:  readPref(K_ON, '1') === '1',
    vol: Math.max(0, Math.min(1, parseFloat(readPref(K_VOL, String(DEF_VOL))) || DEF_VOL)),
    el: null,
    started: false,
    blocked: false
  };
  window.AuroraMusic = MUSIC;

  /* The exported standalone replay inlines every <script src> but no other
     asset (js/23_replay_export.js), so the mp3 would 404 there — and a replay
     viewer scoring itself with the menu theme is wrong anyway. */
  function isReplayViewer() {
    return !!(window.AURORA_REPLAY || window.CTFReplayStandalone || window.FLAG_RAID_REPLAY);
  }

  function el() {
    if (MUSIC.el) return MUSIC.el;
    var a = document.createElement('audio');
    a.id = 'acMusic';
    a.loop = true;
    a.preload = 'none';        // nothing is fetched until music is actually on
    a.volume = 0;              // faded up by play(), so it never starts abruptly
    a.src = SRC;
    document.body.appendChild(a);
    MUSIC.el = a;
    return a;
  }

  var fadeTimer = null;
  function fadeTo(target, done) {
    var a = el();
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    var from = a.volume, t0 = Date.now();
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / FADE_MS);
      a.volume = Math.max(0, Math.min(1, from + (target - from) * k));
      if (k >= 1) {
        clearInterval(fadeTimer); fadeTimer = null;
        if (done) done();
      }
    }, 40);
  }

  /* Autoplay is blocked until the page has seen a real user gesture, and the
     rejection is asynchronous — so a failed start arms a one-shot retry on the
     next input rather than giving up. The menu is full of clicks, so in
     practice the music begins the moment the player touches anything. */
  var armed = false;
  function armGesture() {
    if (armed) return;
    armed = true;
    var events = ['pointerdown', 'mousedown', 'touchstart', 'keydown'];
    var fire = function () {
      events.forEach(function (t) { window.removeEventListener(t, fire, true); });
      armed = false;
      if (MUSIC.on) start();
    };
    events.forEach(function (t) { window.addEventListener(t, fire, true); });
  }

  function start() {
    if (!MUSIC.on || isReplayViewer()) return;
    var a = el();
    var p = a.play();
    if (p && p.catch) {
      p.then(function () {
        MUSIC.started = true; MUSIC.blocked = false;
        fadeTo(MUSIC.vol);
      }).catch(function () {
        MUSIC.blocked = true;
        armGesture();
      });
    } else {
      MUSIC.started = true;
      fadeTo(MUSIC.vol);
    }
  }

  function stop() {
    if (!MUSIC.el) return;
    fadeTo(0, function () { if (MUSIC.el) MUSIC.el.pause(); });
  }

  MUSIC.setOn = function (on) {
    MUSIC.on = !!on;
    writePref(K_ON, MUSIC.on ? '1' : '0');
    if (MUSIC.on) start(); else stop();
    syncUI();
  };
  MUSIC.setVol = function (v) {
    MUSIC.vol = Math.max(0, Math.min(1, v));
    writePref(K_VOL, String(MUSIC.vol));
    if (!MUSIC.el || !MUSIC.on) return;
    /* A fade in flight owns element.volume and would overwrite a direct write
       on its next tick — so retarget the fade instead of dropping the change.
       Without this, dragging the slider inside the 700 ms after the music
       starts left the track stuck at the OLD volume until the next toggle. */
    if (fadeTimer) fadeTo(MUSIC.vol);
    else MUSIC.el.volume = MUSIC.vol;
  };

  /* Don't keep playing to an empty room. */
  document.addEventListener('visibilitychange', function () {
    if (!MUSIC.on || !MUSIC.started) return;
    if (document.hidden) { if (MUSIC.el) MUSIC.el.pause(); }
    else { var p = el().play(); if (p && p.catch) p.catch(function () {}); }
  });

  /* ── Settings wiring ──────────────────────────────────────────────────────
     The rows live in the Sound section of the Basic tab, next to the existing
     Sound Effects toggle and master volume. syncUI runs on every settings open
     because applyPreset/restoreDefaults rebuild parts of that panel. */
  function syncUI() {
    var t = document.getElementById('bMusicOn');
    if (t && t.checked !== MUSIC.on) t.checked = MUSIC.on;
    var s = document.getElementById('bMusicVol');
    if (s) {
      var want = String(Math.round(MUSIC.vol * 100));
      if (s.value !== want) s.value = want;
    }
  }
  MUSIC.syncUI = syncUI;

  function wire() {
    var t = document.getElementById('bMusicOn');
    if (t && !t._acWired) {
      t._acWired = true;
      t.addEventListener('change', function (e) {
        if (typeof SND !== 'undefined' && SND.ui) SND.ui();
        MUSIC.setOn(e.target.checked);
      });
    }
    var s = document.getElementById('bMusicVol');
    if (s && !s._acWired) {
      s._acWired = true;
      s.addEventListener('input', function (e) {
        MUSIC.setVol(parseInt(e.target.value, 10) / 100);
      });
    }
    syncUI();
  }

  function init() {
    if (isReplayViewer()) return;
    wire();
    // Re-wire whenever settings opens: the panel is rebuilt by several paths.
    var so = document.getElementById('settingsOverlay');
    if (so) new MutationObserver(wire).observe(so, { attributes: true, attributeFilter: ['style'] });
    if (MUSIC.on) start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
