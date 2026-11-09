/* wallpaper-live.js — play the chosen video wallpaper behind a page.
 *
 * The site wallpaper itself can only be a still, because a picture in
 * localStorage is the only thing every page can read. A video needs the local
 * service, which is same-origin only: this file therefore asks /api/version
 * first and quietly does nothing on the published site.
 *
 * Stored key: deskWallpaperLive = { id, title }
 */
(function () {
  'use strict';

  var KEY = 'deskWallpaperLive';
  var chosen = null;
  try { chosen = JSON.parse(localStorage.getItem(KEY)); } catch (e) { chosen = null; }
  if (!chosen || !chosen.id) return;

  function mount() {
    fetch('/api/version', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (info) {
        if (!info || !info.ok) return;   // published site: no service, no video

        var video = document.createElement('video');
        video.className = 'wp-live';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('aria-hidden', 'true');
        video.preload = 'auto';
        video.src = '/video?id=' + encodeURIComponent(chosen.id);

        var scrim = document.createElement('div');
        scrim.className = 'wp-live__scrim';
        scrim.setAttribute('aria-hidden', 'true');

        document.body.insertBefore(scrim, document.body.firstChild);
        document.body.insertBefore(video, document.body.firstChild);
        document.documentElement.setAttribute('data-wallpaper-live', '1');

        function sync() {
          var wanted = !document.hidden && !document.documentElement.hasAttribute('data-paused');
          if (wanted) video.play().catch(function () {});
          else video.pause();
        }

        video.addEventListener('canplay', function () {
          document.documentElement.setAttribute('data-wallpaper-live', 'ready');
          sync();
        });
        video.addEventListener('error', function () {
          document.documentElement.removeAttribute('data-wallpaper-live');
          video.remove();
          scrim.remove();
        });
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('blur', sync);
        window.addEventListener('focus', sync);
      })
      .catch(function () { /* no service: the still wallpaper stays */ });
  }

  function mountCurrent() {
    try { chosen = JSON.parse(localStorage.getItem(KEY)); } catch (e) { chosen = null; }
    var old = document.querySelector('.wp-live');
    if (old) old.remove();
    var oldScrim = document.querySelector('.wp-live__scrim');
    if (oldScrim) oldScrim.remove();
    document.documentElement.removeAttribute('data-wallpaper-live');
    if (chosen && chosen.id) mount();
  }

  window.addEventListener('deskwallpaper:live', mountCurrent);

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
