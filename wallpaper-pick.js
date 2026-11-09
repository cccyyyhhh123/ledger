/* wallpaper-pick.js — turn a wallpaper from the local library into the site's
 * wallpaper.
 *
 * The library lives behind the small service on 127.0.0.1:8788, which can only
 * be reached when the page itself is served from there. Every caller therefore
 * has to cope with the service being absent, and so does this file.
 *
 *   DeskWallpaper.load().then(items => ...)          list the library
 *   DeskWallpaper.publish(item, cb)                  make it the site wallpaper
 *
 * A video cannot be a CSS background on every page, so what gets published is
 * one frame of it; the same call handles a scene wallpaper's preview.
 */
(function (global) {
  'use strict';

  var BASE = '';
  var KEY_LIVE = 'deskWallpaperLive';

  function api(path, options) {
    return fetch(BASE + path, options || {}).then(function (response) {
      if (!response.ok) throw new Error('http ' + response.status);
      return response.json();
    });
  }

  function load() {
    return api('/api/wallpapers').then(function (data) {
      return (data && data.items) || [];
    });
  }

  function previewUrl(item) {
    return BASE + '/preview?id=' + encodeURIComponent(item.id);
  }

  function videoUrl(item) {
    return BASE + '/video?id=' + encodeURIComponent(item.id);
  }

  function draw(theme, source, width, height, title, done) {
    if (!width || !height || width < 8 || height < 8) { done(null); return; }

    var scale = Math.min(1, 1600 / Math.max(width, height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(8, Math.round(width * scale));
    canvas.height = Math.max(8, Math.round(height * scale));
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);

    var probe = document.createElement('canvas');
    probe.width = 24;
    probe.height = 24;
    var pctx = probe.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(canvas, 0, 0, 24, 24);
    var data = pctx.getImageData(0, 0, 24, 24).data;
    var sum = 0;
    for (var i = 0; i < data.length; i += 4) {
      sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
    var lum = sum / (data.length / 4);
    var url = canvas.toDataURL('image/jpeg', 0.72);

    /* a black frame means the wrong moment was grabbed — several previews open
       on a black frame, and publishing it would hide the page */
    if (url.length < 2000 || lum < 0.02) { done(null); return; }

    theme.setWallpaper(url, title, lum);
    done(url);
  }

  function publish(item, done) {
    var finished = false;
    function finish(url) {
      if (finished) return;
      finished = true;
      if (done) done(url);
    }

    var theme = global.DeskTheme;

    if (!item || !theme) { finish(null); return; }

    if (!item.hasVideo) {
      var still = new Image();
      still.onload = function () { draw(theme, still, still.naturalWidth, still.naturalHeight, item.title, finish); };
      still.onerror = function () { finish(null); };
      still.src = previewUrl(item);
      return;
    }

    var poster = document.createElement('video');
    poster.muted = true;
    poster.playsInline = true;
    poster.preload = 'auto';
    poster.src = videoUrl(item);
    var guard = setTimeout(function () { finish(null); }, 8000);

    poster.addEventListener('loadedmetadata', function () {
      var at = Math.min(3, Math.max(0.5, (poster.duration || 6) * 0.35));
      try { poster.currentTime = at; } catch (e) { /* some codecs refuse a seek */ }
    });
    poster.addEventListener('seeked', function () {
      clearTimeout(guard);
      draw(theme, poster, poster.videoWidth, poster.videoHeight, item.title, finish);
    });
    poster.addEventListener('error', function () { clearTimeout(guard); finish(null); });
    poster.load();
  }

  /* the wallpaper page keeps the chosen one on the service, so a pick made here
     is the same pick there */
  /* the still is what every page can show; the video is what the home page can
     play when the service is in front of it */
  function setLive(item) {
    try {
      if (item && item.hasVideo) localStorage.setItem(KEY_LIVE, JSON.stringify({ id: item.id, title: item.title }));
      else localStorage.removeItem(KEY_LIVE);
    } catch (e) { /* private mode */ }
    window.dispatchEvent(new CustomEvent('deskwallpaper:live'));
  }

  function remember(id) {
    api('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: id })
    }).catch(function () { /* the service may be gone; not fatal */ });
  }

  global.DeskWallpaper = {
    load: load,
    publish: publish,
    remember: remember,
    setLive: setLive,
    previewUrl: previewUrl,
    videoUrl: videoUrl
  };
})(window);
