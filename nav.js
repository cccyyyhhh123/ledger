/* nav.js — one frosted highlight for the whole menu.
 *
 * The menu lives on six separate pages, so a highlight that slides "from the
 * old item to the new one" has to survive a document swap. It does that by
 * writing the current page's item into sessionStorage before anything else,
 * and then, on the next page, putting the highlight back where it was and
 * animating it to the item you just landed on.
 *
 * Positions come from bounding rects rather than offsetLeft/offsetTop, which
 * are unreliable for inline boxes.
 */
(function () {
  var bar = document.querySelector('.nav__links');
  if (!bar) return;

  var links = Array.prototype.slice.call(bar.querySelectorAll('a'));
  if (!links.length) return;

  var ink = document.createElement('span');
  ink.className = 'nav__ink';
  ink.setAttribute('aria-hidden', 'true');
  bar.insertBefore(ink, bar.firstChild);

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LAST = 'deskNavLast';

  var current = bar.querySelector('a[aria-current="page"]');
  if (!current) return;

  function linkFor(href) {
    if (!href) return null;
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === href) return links[i];
    }
    return null;
  }

  function place(target, instant) {
    if (!target) return;
    var outer = bar.getBoundingClientRect();
    var rect = target.getBoundingClientRect();

    if (instant) {
      ink.style.transition = 'none';
      ink.style.width = rect.width + 'px';
      ink.style.height = rect.height + 'px';
      ink.style.transform = 'translate(' + (rect.left - outer.left) + 'px,' + (rect.top - outer.top) + 'px)';
      ink.style.opacity = '1';
      void ink.offsetWidth;          /* hold the transition off for this pass */
      ink.style.transition = '';     /* …then hand it back to the stylesheet */
      return;
    }

    ink.style.width = rect.width + 'px';
    ink.style.height = rect.height + 'px';
    ink.style.transform = 'translate(' + (rect.left - outer.left) + 'px,' + (rect.top - outer.top) + 'px)';
    ink.style.opacity = '1';
  }

  var previousHref = null;
  try { previousHref = sessionStorage.getItem(LAST); } catch (e) {}
  var previous = linkFor(previousHref);

  /* the page we came from is different from this one: start there, travel here */
  if (previous && previous !== current && !calm.matches) {
    place(previous, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { place(current); });
    });
  } else {
    place(current, true);
  }

  var currentHref = current.getAttribute('href');
  try { sessionStorage.setItem(LAST, currentHref); } catch (e) {}

  /* the font can arrive after the first paint and change every width */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (!previous || previous === current) place(current, true);
    });
  }

  /* a resize can reflow the menu under the highlight */
  window.addEventListener('resize', function () {
    place(bar.querySelector('a[aria-current="page"]') || current, true);
  });
})();
/* ---------- stale page guard ----------
 * GitHub Pages lets a browser keep an HTML page for ten minutes, which is
 * long enough to be shown a page that no longer exists. Every page carries
 * its build stamp; if the server disagrees, the page reloads once through a
 * URL that has the build in the query, so the fetch cannot come from cache.
 * The sessionStorage flag makes sure this happens at most once per build.
 */
(function () {
  var build = window.__DESK_BUILD__;
  if (!build) return;

  fetch('version.json', { cache: 'no-store' })
    .then(function (response) { return response.json(); })
    .then(function (info) {
      if (!info || !info.build || info.build === build) return;

      var key = 'deskBuildReloaded';
      try {
        if (sessionStorage.getItem(key) === info.build) return;
        sessionStorage.setItem(key, info.build);
      } catch (e) { return; }

      var url = new URL(window.location.href);
      url.searchParams.set('v', info.build);
      window.location.replace(url.toString());
    })
    .catch(function () { /* offline: keep what is on screen */ });
})();
/* ---------- light / dark ----------
 * One control, on every page, because the theme is a property of the site and
 * not of one screen. theme.js has already set the attribute in <head>, so this
 * only has to reflect the current mode and flip it.
 */
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav__mode';

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg>';

  function reflect(mode) {
    var light = mode === 'light';
    button.innerHTML = light ? MOON : SUN;
    button.setAttribute('aria-label', light ? 'Switch to dark' : 'Switch to light');
    button.title = light ? 'Dark' : 'Light';
  }

  var start = (window.DeskTheme && window.DeskTheme.mode) ? window.DeskTheme.mode() : 'dark';
  reflect(start);

  button.addEventListener('click', function () {
    var next = (document.documentElement.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
    if (window.DeskTheme) next = window.DeskTheme.setMode(next);
    else document.documentElement.setAttribute('data-theme', next);
    reflect(next);
  });

  /* a sibling of the menu: beside the links on desktop, beside the brand on a phone */
  nav.appendChild(button);
})();