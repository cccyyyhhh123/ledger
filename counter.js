/* counter.js — a number that rolls from one value to the next.
 *
 * Each digit is a column of 0–9 stacked on top of each other; showing a value
 * means sliding the column to that digit, and the transition does the rest, so
 * 14:09 → 14:10 rolls the last two digits instead of swapping a string.
 *
 *   var clock = Counter.mount(host, { digits: 4, separatorAt: 2 });
 *   clock.set('1410');
 */
(function (global) {
  'use strict';

  function mount(host, options) {
    var opts = options || {};
    var digits = opts.digits || 4;
    var separatorAt = opts.separatorAt == null ? -1 : opts.separatorAt;

    host.classList.add('ct');
    host.replaceChildren();

    var strips = [];
    for (var i = 0; i < digits; i++) {
      var column = document.createElement('span');
      column.className = 'ct__col';

      var strip = document.createElement('span');
      strip.className = 'ct__strip';
      for (var d = 0; d <= 9; d++) {
        var cell = document.createElement('span');
        cell.className = 'ct__digit';
        cell.textContent = String(d);
        strip.appendChild(cell);
      }

      column.appendChild(strip);

      /* the tile look: the window stays exactly one digit tall, and the box
         around it is a separate element so padding cannot break the window */
      if (opts.tile) {
        var tile = document.createElement('span');
        tile.className = 'ct__tile';
        tile.appendChild(column);
        host.appendChild(tile);
      } else {
        host.appendChild(column);
      }

      strips.push(strip);

      if (separatorAt > 0 && i === separatorAt - 1) {
        var separator = document.createElement('span');
        separator.className = 'ct__sep' + (opts.blink ? ' is-blink' : '');
        separator.textContent = opts.separator || ':';
        host.appendChild(separator);
      }
    }

    var current = '';

    function set(value) {
      var text = String(value).replace(/\D/g, '');
      while (text.length < digits) text = '0' + text;
      if (text === current) return;
      current = text;

      for (var index = 0; index < digits; index++) {
        var digit = Number(text.charAt(index)) || 0;
        strips[index].style.transform = 'translateY(' + (-digit * 10) + '%)';
      }

      host.setAttribute('aria-label', opts.label ? opts.label + ' ' + text : text);
    }

    return {
      set: set,
      get value() { return current; }
    };
  }

  global.Counter = { mount: mount };
})(window);
