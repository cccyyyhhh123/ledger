/* elastic-slider.js — a volume slider that stretches while you drag.
 *
 * The visual is the whole point: the track thickens, the filled part stretches
 * a little wider than the gap it occupies, and everything springs back when you
 * let go. It behaves like a real slider (click to jump, drag, arrow keys,
 * Home/End) and reports values through onChange.
 *
 *   ElasticSlider.mount(element, {
 *     value, min, max, step, onChange
 *   })
 */
(function (global) {
  'use strict';

  function mount(root, options) {
    var opts = options || {};
    var min = opts.min == null ? 0 : opts.min;
    var max = opts.max == null ? 100 : opts.max;
    var step = opts.step || 1;
    var value = clamp(opts.value == null ? 50 : opts.value, min, max);

    root.classList.add('es');
    if (opts.single) root.classList.add('es--single');

    /* the reference this follows has one badge on the left and nothing on the
       right, so the two speaker icons become optional */
    var leftIcon = opts.badge === false
      ? ''
      : (opts.single
        ? '<span class="es__icon es__icon--badge" aria-hidden="true">' + iconMusic() + '</span>'
        : '<span class="es__icon" aria-hidden="true">' + iconLow() + '</span>');

    root.innerHTML = leftIcon +
      '<span class="es__rail" role="slider" tabindex="0">' +
        '<span class="es__track"></span>' +
        '<span class="es__fill"></span>' +
        '<span class="es__thumb"></span>' +
        '<span class="es__bubble" aria-hidden="true"></span>' +
      '</span>' +
      (opts.single ? '' : '<span class="es__icon" aria-hidden="true">' + iconHigh() + '</span>');

    var rail = root.querySelector('.es__rail');
    var track = root.querySelector('.es__track');
    var fill = root.querySelector('.es__fill');
    var thumb = root.querySelector('.es__thumb');
    var bubble = root.querySelector('.es__bubble');

    var dragging = false;
    var stretch = 0;        /* 0 = resting, 1 = fully stretched while dragging */
    var velocity = 0;
    var raf = 0;
    var lastTime = 0;

    rail.setAttribute('aria-valuemin', String(min));
    rail.setAttribute('aria-valuemax', String(max));
    rail.setAttribute('aria-valuenow', String(value));
    rail.setAttribute('aria-label', opts.label || 'Volume');

    function clamp(next, low, high) { return Math.min(high, Math.max(low, next)); }

    function ratio() { return (value - min) / (max - min); }

    function paint() {
      var percent = (ratio() * 100).toFixed(2) + '%';
      fill.style.width = percent;
      thumb.style.left = percent;
      bubble.style.left = percent;
      bubble.textContent = String(Math.round(value));

      /* the elastic part: a little extra width and height while held down */
      var grow = 1 + stretch * 0.5;
      var lift = 1 + stretch * 0.18;
      track.style.transform = 'translateY(-50%) scaleY(' + lift.toFixed(3) + ')';
      fill.style.transform = 'translateY(-50%) scaleY(' + (lift * 0.92).toFixed(3) + ') scaleX(' + grow.toFixed(3) + ')';
      thumb.style.transform = 'translate(-50%, -50%) scale(' + (1 + stretch * 0.18).toFixed(3) + ', ' + (1 - stretch * 0.18).toFixed(3) + ')';
      bubble.style.opacity = String(stretch);
      bubble.style.transform = 'translate(-50%, ' + (-8 - stretch * 8).toFixed(1) + 'px)';
    }

    function spring(timestamp) {
      if (!lastTime) lastTime = timestamp;
      var dt = Math.min(0.05, (timestamp - lastTime) / 1000);
      lastTime = timestamp;

      var target = dragging ? 1 : 0;
      /* underdamped, so it overshoots and settles */
      velocity += ((target - stretch) * 60 - velocity * 9) * dt;
      stretch += velocity * dt;

      if (stretch < -0.12) { stretch = -0.12; velocity = 0; }
      paint();

      if (dragging || Math.abs(target - stretch) > 0.002 || Math.abs(velocity) > 0.01) {
        raf = global.requestAnimationFrame(spring);
      } else {
        stretch = target;
        velocity = 0;
        paint();
        raf = 0;
      }
    }

    function wake() {
      if (!raf) {
        lastTime = 0;
        raf = global.requestAnimationFrame(spring);
      }
    }

    function setFromClientX(clientX) {
      var box = rail.getBoundingClientRect();
      var next = clamp((clientX - box.left) / box.width, 0, 1);
      setValue(min + next * (max - min));
    }

    function setValue(next, silent) {
      var stepped = Math.round(next / step) * step;
      stepped = clamp(Math.round(stepped * 1000) / 1000, min, max);
      if (stepped === value) {
        paint();
        return;
      }
      value = stepped;
      rail.setAttribute('aria-valuenow', String(value));
      paint();
      if (!silent && typeof opts.onChange === 'function') opts.onChange(value);
    }

    rail.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      rail.setPointerCapture(event.pointerId);
      dragging = true;
      wake();
      setFromClientX(event.clientX);
    });

    rail.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      setFromClientX(event.clientX);
    });

    function release(event) {
      if (!dragging) return;
      dragging = false;
      if (event && event.pointerId != null && rail.hasPointerCapture(event.pointerId)) {
        rail.releasePointerCapture(event.pointerId);
      }
      wake();
    }
    rail.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);

    rail.addEventListener('keydown', function (event) {
      var big = (max - min) / 10;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); setValue(value + step); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); setValue(value - step); }
      else if (event.key === 'PageUp') { event.preventDefault(); setValue(value + big); }
      else if (event.key === 'PageDown') { event.preventDefault(); setValue(value - big); }
      else if (event.key === 'Home') { event.preventDefault(); setValue(min); }
      else if (event.key === 'End') { event.preventDefault(); setValue(max); }
    });

    rail.addEventListener('wheel', function (event) {
      if (Math.abs(event.deltaY) < 2) return;
      event.preventDefault();
      setValue(value + (event.deltaY < 0 ? step : -step));
    }, { passive: false });

    paint();

    return {
      get value() { return value; },
      set: function (next) { setValue(next); }
    };
  }

  function iconMusic() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 17V6l10-2v11"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>';
  }

  function iconLow() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 9v6h3l5 4V5L7 9z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/></svg>';
  }

  function iconHigh() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 9v6h3l5 4V5L7 9z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  }

  global.ElasticSlider = { mount: mount };
})(window);
