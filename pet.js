/* pet.js — one small creature for the whole site.
 *
 * It used to live inside pet.html. Now every page loads this file and the pet
 * wanders across all of them: the same canvas, the same four sprite sheets, the
 * same memory of where it was standing. Pages that want controls talk to it
 * through window.DeskPet.
 */
(function () {
  if (window.DeskPet) return;

  var FRAME = 200;
  var SHEETS = {};
  var STATES = {
    /* deliberately unhurried: a desk pet should not fidget */
    idle:  { frames: 24, fps: 8, loop: true },
    happy: { frames: 12, fps: 11, loop: false, next: 'idle' },
    play:  { frames: 12, fps: 9, loop: false, next: 'idle' },
    sleep: { frames: 12, fps: 5, loop: true }
  };

  var LINES = [
    { en: 'You are doing fine.', cn: '你做得挺好。' },
    { en: 'Water. Now.', cn: '去喝口水。' },
    { en: 'Stretch? I will too.', cn: '伸个懒腰吧，我也伸。' },
    { en: 'One more page, then a break.', cn: '再看一页就休息。' },
    { en: 'I have been here all along.', cn: '我一直在这儿。' },
    { en: 'Tired is allowed.', cn: '累了就累着，允许的。' },
    { en: 'Focus. I will watch the clock.', cn: '你专注，我盯着钟。' },
    { en: 'Poke received.', cn: '戳收到了。' }
  ];

  var STORE = 'deskPet2';

  var state = 'idle';
  var frame = 0;
  var frameClock = 0;
  var last = 0;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* a phone gets a smaller creature: at 150px it sits on top of half the page */
  function narrow() { return window.innerWidth < 640; }
  var size = narrow() ? 96 : 120;
  function maxSize() { return narrow() ? 150 : 300; }
  var pos = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var facing = 1;
  var dragging = false;
  var dragOffset = { x: 0, y: 0 };
  var movedWhileDown = 0;
  var nextWanderAt = 0;
  var sleepAt = 0;
  var bubbleTimer = 0;
  var running = false;

  /* ---------- the bits it draws on ---------- */
  var canvas = document.createElement('canvas');
  canvas.className = 'petcanvas';
  canvas.id = 'pet';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Desk pet');
  canvas.width = 400;
  canvas.height = 400;

  var bubble = document.createElement('div');
  bubble.className = 'petbubble';
  bubble.hidden = true;
  bubble.innerHTML = '<span class="petbubble__en"></span><span class="petbubble__cn"></span>';
  var bubbleEn = bubble.firstChild;
  var bubbleCn = bubble.lastChild;

  /* the sprite is the only way into its page now, so let it be a link */
  canvas.setAttribute('role', 'link');
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label', 'Open the pet page');
  canvas.title = 'Pet — click for the page';
  canvas.addEventListener('click', function () { window.location.href = 'pet.html'; });
  canvas.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = 'pet.html';
    }
  });

  var menu = document.createElement('div');
  menu.className = 'petmenu';
  menu.hidden = true;
  [
    ['wander', 'Wander'],
    ['sleep', 'Sleep'],
    ['bigger', 'Bigger'],
    ['smaller', 'Smaller'],
    ['corner', 'Back to the corner'],
    ['hide', 'Put it away']
  ].forEach(function (item) {
    var button = document.createElement('button');
    button.type = 'button';
    button.dataset.act = item[0];
    button.textContent = item[1];
    menu.appendChild(button);
  });

  var listeners = [];

  function mount() {
    if (document.getElementById('pet')) return;
    document.body.appendChild(canvas);
    document.body.appendChild(bubble);
    document.body.appendChild(menu);

    load();
    if (!pos.x && !pos.y) {
      pos.x = narrow() ? 12 : 24;
      pos.y = Math.max(0, window.innerHeight - size - (narrow() ? 12 : 24));
    }
    target.x = pos.x;
    target.y = pos.y;
    clamp();
    place();

    var names = ['idle', 'happy', 'play', 'sleep'];
    var loaded = 0;
    names.forEach(function (name) {
      var image = new Image();
      image.onload = function () {
        SHEETS[name] = image;
        loaded += 1;
        if (loaded === names.length && !running) {
          running = true;
          setState('idle', true);
          last = performance.now();
          requestAnimationFrame(tick);
        }
      };
      image.onerror = function () { loaded += 1; };
      image.src = 'Images/pet/' + name + '.png';
    });

    wire();
    if (still) nextWanderAt = Infinity;
  }

  /* ---------- memory ---------- */
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE));
      if (!saved) return;
      if (typeof saved.size === 'number') size = Math.max(90, Math.min(maxSize(), saved.size));
      if (typeof saved.x === 'number' && typeof saved.y === 'number') {
        pos.x = saved.x; pos.y = saved.y;
      }
    } catch (e) {}
  }

  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        x: Math.round(pos.x), y: Math.round(pos.y), size: Math.round(size)
      }));
    } catch (e) {}
  }

  /* ---------- geometry ---------- */
  function clamp() {
    var maxX = Math.max(0, window.innerWidth - size);
    var maxY = Math.max(0, window.innerHeight - size);
    pos.x = Math.max(0, Math.min(maxX, pos.x));
    pos.y = Math.max(0, Math.min(maxY, pos.y));
    target.x = Math.max(0, Math.min(maxX, target.x));
    target.y = Math.max(0, Math.min(maxY, target.y));
  }

  function place() {
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.left = pos.x + 'px';
    canvas.style.top = pos.y + 'px';
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var backing = Math.round(size * dpr);
    if (canvas.width !== backing) {
      canvas.width = backing;
      canvas.height = backing;
    }
  }

  function placeBubble() {
    if (bubble.hidden) return;
    var width = bubble.offsetWidth || 180;
    var left = Math.max(8, Math.min(window.innerWidth - width - 8, pos.x + size / 2 - width / 2));
    var top = Math.max(8, pos.y - (bubble.offsetHeight || 44) - 10);
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  /* ---------- behaviour ---------- */
  function setState(name, silent) {
    if (!STATES[name]) return;
    state = name;
    frame = 0;
    frameClock = 0;
    sleepAt = name === 'sleep' ? 0 : performance.now() + 75000;
    if (!silent && name === 'happy') say();

    listeners.forEach(function (fn) { try { fn(name); } catch (e) {} });
    if (bubble.hidden) menu.hidden = true;
  }

  function say() {
    var line = LINES[Math.floor(Math.random() * LINES.length)];
    bubbleEn.textContent = line.en;
    bubbleCn.textContent = line.cn;
    bubble.hidden = false;
    placeBubble();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.hidden = true; }, 2600);
  }

  function wander() {
    var maxX = Math.max(0, window.innerWidth - size);
    var maxY = Math.max(0, window.innerHeight - size);
    var span = size * 5;
    target.x = Math.max(0, Math.min(maxX, pos.x + (Math.random() - 0.5) * span));
    target.y = Math.max(0, Math.min(maxY, pos.y + (Math.random() - 0.5) * span * 0.45));
    nextWanderAt = performance.now() + 3200 + Math.random() * 5400;
  }

  function resize(next) {
    size = Math.max(90, Math.min(maxSize(), next));
    clamp();
    place();
    persist();
  }

  function goHome() {
    pos.x = narrow() ? 12 : 24;
    pos.y = Math.max(0, window.innerHeight - size - (narrow() ? 12 : 24));
    target.x = pos.x;
    target.y = pos.y;
    facing = -1;
    clamp();
    place();
    persist();
  }

  /* ---------- drawing ---------- */
  var ctx = canvas.getContext('2d');

  function draw() {
    var sheet = SHEETS[state];
    if (!sheet) return;
    var w = canvas.width;
    var h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (facing < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sheet, frame * FRAME, 0, FRAME, FRAME, 0, 0, w, h);
    ctx.restore();
  }

  function tick(now) {
    var dt = Math.min(64, now - last);
    last = now;

    var def = STATES[state];
    frameClock += dt;
    var step = 1000 / def.fps;
    while (frameClock >= step) {
      frameClock -= step;
      frame += 1;
      if (frame >= def.frames) {
        if (def.loop) frame = 0;
        else { setState(def.next || 'idle', true); break; }
      }
    }

    if (!dragging && !still && state !== 'sleep') {
      var dx = target.x - pos.x;
      var dy = target.y - pos.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        var rate = 0.032 * dt;
        pos.x += dx * Math.min(1, rate);
        pos.y += dy * Math.min(1, rate);
        if (Math.abs(dx) > 4) facing = dx > 0 ? 1 : -1;
      } else if (now > nextWanderAt) {
        wander();
      }
    }

    if (!still && state !== 'sleep' && sleepAt && now > sleepAt) setState('sleep', true);

    place();
    draw();
    if (!bubble.hidden) placeBubble();
    requestAnimationFrame(tick);
  }

  /* ---------- input ---------- */
  function wire() {
    canvas.addEventListener('pointerdown', function (event) {
      dragging = true;
      movedWhileDown = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      dragOffset.x = event.clientX - pos.x;
      dragOffset.y = event.clientY - pos.y;
      if (state === 'sleep') setState('happy', true);
      sleepAt = performance.now() + 75000;
    });

    canvas.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      movedWhileDown += Math.abs(event.movementX || 0) + Math.abs(event.movementY || 0);
      pos.x = event.clientX - dragOffset.x;
      pos.y = event.clientY - dragOffset.y;
      clamp();
      place();
    });

    canvas.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove('is-dragging');
      persist();
      if (movedWhileDown < 6) setState('happy');
      target.x = pos.x;
      target.y = pos.y;
      nextWanderAt = performance.now() + 3600;
    });

    canvas.addEventListener('dblclick', function () { setState('play'); });

    canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      resize(size + (event.deltaY < 0 ? 14 : -14));
    }, { passive: false });

    canvas.addEventListener('contextmenu', function (event) {
      event.preventDefault();
      menu.hidden = false;
      menu.style.left = Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 8) + 'px';
      menu.style.top = Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 8) + 'px';
    });

    document.addEventListener('click', function (event) {
      if (!menu.hidden && !menu.contains(event.target)) menu.hidden = true;
    });

    menu.addEventListener('click', function (event) {
      var button = event.target.closest('[data-act]');
      if (!button) return;
      menu.hidden = true;
      var act = button.dataset.act;
      if (act === 'wander') { setState('idle'); wander(); }
      if (act === 'sleep') setState('sleep');
      if (act === 'bigger') resize(size + 20);
      if (act === 'smaller') resize(size - 20);
      if (act === 'corner') goHome();
      if (act === 'hide') hide();
    });

    window.addEventListener('resize', function () {
      if (size > maxSize()) size = maxSize();
      clamp();
      place();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) last = performance.now();
    });
  }

  function hide() {
    try { localStorage.setItem('deskPetHidden', '1'); } catch (e) {}
    canvas.remove();
    bubble.remove();
    menu.remove();
  }

  function show() {
    try { localStorage.removeItem('deskPetHidden'); } catch (e) {}
    if (!document.getElementById('pet')) mount();
  }

  /* ---------- the handle other pages use ---------- */
  window.DeskPet = {
    state: function () { return state; },
    size: function () { return size; },
    setState: function (name) { setState(name); if (name === 'idle') wander(); },
    resize: function (value) { resize(value); },
    goHome: goHome,
    show: show,
    hide: hide,
    hidden: function () {
      try { return localStorage.getItem('deskPetHidden') === '1'; } catch (e) { return false; }
    },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  var putAway = false;
  try { putAway = localStorage.getItem('deskPetHidden') === '1'; } catch (e) {}

  if (!putAway) {
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
  }
})();
