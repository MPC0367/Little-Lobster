/* =============================================================================
   Little Lobster — behaviour. No dependencies.
   Global (once): the curtain, language, loader, header, mobile panel, lightbox,
   dish pop, keyboard. Per page (LL.boot): reveals, hero image, route drawing,
   marquee, menu rail + spotlight, copy buttons, map, open-now.
   The single-file artifact swaps <main> and calls LL.boot(main) again.
   ========================================================================== */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, win = window;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); };
  var reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = function () { return root.classList.contains('has-motion') && !reduce.matches; };
  var fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  if (/[?&]touch=1/.test(location.search)) fine = { matches: false, addEventListener: function () {} };   /* QA hook: behave as a touch device */
  var LL = win.LL = win.LL || {};
  var DATA = win.LL_DATA || {};
  var IMG = win.LL_IMG || null;                     /* artifact: slug -> data URI */

  /* resolve an image reference: a path on the site, a key in the artifact map */
  function src(v) { if (!v) return ''; if (IMG && IMG[v]) return IMG[v]; return v; }
  LL.src = src;

  /* ======================================================== 1. LANGUAGE ==
     Thai is served; English lives on data-en. On first run every node's Thai
     is stored on data-th so the swap is reversible. Attributes follow the same
     rule with data-en-alt / data-en-aria-label / data-en-title / data-en-placeholder. */
  var ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];
  function readLang() {
    var m = location.search.match(/[?&]lang=(en|th)/);
    if (m) return m[1];
    try { var s = localStorage.getItem('ll:lang'); if (s === 'en' || s === 'th') return s; } catch (e) {}
    return 'th';
  }
  function setLang(lang, persist, scope) {
    var en = lang === 'en';
    $$('[data-en]', scope).forEach(function (el) {
      /* <title> and <meta> are swapped below by text/content — innerHTML would
         re-escape their entities, so "Cafe &amp; Bistro" becomes "&amp;amp;". */
      if (el.tagName === 'TITLE' || el.tagName === 'META') return;
      if (!el.hasAttribute('data-th')) el.setAttribute('data-th', el.innerHTML);
      var next = en ? el.getAttribute('data-en') : el.getAttribute('data-th');
      if (el.innerHTML !== next) el.innerHTML = next;
    });
    ATTRS.forEach(function (a) {
      $$('[data-en-' + a + ']', scope).forEach(function (el) {
        var k = 'data-th-' + a;
        if (!el.hasAttribute(k)) el.setAttribute(k, el.getAttribute(a) || '');
        el.setAttribute(a, en ? el.getAttribute('data-en-' + a) : el.getAttribute(k));
      });
    });
    if (!scope) {
      root.lang = lang;
      var t = $('title[data-en]');
      if (t) {
        if (!t.hasAttribute('data-th')) t.setAttribute('data-th', t.textContent);
        doc.title = en ? t.getAttribute('data-en') : t.getAttribute('data-th');
      }
      $$('meta[name="description"][data-en]').forEach(function (m) {
        if (!m.hasAttribute('data-th')) m.setAttribute('data-th', m.content);
        m.content = en ? m.getAttribute('data-en') : m.getAttribute('data-th');
      });
      if (persist) { try { localStorage.setItem('ll:lang', lang); } catch (e) {} }
    }
  }
  LL.lang = { get: function () { return root.lang === 'en' ? 'en' : 'th'; }, set: setLang };
  setLang(readLang(), false);

  /* ========================================================= 1b. CURTAIN ==
     One transition for every moment the whole screen is replaced — the
     language switch and every page change. It is the restaurant's own round
     sign, the same disc as the loader, carried up across a plaster ground.
     Timings below are paired with the CSS: in 380ms, hold 110ms, out 420ms. */
  var curtain = $('[data-curtain]'), busy = false;
  var C_IN = 380, C_HOLD = 110, C_OUT = 420;

  function curtainState(v) { if (curtain) curtain.setAttribute('data-state', v); }

  /* Cover the screen, run `swap` while nothing can be seen, then leave.
     Without motion (or without the element) the swap simply happens. */
  function curtainRun(swap, after) {
    if (busy) return false;
    if (!curtain || !motion()) { swap(); if (after) after(); return true; }
    busy = true;
    curtainState('in');
    setTimeout(function () {
      swap();
      setTimeout(function () {
        curtainState('out');
        setTimeout(function () { curtainState(''); busy = false; if (after) after(); }, C_OUT + 20);
      }, C_HOLD);
    }, C_IN + 20);
    return true;
  }

  /* Cover the screen and hand over to `go` — used when the page itself is
     about to be replaced, so the curtain is still up as the browser navigates. */
  function curtainLeave(go) {
    if (busy) return;
    if (!curtain || !motion()) { go(); return; }
    busy = true;
    curtainState('in');
    var fired = false;
    var fire = function () { if (fired) return; fired = true; go(); };
    setTimeout(fire, C_IN + 20);
    setTimeout(fire, 1200);                 /* failsafe: never trap anyone behind it */
  }

  /* Arriving on a page that raised the curtain: start covered, then lift.
     The transition is suppressed for one frame so it does not slide up first. */
  (function curtainArrive() {
    if (!curtain) return;
    var flag = false;
    try { flag = sessionStorage.getItem('ll:curtain') === '1'; sessionStorage.removeItem('ll:curtain'); } catch (e) {}
    if (!flag || !motion()) return;
    curtain.style.transition = 'none';
    curtainState('in');
    void curtain.offsetHeight;
    curtain.style.transition = '';
    busy = true;
    setTimeout(function () {
      curtainState('out');
      setTimeout(function () { curtainState(''); busy = false; }, C_OUT + 20);
    }, 60);
  })();

  /* bfcache would otherwise restore a page with the curtain still covering it */
  on(win, 'pageshow', function (e) { if (e.persisted) { curtainState(''); busy = false; } });

  LL.curtain = { run: curtainRun, leave: curtainLeave, busy: function () { return busy; } };

  /* ---- the language switch rides the curtain ---- */
  function switchLang(next) {
    curtainRun(function () {
      setLang(next, true);
      /* the calendar draws its month name, weekday heads and day labels from the
         locale, so it has to be rebuilt — not just re-translated by data-en */
      if (LL.calRedraw) LL.calRedraw();
      if (LL.bookingRefresh) LL.bookingRefresh(false);
      if (LL.rvApply) LL.rvApply('all');
    });
  }
  $$('[data-lang-toggle]').forEach(function (b) {
    on(b, 'click', function () { switchLang(root.lang === 'en' ? 'th' : 'en'); });
  });
  LL.switchLang = switchLang;

  /* ---- and so does every move between pages ----
     Same-page anchors, the menu category rail, external links, tel: and mailto:
     are deliberately excluded: nothing is being replaced, so nothing is covered.
     The single-file build routes in-document and drives the curtain itself. */
  var PAGES = /^(index|menu|reviews|book|visit|gallery|404)\.html$/;
  on(doc, 'click', function (e) {
    if (win.__llArtifact) return;                       /* the artifact router handles it */
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return;
    var page = href.split('#')[0].split('?')[0];
    if (!PAGES.test(page)) return;
    if (page === location.pathname.split('/').pop()) return;   /* already here */
    if (!motion() || !curtain) return;                  /* let the browser navigate normally */
    e.preventDefault();
    try { sessionStorage.setItem('ll:curtain', '1'); } catch (er) {}
    closeMenu(false);
    curtainLeave(function () { location.href = href; });
  }, true);

  /* ========================================================= 2. LOADER ====
     The disc sign switches on. Lifts when the hero photo can be painted,
     420ms floor so it never flickers, 2200ms cap so it never traps. Once per
     session; never without JS or under reduced motion (CSS hides it). */
  var loader = $('[data-loader]');
  if (loader) {
    var seen = false;
    try { seen = sessionStorage.getItem('ll:seen') === '1'; } catch (e) {}
    if (seen || !motion()) {
      loader.parentNode.removeChild(loader);
    } else {
      try { sessionStorage.setItem('ll:seen', '1'); } catch (e) {}
      var began = Date.now(), lifted = false;
      var lift = function () {
        if (lifted) return; lifted = true;
        loader.setAttribute('data-ready', 'true');
        setTimeout(function () {
          loader.setAttribute('data-done', 'true');
          setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 560);
        }, 640);
      };
      var schedule = function () { setTimeout(lift, Math.max(0, 420 - (Date.now() - began))); };
      var heroImg = $('.hero__media img');
      if (heroImg && !(heroImg.complete && heroImg.naturalWidth)) { on(heroImg, 'load', schedule); on(heroImg, 'error', schedule); }
      else if (doc.readyState === 'complete') schedule();
      else on(win, 'load', schedule);
      setTimeout(lift, 2200);
    }
  }

  /* ========================================================= 3. HEADER ====
     Transparent over the hero wall, solid paper afterwards; hides while
     scrolling down past the hero, returns on any upward scroll. */
  var head = $('[data-head]');
  if (head) {
    var lastY = win.scrollY, solidAt = function () {
      var hero = $('.hero__wall');
      if (!hero) return 24;
      return hero.getBoundingClientRect().bottom + win.scrollY - 72;
    };
    var threshold = solidAt();
    var headTick = function () {
      var y = win.scrollY;
      head.classList.toggle('head--solid', y > threshold || !$('.hero__wall'));
      var open = $('.panel[data-open="true"]');
      head.classList.toggle('head--hidden', !open && y > lastY && y > threshold + 120 && (y - lastY) > 2);
      lastY = y;
    };
    var headPending = false;
    on(win, 'scroll', function () { if (headPending) return; headPending = true; setTimeout(function () { headPending = false; headTick(); }, 40); }, { passive: true });
    on(win, 'resize', function () { threshold = solidAt(); headTick(); });
    headTick();
    LL.headRefresh = function () { threshold = solidAt(); lastY = win.scrollY; headTick(); };
  }

  /* --- mobile panel: an accessible dialog ------------------------------- */
  var burger = $('.burger'), panel = $('#mobilemenu');
  function focusables(c) { return $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', c).filter(function (e) { return e.offsetParent !== null; }); }
  function openMenu() {
    if (!panel) return;
    panel.setAttribute('data-open', 'true'); panel.removeAttribute('aria-hidden');
    burger.setAttribute('aria-expanded', 'true');
    doc.body.classList.add('is-locked');
    head.classList.remove('head--hidden');
    var f = focusables(panel); if (f.length) f[0].focus();
  }
  function closeMenu(restore) {
    if (!panel || panel.getAttribute('data-open') !== 'true') return;
    panel.setAttribute('data-open', 'false'); panel.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    doc.body.classList.remove('is-locked');
    if (restore !== false) burger.focus();
  }
  on(burger, 'click', function () { panel.getAttribute('data-open') === 'true' ? closeMenu() : openMenu(); });
  if (panel) $$('a', panel).forEach(function (a) { on(a, 'click', function () { closeMenu(false); }); });
  LL.closeMenu = closeMenu;

  /* ======================================================== 4. LIGHTBOX ===
     One viewer for every [data-lb] on the page. The order is DOM order. */
  var lb = $('.lb');
  var lbState = { items: [], idx: 0, opener: null };
  function lbCollect(scope) { lbState.items = $$('[data-lb]'); }
  function lbShow(i, dir) {
    var n = lbState.items.length; if (!n) return;
    lbState.idx = (i + n) % n;
    var t = lbState.items[lbState.idx];
    var stage = $('.lb__stage', lb); stage.innerHTML = '';
    var im = doc.createElement('img');
    im.src = src(t.getAttribute('data-lb'));
    var en = root.lang === 'en';
    im.alt = en ? (t.getAttribute('data-lb-cap-en') || t.getAttribute('data-lb-cap') || '') : (t.getAttribute('data-lb-cap') || '');
    if (dir) im.className = dir > 0 ? 'is-fromright' : 'is-fromleft';
    stage.appendChild(im);
    var cap = $('.lb__cap', lb);
    cap.setAttribute('data-th', t.getAttribute('data-lb-cap') || '');
    cap.setAttribute('data-en', t.getAttribute('data-lb-cap-en') || t.getAttribute('data-lb-cap') || '');
    cap.textContent = en ? cap.getAttribute('data-en') : cap.getAttribute('data-th');
    $('.lb__idx', lb).textContent = (lbState.idx + 1) + ' / ' + n;
    /* preload neighbours */
    [1, -1].forEach(function (d) { var nx = lbState.items[(lbState.idx + d + n) % n]; if (nx) { var p = new Image(); p.src = src(nx.getAttribute('data-lb')); } });
  }
  function lbOpen(t) {
    lbCollect();
    var at = lbState.items.indexOf(t);
    lbState.opener = t.matches('button,a') ? t : ($('button', t) || t);
    lbShow(at < 0 ? 0 : at);
    lb.setAttribute('data-open', 'true'); lb.removeAttribute('aria-hidden');
    doc.body.classList.add('is-locked');
    $('.lb__close', lb).focus();
  }
  function lbClose() {
    lb.setAttribute('data-open', 'false'); lb.setAttribute('aria-hidden', 'true');
    doc.body.classList.remove('is-locked');
    $('.lb__stage', lb).innerHTML = '';
    if (lbState.opener && lbState.opener.focus) lbState.opener.focus();
  }
  if (lb) {
    on(doc, 'click', function (e) {
      var t = e.target.closest('[data-lb]');
      if (t && !e.defaultPrevented) { e.preventDefault(); lbOpen(t); }
    });
    on($('.lb__close', lb), 'click', lbClose);
    on($('[data-lb-prev]', lb), 'click', function () { lbShow(lbState.idx - 1, -1); });
    on($('[data-lb-next]', lb), 'click', function () { lbShow(lbState.idx + 1, 1); });
    on(lb, 'click', function (e) { if (e.target === lb || e.target.classList.contains('lb__stage')) lbClose(); });
    var sx = 0, sy = 0, sid = null, stage = $('.lb__stage', lb);
    on(stage, 'pointerdown', function (e) { sid = e.pointerId; sx = e.clientX; sy = e.clientY; });
    on(stage, 'pointerup', function (e) {
      if (sid !== e.pointerId) return; sid = null;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) lbShow(lbState.idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    LL.lightbox = { open: lbOpen, close: lbClose, next: function () { lbShow(lbState.idx + 1, 1); }, prev: function () { lbShow(lbState.idx - 1, -1); }, isOpen: function () { return lb.getAttribute('data-open') === 'true'; }, index: function () { return lbState.idx; } };
  }

  /* =================================================== 5. KEYS + TRAP ==== */
  on(doc, 'keydown', function (e) {
    var open = lb && lb.getAttribute('data-open') === 'true';
    if (e.key === 'Escape') {
      if (open) { lbClose(); return; }
      closeMenu();
      if (LL.dishHide) LL.dishHide();
      return;
    }
    if (open) {
      if (e.key === 'ArrowRight') lbShow(lbState.idx + 1, 1);
      if (e.key === 'ArrowLeft') lbShow(lbState.idx - 1, -1);
      if (e.key === 'Tab') {
        var f = focusables(lb); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (panel && panel.getAttribute('data-open') === 'true' && e.key === 'Tab') {
      var g = focusables(panel).concat([burger]);
      var a = g[0], z = g[g.length - 1];
      if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ======================================================== 6. DISH POP ===
     Fine pointer: the photo follows the cursor beside the row and never covers
     it. Touch and keyboard: the same photo opens inline beneath the row. */
  var pop = null, popImg = null, popName = null, popOn = false, popRow = null;
  var px = 0, py = 0, tx = 0, ty = 0, raf = null;
  function popBuild() {
    if (pop) return;
    pop = doc.createElement('div'); pop.className = 'dishpop'; pop.setAttribute('aria-hidden', 'true');
    popImg = doc.createElement('img'); popImg.alt = ''; popImg.decoding = 'async';
    on(popImg, 'load', function () { popImg.classList.add('is-shown'); });
    popName = doc.createElement('p'); popName.className = 'dishpop__name';
    pop.appendChild(popImg); pop.appendChild(popName); doc.body.appendChild(pop);
  }
  function popPlace(snap) {
    var w = pop.offsetWidth, h = pop.offsetHeight, m = 14, gap = 28;
    var k = snap ? 1 : 0.2;
    tx += (px - tx) * k; ty += (py - ty) * k;
    var left = tx + gap;
    if (left + w > win.innerWidth - m) left = tx - gap - w;
    left = Math.min(Math.max(left, m), win.innerWidth - w - m);
    var top = Math.min(Math.max(ty - h / 2, m), win.innerHeight - h - m);
    pop.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + top.toFixed(1) + 'px,0)';
  }
  function popLoop() { popPlace(false); raf = popOn ? win.requestAnimationFrame(popLoop) : null; }
  function popShow(row) {
    var pic = $('.mrow__pic img', row); if (!pic) return;
    if ($('.mrow__btn', row).getAttribute('aria-expanded') === 'true') return;
    popBuild();
    var s = src(pic.getAttribute('data-full') || pic.getAttribute('src'));
    if (popImg.getAttribute('src') !== s) { popImg.classList.remove('is-shown'); popImg.setAttribute('src', s); }
    else popImg.classList.add('is-shown');
    popName.textContent = ($('.mrow__name', row) || {}).textContent || '';
    popPlace(true);
    pop.setAttribute('data-on', 'true');
    if (popRow && popRow !== row) popRow.classList.remove('is-live');
    popRow = row; row.classList.add('is-live');
    if (!popOn) { popOn = true; raf = win.requestAnimationFrame(popLoop); }
  }
  function popHide() {
    popOn = false;
    if (raf) { win.cancelAnimationFrame(raf); raf = null; }
    if (pop) pop.setAttribute('data-on', 'false');
    if (popRow) { popRow.classList.remove('is-live'); popRow = null; }
  }
  LL.dishHide = popHide;
  on(win, 'scroll', function () { if (popOn) popHide(); }, { passive: true });

  function panelMeasure(p) {
    var prev = p.style.height; p.style.transition = 'none'; p.style.height = 'auto';
    var h = p.offsetHeight; p.style.height = prev; void p.offsetHeight; p.style.transition = ''; return h;
  }
  function panelSet(p, open) {
    p.setAttribute('data-open', open ? 'true' : 'false');
    var im = $('img', p);
    if (open && im && im.getAttribute('data-full') && im.getAttribute('src') !== src(im.getAttribute('data-full'))) im.setAttribute('src', src(im.getAttribute('data-full')));
    if (!motion()) { p.style.height = open ? 'auto' : '0px'; return; }
    if (open) {
      p.style.height = panelMeasure(p) + 'px';
      var done = function (e) { if (e.propertyName !== 'height') return; p.style.height = 'auto'; p.removeEventListener('transitionend', done); };
      p.addEventListener('transitionend', done);
      if (im && !im.complete) on(im, 'load', function () { if (p.getAttribute('data-open') === 'true') p.style.height = 'auto'; });
    } else {
      if (p.style.height === 'auto' || p.style.height === '') { p.style.height = p.offsetHeight + 'px'; void p.offsetHeight; }
      p.style.height = '0px';
    }
  }
  function rowToggle(row, all) {
    var btn = $('.mrow__btn', row), p = $('.mrow__pic', row); if (!btn || !p) return;
    var open = btn.getAttribute('aria-expanded') !== 'true';
    if (open) all.forEach(function (o) {
      if (o === row) return;
      var ob = $('.mrow__btn', o), op = $('.mrow__pic', o);
      if (ob && ob.getAttribute('aria-expanded') === 'true') { ob.setAttribute('aria-expanded', 'false'); if (op) panelSet(op, false); }
    });
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var cue = $('.mrow__cue', row);
    if (cue) { cue.textContent = open ? '✕' : (root.lang === 'en' ? cue.getAttribute('data-en') : cue.getAttribute('data-th')); }
    panelSet(p, open);
    if (open) popHide();
  }

  /* ====================================================== 7. PAGE BOOT ==== */
  LL.boot = function (scope) {
    scope = scope || doc;

    /* --- image load state ------------------------------------------------ */
    $$('img', scope).forEach(function (im) {
      var mark = function () { im.classList.add('is-loaded'); };
      if (im.complete && im.naturalWidth) mark(); else { on(im, 'load', mark); on(im, 'error', mark); }
    });

    /* --- reveals --------------------------------------------------------- */
    var rev = $$('[data-reveal], .mask', scope);
    if (rev.length && motion() && 'IntersectionObserver' in win) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      rev.forEach(function (el) { io.observe(el); });
      /* anything already above the fold on arrival shows at once */
      setTimeout(function () { rev.forEach(function (el) { if (el.getBoundingClientRect().top < win.innerHeight * 0.9) el.classList.add('is-in'); }); }, 60);
    } else rev.forEach(function (el) { el.classList.add('is-in'); });

    /* --- the route draws itself ------------------------------------------ */
    var routes = $$('[data-route]', scope);
    routes.forEach(function (sec) {
      var path = $('.path', sec); if (!path) return;
      var len = 0; try { len = path.getTotalLength(); } catch (e) {}
      if (!len) return;
      path.style.strokeDasharray = len + ' ' + len;
      var stops = $$('.stop-g', sec);
      var stopAt = stops.map(function (g) { return parseFloat(g.getAttribute('data-at') || '1'); });
      function paint(p) {
        path.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
        stops.forEach(function (g, i) { g.style.opacity = p >= stopAt[i] - 0.02 ? 1 : 0.18; });
      }
      if (!motion()) { paint(1); return; }
      var ticking = false;
      var tick = function () {
        ticking = false;
        var r = sec.getBoundingClientRect(), vh = win.innerHeight;
        var p = (vh * 0.85 - r.top) / (r.height * 0.9);
        paint(Math.max(0, Math.min(1, p)));
      };
      /* a short timer rather than rAF: rAF is paused in background tabs and hidden webviews */
      on(win, 'scroll', function () { if (!ticking) { ticking = true; setTimeout(tick, 32); } }, { passive: true });
      on(win, 'resize', tick);
      tick();
      sec.__routeTick = tick;
    });

    /* --- marquee: CSS drifts, JS pauses and lets you drag ----------------- */
    $$('[data-marquee]', scope).forEach(function (mq) {
      var btn = $('[data-marquee-pause]', mq.parentNode) || $('[data-marquee-pause]', scope);
      var label = btn && $('[data-pause-label]', btn);
      function setPaused(p) {
        mq.setAttribute('data-paused', p ? 'true' : 'false');
        if (btn) btn.setAttribute('aria-pressed', p ? 'true' : 'false');
        if (label) { var en = p ? 'Play' : 'Pause', th = p ? 'เล่น' : 'หยุด'; label.setAttribute('data-en', en); label.setAttribute('data-th', th); label.textContent = root.lang === 'en' ? en : th; }
      }
      on(btn, 'click', function () {
        var p = mq.getAttribute('data-paused') === 'true';
        if (!p && mq.getAttribute('data-drag') === 'true') { /* was dragged: resume means re-arm the drift */ }
        mq.setAttribute('data-drag', 'false'); mq.scrollLeft = 0;
        setPaused(!p);
      });
      /* drag / swipe: switch to manual scrolling */
      var down = false, startX = 0, startL = 0, moved = false;
      on(mq, 'pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; down = true; moved = false; startX = e.clientX; startL = mq.scrollLeft; });
      on(mq, 'pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 6) { moved = true; if (mq.getAttribute('data-drag') !== 'true') { var off = mq.__offset || 0; mq.setAttribute('data-drag', 'true'); mq.scrollLeft = off; startL = off; } mq.setPointerCapture && mq.setPointerCapture(e.pointerId); }
        if (moved) { mq.scrollLeft = startL - dx; e.preventDefault(); }
      });
      var up = function (e) { if (down && moved) { mq.__suppressClick = true; setTimeout(function () { mq.__suppressClick = false; }, 60); } down = false; };
      on(mq, 'pointerup', up); on(mq, 'pointercancel', up); on(mq, 'lostpointercapture', up);
      on(mq, 'click', function (e) { if (mq.__suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);
      /* remember where the animation was, so a drag starts from the visible frame */
      var track = $('.marq__track', mq);
      on(mq, 'pointerenter', function () { if (track) { var m = getComputedStyle(track).transform.match(/-?\d+\.?\d*/g); if (m && m.length >= 5) mq.__offset = -parseFloat(m[4]); } });
      if (mq.getAttribute('data-drag') !== 'true') setPaused(false);
      if (!motion()) mq.setAttribute('data-drag', 'true');
    });

    /* --- menu: pop, inline panel, spotlight, rail ------------------------- */
    var rows = $$('.mrow--haspic', scope);
    if (rows.length) {
      rows.forEach(function (row) {
        var p = $('.mrow__pic', row); if (p) { p.setAttribute('data-open', 'false'); p.style.height = '0px'; }
        var btn = $('.mrow__btn', row);
        on(row, 'pointerenter', function (e) { if (e.pointerType !== 'mouse' || !fine.matches) return; px = e.clientX; py = e.clientY; tx = px; ty = py; popShow(row); });
        on(row, 'pointermove', function (e) { if (e.pointerType !== 'mouse' || !fine.matches || !popOn) return; px = e.clientX; py = e.clientY; });
        on(row, 'pointerleave', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; popHide(); });
        on(btn, 'click', function () { rowToggle(row, rows); });
        on(btn, 'focus', function () { popHide(); });
      });
      on(win, 'resize', function () { popHide(); rows.forEach(function (r) { var p = $('.mrow__pic', r); if (p && p.getAttribute('data-open') === 'true') p.style.height = 'auto'; }); });
      /* spotlight: on touch, the row nearest the centre is the one in focus */
      if (!fine.matches && 'IntersectionObserver' in win && motion()) {
        root.classList.add('spot');
        var all = $$('.mrow', scope), live = null;
        var sio = new IntersectionObserver(function (es) {
          var best = null;
          es.forEach(function (e) { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
          if (best) {
            if (live) live.classList.remove('is-spot');
            live = best.target; live.classList.add('is-spot');
          }
        }, { rootMargin: '-42% 0px -42% 0px', threshold: [0, 0.5, 1] });
        all.forEach(function (r) { sio.observe(r); });
      }
      var fineChange = function (e) { if (!e.matches) popHide(); };
      if (fine.addEventListener) fine.addEventListener('change', fineChange);
    }
    var rail = $('.rail', scope);
    if (rail && 'IntersectionObserver' in win) {
      var links = $$('a[href^="#"]', rail), cats = $$('.mcat', scope), liveId = null;
      var rio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.id; if (id === liveId) return; liveId = id;
          links.forEach(function (a) {
            var isIt = a.getAttribute('href') === '#' + id;
            a.classList.toggle('is-live', isIt);
            if (isIt && rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: a.offsetLeft - 16, behavior: motion() ? 'smooth' : 'auto' });
          });
        });
      }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
      cats.forEach(function (c) { rio.observe(c); });
      links.forEach(function (a) { on(a, 'click', function (e) {
        var t = $(a.getAttribute('href'), scope); if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' });
        history.replaceState(null, '', a.getAttribute('href'));
      }); });
    }

    /* --- reviews filter -------------------------------------------------
       Chips are real buttons with aria-pressed; the result count is announced.
       A chip that matched nothing was never rendered (see _source/build.py). */
    var rvWrap = $('[data-rvfilter]', scope), rvGrid = $('[data-rvgrid]', scope);
    if (rvWrap && rvGrid) {
      var rvCards = $$('.rv', rvGrid), rvCount = $('[data-rvcount]', scope), rvNone = $('[data-rvnone]', scope);
      function rvApply(key) {
        var shown = 0;
        rvCards.forEach(function (c) {
          var hit = key === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + key + ' ') > -1;
          c.hidden = !hit;
          if (hit) shown++;
        });
        $$('.rvchip', rvWrap).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === key ? 'true' : 'false'); });
        if (rvNone) rvNone.hidden = shown > 0;
        if (rvCount) {
          rvCount.textContent = root.lang === 'en'
            ? (shown === rvCards.length ? shown + ' reviews' : shown + ' of ' + rvCards.length + ' reviews')
            : (shown === rvCards.length ? shown + ' รีวิว' : shown + ' จาก ' + rvCards.length + ' รีวิว');
        }
      }
      $$('.rvchip', rvWrap).forEach(function (b) {
        on(b, 'click', function () { rvApply(b.getAttribute('data-filter')); });
      });
      rvApply('all');
      LL.rvApply = rvApply;
    }

    /* --- the booking composer ------------------------------------------
       Little Lobster has no reservation platform: it takes bookings on LINE
       and by phone. So this writes the message and hands it to that channel.
       It never claims a table, and the times below are the venue's opening
       window, not availability. Manual §10.9. */
    var bform = $('[data-book]', scope);
    if (bform) {
      var bsum = $('[data-summary]', scope), bmsg = $('[data-message]', scope);
      var blive = $('[data-book-live]', scope), bstate = $('[data-sendstate]', scope);
      var bLine = $('[data-send-line]', scope), bCopy = $('[data-copy-msg]', scope);
      var bDate = $('#bdate', scope), bName = $('#bname', scope), bPhone = $('#bphone', scope), bNote = $('#bnote', scope);
      var bBigWrap = $('[data-bigparty]', scope), bBig = bBigWrap && $('input', bBigWrap);
      var H = (DATA.hours || { open: '11:00', close: '21:00' });
      var msgDirty = false;
      var KEY = 'll:booking';

      function bkkToday() {
        var n = new Date(), b;
        try { b = new Date(n.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })); } catch (e) { b = new Date(n.getTime() + (n.getTimezoneOffset() + 420) * 60000); }
        return b;
      }
      function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

      /* the venue's opening window, in 30-minute steps, last request 30 min before close */
      (function buildTimes() {
        var wrap = $('[data-times]', scope); if (!wrap) return;
        var toMin = function (t) { var a = t.split(':'); return (+a[0]) * 60 + (+a[1]); };
        var start = toMin(H.open), end = toMin(H.close) - 30;
        for (var m = start; m <= end; m += 30) {
          var label = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
          var b = doc.createElement('button');
          b.type = 'button'; b.className = 'btime'; b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', 'false'); b.dataset.time = label;
          if (m < toMin('14:00')) b.dataset.lunch = '1';
          b.textContent = label;
          wrap.appendChild(b);
        }
      })();

      (function buildParty() {
        var wrap = $('[data-party]', scope); if (!wrap) return;
        for (var i = 1; i <= 8; i++) {
          var b = doc.createElement('button');
          b.type = 'button'; b.className = 'bpart'; b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', 'false'); b.dataset.party = String(i);
          b.textContent = String(i);
          wrap.appendChild(b);
        }
        var more = doc.createElement('button');
        more.type = 'button'; more.className = 'bpart'; more.setAttribute('role', 'radio');
        more.setAttribute('aria-checked', 'false'); more.dataset.party = 'more'; more.textContent = '9+';
        wrap.appendChild(more);
      })();

      function radioPick(sel, attr, value) {
        $$(sel, scope).forEach(function (b) { b.setAttribute('aria-checked', b.dataset[attr] === value ? 'true' : 'false'); });
      }
      function picked(sel, attr) {
        var el = $$(sel, scope).filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0];
        return el ? el.dataset[attr] : '';
      }

      function partyCount() {
        var p = picked('.bpart', 'party');
        if (p === 'more') return bBig && bBig.value ? parseInt(bBig.value, 10) : null;
        return p ? parseInt(p, 10) : null;
      }
      function fmtDate(v) {
        if (!v) return '';
        var p = v.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
        try {
          return root.lang === 'en'
            ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return v; }
      }
      function phoneOk(v) { var d = (v || '').replace(/\D/g, ''); return d.length >= 9 && d.length <= 10 && d.charAt(0) === '0'; }

      function state() {
        return { date: bDate.value, time: picked('.btime', 'time'), party: partyCount(),
                 name: (bName.value || '').trim(), phone: (bPhone.value || '').trim(), note: (bNote.value || '').trim() };
      }
      function compose(st) {
        var en = root.lang === 'en';
        var L = [];
        if (en) {
          L.push('Hello Little Lobster, I would like to request a table.');
          L.push('Date: ' + (fmtDate(st.date) || '—'));
          L.push('Time: ' + (st.time || '—'));
          L.push('People: ' + (st.party ? st.party : '—'));
          L.push('Name: ' + (st.name || '—'));
          L.push('Phone: ' + (st.phone || '—'));
          if (st.note) L.push('Note: ' + st.note);
          L.push('');
          L.push('(Sent from the Little Lobster website — please confirm when you can.)');
        } else {
          L.push('สวัสดีค่ะ/ครับ ขอจองโต๊ะที่ Little Lobster');
          L.push('วันที่: ' + (fmtDate(st.date) || '—'));
          L.push('เวลา: ' + (st.time ? st.time + ' น.' : '—'));
          L.push('จำนวน: ' + (st.party ? st.party + ' ท่าน' : '—'));
          L.push('ชื่อ: ' + (st.name || '—'));
          L.push('เบอร์โทร: ' + (st.phone || '—'));
          if (st.note) L.push('หมายเหตุ: ' + st.note);
          L.push('');
          L.push('(ส่งจากเว็บไซต์ของร้าน รบกวนยืนยันกลับด้วยนะคะ/ครับ)');
        }
        return L.join('\n');
      }
      function setSum(key, text) {
        var el = $('[data-sum="' + key + '"]', scope); if (!el) return;
        el.textContent = text || '—';
        if (text) el.removeAttribute('data-empty'); else el.setAttribute('data-empty', '1');
      }
      function complete(st) {
        return !!(st.date && st.date >= iso(bkkToday()) && st.time && st.party && st.name && phoneOk(st.phone));
      }

      function refresh(save) {
        var st = state();
        setSum('date', fmtDate(st.date));
        setSum('time', st.time ? (root.lang === 'en' ? st.time : st.time + ' น.') : '');
        setSum('party', st.party ? (root.lang === 'en' ? st.party + (st.party > 1 ? ' people' : ' person') : st.party + ' ท่าน') : '');
        setSum('name', st.name);
        setSum('phone', st.phone);
        if (!msgDirty && bmsg) bmsg.value = compose(st);
        var ok = complete(st);
        if (bLine) bLine.disabled = !ok;
        if (save !== false) { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
      }
      LL.bookingRefresh = refresh;

      function showErr(id, on) { var e = $('#' + id, scope); if (e) e.hidden = !on; }
      function validate(focus) {
        var st = state(), first = null;
        var minDay = iso(bkkToday());
        var dateBad = !st.date || st.date < minDay;      /* novalidate means `min` is advisory */
        showErr('bdate-err', dateBad); if (dateBad && !first) first = bDate;
        bDate.setAttribute('aria-invalid', dateBad ? 'true' : 'false');
        showErr('btime-err', !st.time); if (!st.time && !first) first = $('.btime', scope);
        showErr('bparty-err', !st.party); if (!st.party && !first) first = $('.bpart', scope);
        showErr('bname-err', !st.name); if (!st.name && !first) first = bName;
        showErr('bphone-err', !phoneOk(st.phone)); if (!phoneOk(st.phone) && !first) first = bPhone;
        bName.setAttribute('aria-invalid', st.name ? 'false' : 'true');
        bPhone.setAttribute('aria-invalid', phoneOk(st.phone) ? 'false' : 'true');
        if (first && focus) first.focus();
        return !first;
      }

      /* --- the calendar ------------------------------------------------
         A real month grid, keyboard-operable to the APG date-grid pattern:
         arrows move a day, up/down a week, PageUp/Down a month, Home/End the
         week, Enter or Space picks. The native input stays as a typed route,
         and the two are kept in sync. Dates before today are disabled. */
      var calWrap = $('[data-cal]', scope);
      if (calWrap) {
        var calHead = $('[data-cal-head]', calWrap), calBody = $('[data-cal-body]', calWrap);
        var calMonth = $('[data-cal-month]', calWrap), calLive = $('[data-cal-live]', calWrap);
        var calPrev = $('[data-cal-prev]', calWrap), calNext = $('[data-cal-next]', calWrap);
        var today = bkkToday(); today.setHours(0, 0, 0, 0);
        var view = new Date(today.getFullYear(), today.getMonth(), 1);
        var cursor = new Date(today);                    /* the roving-tabindex day */

        function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
        function monthLabel(d) {
          try { return d.toLocaleDateString(root.lang === 'en' ? 'en-GB' : 'th-TH', { month: 'long', year: 'numeric' }); }
          catch (e) { return (d.getMonth() + 1) + '/' + d.getFullYear(); }
        }
        /* WebKit returns the FULL Thai weekday for {weekday:'short'}, which blows the
           column heads out, so Thai uses the abbreviations a Thai calendar prints. */
        var TH_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        function dayNames() {
          var out = [], base = new Date(2024, 8, 1);     /* a Sunday */
          for (var i = 0; i < 7; i++) {
            var d = new Date(base); d.setDate(base.getDate() + i);
            var en = root.lang === 'en', shortName, full;
            try { full = d.toLocaleDateString(en ? 'en-GB' : 'th-TH', { weekday: 'long' }); }
            catch (e) { full = String(i); }
            if (en) {
              try { shortName = d.toLocaleDateString('en-GB', { weekday: 'short' }); } catch (e) { shortName = full.slice(0, 3); }
            } else { shortName = TH_SHORT[i]; }
            out.push([shortName, full]);
          }
          return out;
        }
        function draw() {
          calMonth.textContent = monthLabel(view);
          calHead.innerHTML = '';
          dayNames().forEach(function (n) {
            var th = doc.createElement('th');
            th.scope = 'col'; th.setAttribute('abbr', n[1]); th.textContent = n[0];
            calHead.appendChild(th);
          });
          calBody.innerHTML = '';
          var first = new Date(view.getFullYear(), view.getMonth(), 1);
          var start = new Date(first); start.setDate(1 - first.getDay());
          var picked = bDate.value;
          for (var w = 0; w < 6; w++) {
            var tr = doc.createElement('tr'); tr.setAttribute('role', 'row');
            var any = false;
            for (var i = 0; i < 7; i++) {
              var d = new Date(start); d.setDate(start.getDate() + w * 7 + i);
              var td = doc.createElement('td'); td.setAttribute('role', 'gridcell');
              if (d.getMonth() !== view.getMonth()) { td.innerHTML = '&nbsp;'; tr.appendChild(td); continue; }
              any = true;
              var b = doc.createElement('button');
              b.type = 'button'; b.className = 'cal__day'; b.textContent = String(d.getDate());
              b.dataset.date = iso(d);
              var isSel = picked === iso(d), isToday = sameDay(d, today);
              /* aria-selected is defined for gridcell, not for button — it is dropped on
                 a <button>, so the state lives on the cell and is repeated in the name. */
              td.setAttribute('aria-selected', isSel ? 'true' : 'false');
              if (isSel) b.dataset.selected = '1';
              if (isToday) { b.dataset.today = '1'; b.setAttribute('aria-current', 'date'); }
              if (d < today) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
              b.tabIndex = sameDay(d, cursor) ? 0 : -1;
              try {
                var nm = d.toLocaleDateString(root.lang === 'en' ? 'en-GB' : 'th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                if (isToday) nm += root.lang === 'en' ? ', today' : ' วันนี้';
                if (isSel) nm += root.lang === 'en' ? ', selected' : ' เลือกอยู่';
                b.setAttribute('aria-label', nm);
              } catch (e) {}
              td.appendChild(b); tr.appendChild(td);
            }
            if (any) calBody.appendChild(tr);
          }
          var firstOfView = new Date(view.getFullYear(), view.getMonth(), 1);
          /* soft-disable: a real `disabled` on the focused Prev button drops focus to
             <body> the moment paging back reaches this month */
          calPrev.setAttribute('aria-disabled', firstOfView <= new Date(today.getFullYear(), today.getMonth(), 1) ? 'true' : 'false');

          /* The roving tab stop must always land on a bookable day, or the grid falls
             out of the tab order entirely once the view moves off the cursor's month. */
          var days = $$('.cal__day', calBody);
          var hasStop = days.some(function (o) { return o.tabIndex === 0 && !o.disabled; });
          if (!hasStop) {
            var stop = null;
            for (var q = 0; q < days.length; q++) {
              if (days[q].disabled) continue;
              if (days[q].dataset.date === picked) { stop = days[q]; break; }
              if (!stop) stop = days[q];
            }
            if (stop) {
              days.forEach(function (o) { o.tabIndex = -1; });
              stop.tabIndex = 0;
              cursor = new Date(stop.dataset.date + 'T00:00:00');
            }
          }
          /* name the grid with the month it is showing */
          var grid = $('.cal__grid', calWrap);
          if (grid) grid.setAttribute('aria-label', (root.lang === 'en' ? 'Choose a date — ' : 'เลือกวันที่ — ') + monthLabel(view));
        }

        var lastSaid = '';
        function announceMonth() {
          if (!calLive) return;
          var t = monthLabel(view);
          calLive.textContent = (t === lastSaid ? t + ' ' : t);   /* identical text can be swallowed */
          lastSaid = t;
        }
        function syncTabs(ds) {
          $$('.cal__day', calBody).forEach(function (o) { o.tabIndex = o.dataset.date === ds ? 0 : -1; });
        }
        function focusCursor() {
          var b = $('[data-date="' + iso(cursor) + '"]', calBody);
          if (b) { b.tabIndex = 0; b.focus(); }
        }
        function moveTo(d) {
          if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) {
            view = new Date(d.getFullYear(), d.getMonth(), 1);
          }
          cursor = d; draw(); focusCursor();
        }
        function pick(dStr) {
          bDate.value = dStr;
          var selWord = root.lang === 'en' ? ', selected' : ' เลือกอยู่';
          $$('.cal__day', calBody).forEach(function (o) {
            var sel = o.dataset.date === dStr;
            /* aria-selected belongs on the gridcell; the button carries it in its name */
            if (o.parentNode && o.parentNode.setAttribute) o.parentNode.setAttribute('aria-selected', sel ? 'true' : 'false');
            if (sel) o.dataset.selected = '1'; else delete o.dataset.selected;
            var nm = (o.getAttribute('aria-label') || '').replace(/(,\s*selected|\s*เลือกอยู่)$/, '');
            o.setAttribute('aria-label', sel ? nm + selWord : nm);
          });
          showErr('bdate-err', false);
          if (calLive) calLive.textContent = (root.lang === 'en' ? 'Chosen: ' : 'เลือกวันที่ ') + fmtDate(dStr);
          refresh();
        }
        on(calBody, 'click', function (e) {
          var b = e.target.closest('.cal__day'); if (!b || b.disabled) return;
          cursor = new Date(b.dataset.date + 'T00:00:00');
          syncTabs(b.dataset.date);
          pick(b.dataset.date);
        });
        on(calBody, 'keydown', function (e) {
          var b = e.target.closest('.cal__day'); if (!b) return;
          var d = new Date(cursor), k = e.key, handled = true;
          if (k === 'ArrowLeft') d.setDate(d.getDate() - 1);
          else if (k === 'ArrowRight') d.setDate(d.getDate() + 1);
          else if (k === 'ArrowUp') d.setDate(d.getDate() - 7);
          else if (k === 'ArrowDown') d.setDate(d.getDate() + 7);
          else if (k === 'Home') d.setDate(d.getDate() - d.getDay());
          else if (k === 'End') d.setDate(d.getDate() + (6 - d.getDay()));
          else if (k === 'PageUp') d.setMonth(d.getMonth() - 1);
          else if (k === 'PageDown') d.setMonth(d.getMonth() + 1);
          else if (k === 'Enter' || k === ' ') { if (!b.disabled) pick(b.dataset.date); handled = true; }
          else handled = false;
          if (!handled) return;
          e.preventDefault();
          if (k !== 'Enter' && k !== ' ') {
            if (d < today) d = new Date(today);
            var monthChanged = d.getMonth() !== cursor.getMonth() || d.getFullYear() !== cursor.getFullYear();
            moveTo(d);
            if (monthChanged) announceMonth();
          }
        });
        on(calPrev, 'click', function () {
          if (calPrev.getAttribute('aria-disabled') === 'true') return;
          view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
          draw(); announceMonth();
          /* if paging back just reached this month, Prev is now inert — move on */
          if (calPrev.getAttribute('aria-disabled') === 'true' && doc.activeElement === calPrev) calNext.focus();
        });
        on(calNext, 'click', function () {
          view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
          draw(); announceMonth();
        });
        LL.calRedraw = draw;
        LL.calGo = function (dStr) {
          var d = new Date(dStr + 'T00:00:00');
          if (isNaN(d)) { draw(); return; }
          cursor = d < today ? new Date(today) : d;
          view = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
          draw();
        };
        draw();
      }
      bDate.min = iso(bkkToday());
      on(bDate, 'change', function () {
        showErr('bdate-err', false);
        if (LL.calGo && bDate.value) LL.calGo(bDate.value);   /* jump the grid to the typed month */
        else if (LL.calRedraw) LL.calRedraw();
        refresh();
      });

      /* time + party as real radio groups, arrow keys included */
      function groupKeys(sel) {
        $$(sel, scope).forEach(function (b, i, arr) {
          on(b, 'keydown', function (e) {
            var k = e.key, n = null;
            if (k === 'ArrowRight' || k === 'ArrowDown') n = arr[(i + 1) % arr.length];
            if (k === 'ArrowLeft' || k === 'ArrowUp') n = arr[(i - 1 + arr.length) % arr.length];
            if (!n) return;
            e.preventDefault(); n.focus(); n.click();
          });
        });
      }
      $$('.btime', scope).forEach(function (b) {
        on(b, 'click', function () { radioPick('.btime', 'time', b.dataset.time); showErr('btime-err', false); refresh(); });
      });
      $$('.bpart', scope).forEach(function (b) {
        on(b, 'click', function () {
          radioPick('.bpart', 'party', b.dataset.party);
          if (bBigWrap) { bBigWrap.hidden = b.dataset.party !== 'more'; if (b.dataset.party === 'more' && bBig) bBig.focus(); }
          showErr('bparty-err', false); refresh();
        });
      });
      groupKeys('.btime'); groupKeys('.bpart');
      if (bBig) on(bBig, 'input', function () { showErr('bparty-err', false); refresh(); });

      /* note chips append, and toggle off cleanly */
      $$('[data-notechips] .bchip', scope).forEach(function (b) {
        on(b, 'click', function () {
          var txt = root.lang === 'en' ? b.dataset.noteEn : b.dataset.noteTh;
          var cur = bNote.value.trim(), has = b.getAttribute('aria-pressed') === 'true';
          if (has) {
            bNote.value = cur.split('\n').filter(function (l) { return l.trim() !== txt; }).join('\n').trim();
            b.setAttribute('aria-pressed', 'false');
          } else {
            bNote.value = (cur ? cur + '\n' : '') + txt;
            b.setAttribute('aria-pressed', 'true');
          }
          refresh();
        });
      });

      [bName, bPhone, bNote].forEach(function (el) { on(el, 'input', function () { refresh(); }); });
      /* changing anything after a successful send makes it a new request */
      on(bform, 'input', function () { if (bSheet && bSheet.disabled && settledOnce) { bSheet.disabled = false; sheetLabel('idle'); settledOnce = false; } });
      var settledOnce = false;
      on(bName, 'blur', function () { showErr('bname-err', !state().name); });
      on(bPhone, 'blur', function () { showErr('bphone-err', !phoneOk(state().phone)); });
      if (bmsg) on(bmsg, 'input', function () { msgDirty = true; });

      function say(text, tone) {
        if (!bstate) return;
        bstate.hidden = false; bstate.textContent = text;
        if (tone) bstate.setAttribute('data-tone', tone); else bstate.removeAttribute('data-tone');
        if (blive) blive.textContent = text;
      }
      function copyMsg() {
        var t = bmsg.value;
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
        return new Promise(function (res, rej) {
          try { bmsg.focus(); bmsg.select(); var ok = doc.execCommand && doc.execCommand('copy'); ok ? res() : rej(); } catch (e) { rej(e); }
        });
      }
      on(bCopy, 'click', function () {
        copyMsg().then(function () {
          var l = $('[data-copy-msg-label]', bCopy) || bCopy;
          l.textContent = root.lang === 'en' ? 'Copied' : 'คัดลอกแล้ว';
          setTimeout(function () { l.textContent = root.lang === 'en' ? (l.getAttribute('data-en') || 'Copy the message') : (l.getAttribute('data-th') || 'คัดลอกข้อความ'); }, 1800);
        }, function () {
          bmsg.focus(); bmsg.select();
          say(root.lang === 'en' ? 'Select the message above and copy it, then send it on LINE.' : 'เลือกข้อความด้านบนแล้วคัดลอก จากนั้นส่งทาง LINE', 'warn');
        });
      });

      /* --- sending the request to the restaurant's sheet -----------------
         A static site has no server, so the request goes straight to an Apps
         Script Web App the restaurant deploys on its own Google account, which
         appends a row to its booking sheet. Until that URL is set in
         content/site.json the button is not shown at all and the form keeps its
         LINE hand-off — it never pretends to have sent anything. */
      var BK = DATA.booking || {};
      var hasSheet = !!(BK.endpoint && /^https:\/\//.test(BK.endpoint));
      var bSheet = $('[data-send-sheet]', scope);
      var pvSheet = $('[data-privacy-sheet]', scope), pvNone = $('[data-privacy-nosheet]', scope);
      var honey = $('.bhp input', scope);
      if (pvSheet) pvSheet.hidden = !hasSheet;
      if (pvNone) pvNone.hidden = hasSheet;
      var inSheet = $('[data-intro-sheet]', scope), inNone = $('[data-intro-nosheet]', scope);
      if (inSheet) inSheet.hidden = !hasSheet;
      if (inNone) inNone.hidden = hasSheet;
      var pvLink = $('[data-privacy-link]', scope);
      if (pvLink) pvLink.hidden = !hasSheet;    /* the notice sits in step 4; point at it from the button */
      if (bSheet) bSheet.hidden = !hasSheet;
      if (hasSheet && bLine) bLine.classList.remove('btn--primary');

      function sheetLabel(key) {
        if (!bSheet) return;
        var el = $('[data-send-sheet-label]', bSheet); if (!el) return;
        var m = { idle: ['ส่งคำขอจอง', 'Send booking request'],
                  sending: ['กำลังส่ง…', 'Sending…'],
                  sent: ['ส่งแล้ว', 'Sent'] }[key];
        el.setAttribute('data-th', m[0]); el.setAttribute('data-en', m[1]);
        el.textContent = root.lang === 'en' ? m[1] : m[0];
      }

      on(bSheet, 'click', function () {
        if (!validate(true)) {
          say(root.lang === 'en' ? 'A few details are still missing — they are marked in the form.' : 'ยังกรอกไม่ครบ ดูจุดที่ทำเครื่องหมายไว้ในฟอร์ม', 'warn');
          return;
        }
        var st = state();
        bSheet.disabled = true; sheetLabel('sending');
        say(root.lang === 'en' ? 'Sending your request…' : 'กำลังส่งคำขอ…');
        var payload = {
          token: BK.token || '', website: honey ? honey.value : '',   /* honeypot, judged server-side */
          date: st.date, time: st.time, party: st.party,
          name: st.name, phone: st.phone, note: st.note,
          lang: root.lang, sentAt: new Date().toISOString()
        };
        var settled = false, timer = null;
        var reset = function () { bSheet.disabled = false; sheetLabel('idle'); };
        /* Three outcomes, because the browser cannot always know which happened.
           notSent  — the request never left: safe to say nothing was sent.
           unknown  — it left but no answer came back: NEVER claim nothing was sent.
           ok       — the script answered {ok:true}. */
        var notSent = function () {
          if (settled) return; settled = true; clearTimeout(timer); reset();
          say(root.lang === 'en'
            ? 'That did not go through, and nothing was sent. Please copy the message and send it on LINE, or call 080-926-5262.'
            : 'ส่งไม่สำเร็จ และยังไม่มีข้อมูลถูกส่งออกไป รบกวนคัดลอกข้อความแล้วส่งทาง LINE หรือโทร 080-926-5262', 'warn');
        };
        var unknown = function () {
          if (settled) return; settled = true; clearTimeout(timer); reset();
          say(root.lang === 'en'
            ? 'No reply came back, so we cannot tell whether the restaurant received this. To be sure, call 080-926-5262 or send the message on LINE — mention it if a duplicate arrives.'
            : 'ไม่ได้รับการตอบกลับ จึงยังบอกไม่ได้ว่าทางร้านได้รับหรือยัง เพื่อความแน่ใจ โทร 080-926-5262 หรือส่งข้อความทาง LINE และแจ้งไว้ด้วยว่าอาจส่งซ้ำ', 'warn');
        };
        var ok = function () {
          if (settled) return; settled = true; clearTimeout(timer);
          sheetLabel('sent');
          try { sessionStorage.removeItem(KEY); } catch (e) {}
          say(root.lang === 'en'
            ? 'Sent. Your request is in the restaurant\'s booking sheet and staff will confirm on LINE or by phone — a table is not held until they do. Coming today? Call 080-926-5262 to be sure someone has seen it.'
            : 'ส่งแล้ว คำขอของคุณอยู่ในตารางรับจองของร้าน ทางร้านจะยืนยันกลับทาง LINE หรือโทรกลับ โต๊ะยังไม่ถูกจองจนกว่าร้านจะยืนยัน ถ้ามาวันนี้ โทร 080-926-5262 เพื่อความแน่ใจว่ามีคนเห็นแล้ว');
          /* stays disabled: pressing it again would put the same guest in the sheet twice */
          bSheet.disabled = true; settledOnce = true;
        };
        timer = setTimeout(unknown, 12000);            /* never spin forever */
        try {
          win.fetch(BK.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },  /* simple request: no preflight */
            body: JSON.stringify(payload)
          }).then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
            .then(function (t) {
              /* Only this script's own {"ok":true} counts. A captive portal or an
                 Apps Script sign-in page also answers 200 with no "error" in it. */
              var j = null;
              try { j = JSON.parse(t); } catch (e) {}
              if (j && j.ok === true) ok();
              else if (j && j.error) notSent();       /* the script answered, and refused */
              else unknown();                          /* something else answered */
            })
            .catch(unknown);                           /* it left the browser; we cannot know */
        } catch (e) { notSent(); }                     /* fetch never dispatched */
      });

      on(bLine, 'click', function () {
        if (!validate(true)) {
          say(root.lang === 'en' ? 'A few details are still missing — they are marked in the form.' : 'ยังกรอกไม่ครบ ดูจุดที่ทำเครื่องหมายไว้ในฟอร์ม', 'warn');
          return;
        }
        var url = (DATA.line || 'https://lin.ee/DI4BNDZ');
        copyMsg().then(function () {
          say(root.lang === 'en'
            ? 'Message copied. LINE is opening — paste it into the chat and send. This is a request; the restaurant confirms.'
            : 'คัดลอกข้อความแล้ว กำลังเปิด LINE วางข้อความในแชทแล้วกดส่งได้เลย นี่คือการขอจอง ทางร้านจะยืนยันอีกครั้ง');
        }, function () {
          bmsg.focus(); bmsg.select();
          say(root.lang === 'en'
            ? 'Copy the message above, then paste it into LINE. This is a request; the restaurant confirms.'
            : 'คัดลอกข้อความด้านบนแล้ววางใน LINE นี่คือการขอจอง ทางร้านจะยืนยันอีกครั้ง', 'warn');
        });
        var w = win.open(url, '_blank', 'noopener');
        if (!w) say(root.lang === 'en'
          ? 'Message copied, but the browser blocked the LINE window. Open LINE @littlelobster and paste it.'
          : 'คัดลอกข้อความแล้ว แต่เบราว์เซอร์บล็อกหน้าต่าง LINE เปิด LINE @littlelobster แล้ววางข้อความได้เลย', 'warn');
      });

      /* restore the draft — a language switch or a trip to the map must not wipe it */
      (function restore() {
        var raw = null;
        try { raw = sessionStorage.getItem(KEY); } catch (e) {}
        if (raw) {
          try {
            var st = JSON.parse(raw);
            if (st.date && st.date >= iso(bkkToday())) bDate.value = st.date;
            if (st.time) radioPick('.btime', 'time', st.time);
            if (st.party) {
              if (st.party <= 8) radioPick('.bpart', 'party', String(st.party));
              else { radioPick('.bpart', 'party', 'more'); if (bBigWrap) bBigWrap.hidden = false; if (bBig) bBig.value = st.party; }
            }
            if (st.name) bName.value = st.name;
            if (st.phone) bPhone.value = st.phone;
            if (st.note) bNote.value = st.note;
          } catch (e) {}
        }
        refresh(false);
      })();
    }

    /* --- copy the phone number; tel: is inert inside a sandboxed frame --- */
    $$('[data-copy]', scope).forEach(function (b) {
      on(b, 'click', function () {
        var v = b.getAttribute('data-copy');
        var ok = function () { b.setAttribute('data-done', 'true'); var l = $('[data-copy-label]', b) || b; l.textContent = root.lang === 'en' ? 'Copied' : 'คัดลอกแล้ว'; setTimeout(function () { b.removeAttribute('data-done'); l.textContent = root.lang === 'en' ? (l.getAttribute('data-en') || 'Copy') : (l.getAttribute('data-th') || 'คัดลอก'); }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(v).then(ok, function () { win.prompt(root.lang === 'en' ? 'Phone' : 'เบอร์โทร', v); });
        else win.prompt(root.lang === 'en' ? 'Phone' : 'เบอร์โทร', v);
      });
    });
    $$('a[href^="tel:"]', scope).forEach(function (a) {
      on(a, 'click', function (e) {
        var framed = false; try { framed = win.self !== win.top; } catch (er) { framed = true; }
        if (!framed) return;
        e.preventDefault();
        var num = a.getAttribute('href').replace('tel:', '');
        if (navigator.clipboard) navigator.clipboard.writeText(num).then(function () { a.setAttribute('data-copied', '1'); var s = $('[data-tel-label]', a); if (s) s.textContent = (root.lang === 'en' ? 'Copied ' : 'คัดลอกแล้ว ') + num; }, function () { win.prompt('', num); });
        else win.prompt('', num);
      });
    });

    /* --- the map loads when asked --------------------------------------- */
    $$('[data-map]', scope).forEach(function (box) {
      var b = $('[data-map-load]', box); if (!b) return;
      on(b, 'click', function () {
        if (win.__llArtifact) { win.open(box.getAttribute('data-map-link'), '_blank', 'noopener'); return; }
        var f = doc.createElement('iframe');
        f.src = box.getAttribute('data-map'); f.title = b.getAttribute('data-map-title') || 'Google Maps';
        f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
        var ld = $('.mapframe__load', box); if (ld) ld.remove();
        box.appendChild(f);
      });
    });

    /* --- open now, computed in Asia/Bangkok --------------------------------- */
    var H = DATA.hours;
    if (H) $$('[data-open-now]', scope).forEach(function (el) {
      var now = new Date(), bkk;
      try { bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })); } catch (e) { bkk = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000); }
      var mins = bkk.getHours() * 60 + bkk.getMinutes();
      var t = function (s) { var a = s.split(':'); return (+a[0]) * 60 + (+a[1]); };
      var open = mins >= t(H.open) && mins < t(H.close);
      var soon = !open && mins < t(H.open) && t(H.open) - mins <= 60;
      var th = open ? 'เปิดอยู่ตอนนี้ · ถึง ' + H.close + ' น.' : (soon ? 'ใกล้เปิดแล้ว · ' + H.open + ' น.' : 'ปิดแล้ววันนี้ · พรุ่งนี้เปิด ' + H.open + ' น.');
      var en = open ? 'Open now · until ' + H.close : (soon ? 'Opens at ' + H.open : 'Closed now · opens ' + H.open + ' tomorrow');
      el.setAttribute('data-th', th); el.setAttribute('data-en', en);
      el.textContent = root.lang === 'en' ? en : th;
      el.setAttribute('data-state', open ? 'open' : 'closed');
    });

    /* --- hero: nudge the image into its loaded state ----------------------- */
    var hi = $('.hero__media img', scope);
    if (hi && hi.complete) hi.classList.add('is-loaded');

    if (LL.headRefresh) LL.headRefresh();
    setLang(root.lang === 'en' ? 'en' : 'th', false, scope === doc ? null : scope);
  };

  /* --- anchors: close the panel and respect the fixed header ------------- */
  on(doc, 'click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1); if (!id) return;
    var t = doc.getElementById(id); if (!t) return;
    e.preventDefault();
    closeMenu(false);
    t.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });

  LL.boot(doc);
  root.classList.add('is-ready');
})();
