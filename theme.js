/* theme.js — the site's colours follow an image you pick.
 *
 * A web page cannot read the desktop wallpaper, but it can read an image file
 * the user chooses. The colours are pulled from it on a canvas, knocked down
 * into a dark palette that stays readable, and written onto :root as CSS
 * custom properties — so every page picks them up.
 *
 * Loaded in <head> so the first paint already has the right colours.
 */
(function (global) {
  'use strict';

  var KEY = 'deskTheme';

  var PRESETS = {
    violet: {
      name: 'Violet',
      bg: '#0b0b10', panel: '#121218', panel2: '#16161d',
      accent: '#a78bfa', accent2: '#67e8f9'
    },
    ember: {
      name: 'Ember',
      bg: '#100b0a', panel: '#181110', panel2: '#1e1613',
      accent: '#fb923c', accent2: '#fca5a5'
    },
    forest: {
      name: 'Forest',
      bg: '#0a0f0c', panel: '#111814', panel2: '#16201a',
      accent: '#4ade80', accent2: '#a3e635'
    },
    ocean: {
      name: 'Ocean',
      bg: '#080f14', panel: '#0f1a22', panel2: '#13222c',
      accent: '#38bdf8', accent2: '#a5f3fc'
    },
    rose: {
      name: 'Rose',
      bg: '#110b10', panel: '#191016', panel2: '#20141b',
      accent: '#f472b6', accent2: '#fda4af'
    }
  };

  function hexToRgb(hex) {
    var value = hex.replace('#', '');
    if (value.length === 3) value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHex(rgb) {
    function part(value) {
      var clamped = Math.max(0, Math.min(255, Math.round(value)));
      return (clamped < 16 ? '0' : '') + clamped.toString(16);
    }
    return '#' + part(rgb.r) + part(rgb.g) + part(rgb.b);
  }

  function rgbToHsl(rgb) {
    var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var d = max - min;
    var h = 0, s = 0;

    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, l: l };
  }

  function hslToHex(h, s, l) {
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var rgb;

    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];

    return rgbToHex({ r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 });
  }

  /* the theme object the CSS needs: solids, two glows and the nav veil */
  function fromColors(bgHex, accentHex, accent2Hex) {
    var bg = rgbToHsl(hexToRgb(bgHex));
    var panel = rgbToHex(hexToRgb(hslToHex(bg.h, bg.s * 0.8, bg.l + 0.032)));
    var panel2 = rgbToHex(hexToRgb(hslToHex(bg.h, bg.s * 0.8, bg.l + 0.055)));
    var base = hexToRgb(bgHex);

    function veil(alpha) {
      return 'rgba(' + base.r + ', ' + base.g + ', ' + base.b + ', ' + alpha + ')';
    }
    function glow(hex, alpha) {
      var rgb = hexToRgb(hex);
      return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
    }

    return {
      bg: bgHex,
      panel: panel,
      panel2: panel2,
      accent: accentHex,
      accent2: accent2Hex,
      glowA: glow(accentHex, 0.16),
      glowB: glow(accent2Hex, 0.10),
      nav: [veil(0.94), veil(0.82), veil(0.42), veil(0)]
    };
  }

  /* one colour in, a whole palette out: the background is a very dark wash of
     the same hue, and the second accent is that hue nudged round the wheel. */
  function fromAccent(hex) {
    var hsl = rgbToHsl(hexToRgb(hex));
    var bg = hslToHex(hsl.h, Math.max(0.10, Math.min(0.32, hsl.s * 0.45)), 0.055);
    var accent2 = hslToHex((hsl.h + 34) % 360,
      Math.max(0.55, Math.min(0.9, hsl.s)),
      Math.max(0.62, Math.min(0.84, hsl.l + 0.12)));
    var theme = fromColors(bg, hex, accent2);
    theme.name = 'Custom';
    theme.key = 'custom';
    theme.custom = true;
    return theme;
  }

  function preset(name) {
    var source = PRESETS[name] || PRESETS.violet;
    var theme = fromColors(source.bg, source.accent, source.accent2);
    theme.name = source.name;
    theme.key = PRESETS[name] ? name : 'violet';
    return theme;
  }

  /* A palette carries a hue, not a mode. If the page is in light mode the same
     palette has to be turned into a light one — otherwise a dark wallpaper
     gives dark panels with dark text, and nothing is readable. */
  function apply(theme) {
    if (!theme || !theme.bg) return;

    var root = document.documentElement;
    var light = root.getAttribute('data-theme') === 'light';

    var bgHsl = rgbToHsl(hexToRgb(theme.bg));
    var accentHsl = rgbToHsl(hexToRgb(theme.accent));
    var accent2Hsl = rgbToHsl(hexToRgb(theme.accent2 || theme.accent));

    var accent = theme.accent;
    var accent2 = theme.accent2 || theme.accent;

    if (light) {
      /* paper, white cards, accents dark enough to read on white */
      var paper = hslToHex(bgHsl.h, Math.min(0.24, bgHsl.s * 1.4), 0.965);
      accent = hslToHex(accentHsl.h, Math.max(0.5, Math.min(0.8, accentHsl.s)), 0.44);
      accent2 = hslToHex(accent2Hsl.h, Math.max(0.45, Math.min(0.75, accent2Hsl.s)), 0.42);

      root.style.setProperty('--bg', paper);
      root.style.setProperty('--panel', '#ffffff');
      root.style.setProperty('--panel-2', hslToHex(bgHsl.h, Math.min(0.20, bgHsl.s), 0.945));
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-2', accent2);
      root.style.setProperty('--glow-a', glowOf(accent, 0.10));
      root.style.setProperty('--glow-b', glowOf(accent2, 0.07));
      root.style.setProperty('--panel-a', veilOf('#ffffff', 0.80));
      root.style.setProperty('--panel-2-a', veilOf(hslToHex(bgHsl.h, Math.min(0.20, bgHsl.s), 0.945), 0.78));
      root.style.setProperty('--nav-a', veilOf(paper, 0.96));
      root.style.setProperty('--nav-b', veilOf(paper, 0.86));
      root.style.setProperty('--nav-c', veilOf(paper, 0.46));
      root.style.setProperty('--nav-d', veilOf(paper, 0));
      root.style.setProperty('color-scheme', 'light');
    } else {
      root.style.setProperty('--bg', theme.bg);
      root.style.setProperty('--panel', theme.panel);
      root.style.setProperty('--panel-2', theme.panel2);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-2', accent2);
      root.style.setProperty('--glow-a', theme.glowA || glowOf(accent, 0.16));
      root.style.setProperty('--glow-b', theme.glowB || glowOf(accent2, 0.10));
      root.style.setProperty('--panel-a', veilOf(theme.panel, 0.66));
      root.style.setProperty('--panel-2-a', veilOf(theme.panel2, 0.72));
      if (theme.nav) {
        root.style.setProperty('--nav-a', theme.nav[0]);
        root.style.setProperty('--nav-b', theme.nav[1]);
        root.style.setProperty('--nav-c', theme.nav[2]);
        root.style.setProperty('--nav-d', theme.nav[3]);
      }
      root.style.setProperty('color-scheme', 'dark');
    }

    current = theme;
  }

  function glowOf(hex, alpha) {
    var rgb = hexToRgb(hex);
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
  }

  function veilOf(hex, alpha) {
    var rgb = hexToRgb(hex);
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
  }

  function save(theme) {
    try { localStorage.setItem(KEY, JSON.stringify(theme)); } catch (e) {}
    apply(theme);
  }

  function clear() {
    current = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    var root = document.documentElement;
    ['--bg', '--panel', '--panel-2', '--accent', '--accent-2',
     '--glow-a', '--glow-b', '--nav-a', '--nav-b', '--nav-c', '--nav-d'].forEach(function (name) {
      root.style.removeProperty(name);
    });
  }

  /* pull a dark palette out of a picture */
  function extract(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();

      image.onload = function () {
        try {
          var size = 72;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, 0, 0, size, size);
          var data = ctx.getImageData(0, 0, size, size).data;

          var buckets = {};
          for (var i = 0; i < data.length; i += 4) {
            var alpha = data[i + 3];
            if (alpha < 128) continue;
            var key = (data[i] >> 4) + ':' + (data[i + 1] >> 4) + ':' + (data[i + 2] >> 4);
            if (!buckets[key]) {
              buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
            }
            var bucket = buckets[key];
            bucket.r += data[i];
            bucket.g += data[i + 1];
            bucket.b += data[i + 2];
            bucket.n += 1;
          }

          var entries = Object.keys(buckets).map(function (key) {
            var bucket = buckets[key];
            var rgb = { r: bucket.r / bucket.n, g: bucket.g / bucket.n, b: bucket.b / bucket.n };
            var hsl = rgbToHsl(rgb);
            return { rgb: rgb, hsl: hsl, n: bucket.n, hex: rgbToHex(rgb) };
          }).sort(function (a, b) { return b.n - a.n; });

          if (!entries.length) { reject(new Error('empty image')); return; }

          /* the background is the darkest of the common colours */
          var darkest = entries.slice(0, 12).sort(function (a, b) { return a.hsl.l - b.hsl.l; })[0];
          var bgHsl = darkest.hsl;
          var bg = hslToHex(bgHsl.h, Math.min(0.35, bgHsl.s), Math.min(0.075, Math.max(0.03, bgHsl.l * 0.5)));

          /* the accents are the most colourful entries that are not the background */
          var colourful = entries
            .filter(function (entry) { return entry.hsl.s > 0.18 && Math.abs(entry.hsl.l - bgHsl.l) > 0.08; })
            .sort(function (a, b) { return (b.hsl.s * b.n) - (a.hsl.s * a.n); });

          if (!colourful.length) {
            colourful = entries.slice().sort(function (a, b) { return b.hsl.s - a.hsl.s; });
          }

          var accentHex = hslToHex(colourful[0].hsl.h, Math.max(0.55, Math.min(0.9, colourful[0].hsl.s)),
            Math.max(0.55, Math.min(0.72, 0.62)));
          var second = colourful.find(function (entry) {
            return Math.abs(entry.hsl.h - colourful[0].hsl.h) > 40;
          }) || colourful[colourful.length - 1];
          var accent2Hex = hslToHex(second.hsl.h, Math.max(0.5, Math.min(0.85, second.hsl.s)),
            Math.max(0.55, Math.min(0.75, 0.66)));

          var theme = fromColors(bg, accentHex, accent2Hex);
          theme.name = 'From your image';
          theme.key = 'image';
          resolve(theme);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('could not read the image'));
      };

      image.src = url;
    });
  }

  /* ---------- light or dark ----------
     The palette variables are the same in both modes; only their values move.
     The mode is read here, in <head>, so the first paint is already right. */
  var MODE_KEY = 'deskMode';

  function currentMode() {
    try {
      var saved = localStorage.getItem(MODE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'dark';
  }

  var current = null;

  function setMode(mode) {
    var value = mode === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', value);
    try { localStorage.setItem(MODE_KEY, value); } catch (e) {}
    /* the palette has to be recomputed for the new mode, not just left as is */
    if (current) apply(current);
    return value;
  }

  /* ---------- the wallpaper itself ----------
     The palette only ever took colours from the image. This keeps a small copy
     of it (max 1600px wide, JPEG) and paints it behind the page, with a scrim
     made of the theme background so text keeps its contrast. */
  var WALL_KEY = 'deskWallpaper';

  /* The image becomes part of the body's own background stack. A separate
     fixed layer would sit behind the body background and never be seen, no
     matter what z-index it is given. */
  function paintWallpaper(url, lum) {
    var root = document.documentElement;
    if (!url) {
      root.style.removeProperty('--wallpaper-url');
      root.style.removeProperty('--wp-dim');
      root.removeAttribute('data-wallpaper');
      return;
    }
    var level = typeof lum === 'number' && isFinite(lum) ? lum : 0.45;
    /* 0.42 for a dark photo, up to 0.86 for a white one */
    var dim = Math.max(0.42, Math.min(0.86, 0.40 + level * 0.52));
    root.style.setProperty('--wallpaper-url', 'url("' + url + '")');
    root.style.setProperty('--wp-dim', dim.toFixed(2));
    root.setAttribute('data-wallpaper', '');
  }

  function setWallpaper(url, name, lum) {
    try { localStorage.setItem(WALL_KEY, JSON.stringify({ url: url, name: name || '', lum: lum })); } catch (e) {}
    paintWallpaper(url, lum);
    return true;
  }

  function clearWallpaper() {
    try { localStorage.removeItem(WALL_KEY); } catch (e) {}
    paintWallpaper(null);
  }

  function savedWallpaper() {
    try {
      var value = JSON.parse(localStorage.getItem(WALL_KEY));
      return value && value.url ? value : null;
    } catch (e) { return null; }
  }

  /* shrink before storing: localStorage is small and a 6 MB photo would not fit */
  function prepareWallpaper(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          try {
            var max = 2200;
            var scale = Math.min(1, max / Math.max(image.width, image.height));
            var canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            var ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            /* mean luminance decides how hard the scrim has to be: a white
               photo behind dark-mode text needs far more dimming than a dark one */
            var probe = document.createElement('canvas');
            probe.width = 24;
            probe.height = 24;
            var pctx = probe.getContext('2d', { willReadFrequently: true });
            pctx.drawImage(image, 0, 0, 24, 24);
            var px = pctx.getImageData(0, 0, 24, 24).data;
            var sum = 0;
            for (var i = 0; i < px.length; i += 4) {
              sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
            }
            var lum = sum / (px.length / 4);

            resolve({ url: canvas.toDataURL('image/jpeg', 0.72), lum: lum });
          } catch (e) { reject(e); }
        };
        image.onerror = reject;
        image.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* put the saved one back before the first paint */
  (function () {
    var saved = savedWallpaper();
    if (!saved) return;
    var boot = function () { paintWallpaper(saved.url, saved.lum); };
    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
  })();
  /* apply whatever was saved, before the page paints */
  setMode(currentMode());

  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.bg) apply(saved);
  } catch (e) {}

  global.DeskTheme = {
    apply: apply,
    mode: currentMode,
    setMode: setMode,
    save: save,
    clear: clear,
    extract: extract,
    preset: preset,
    fromAccent: fromAccent,
    setWallpaper: setWallpaper,
    clearWallpaper: clearWallpaper,
    wallpaper: savedWallpaper,
    prepareWallpaper: prepareWallpaper,
    PRESETS: PRESETS
  };
})(window);
