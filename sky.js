/* sky.js — the night behind the tarot spread.
 *
 * One canvas: a slow drift of small stars, three constellations in faint
 * gold, and a soft moon halo in the corner. It is scenery, not part of the
 * reading — the point is that the spread sits on a night instead of a flat
 * panel. Nothing animates when the browser asks for reduced motion.
 */
(function () {
  var canvas = document.getElementById('sky');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  var width = 0;
  var height = 0;
  var stars = [];
  var raf = 0;

  /* constellations as fractions of the viewport, so their shape survives a resize */
  var CONSTELLATIONS = [
    {
      at: { x: 0.04, y: 0.40 }, scale: 0.18,
      points: [[0, 0.42], [0.16, 0.30], [0.34, 0.36], [0.46, 0.52], [0.66, 0.50], [0.82, 0.66], [0.80, 0.86]]
    },
    {
      at: { x: 0.78, y: 0.10 }, scale: 0.16,
      points: [[0.10, 0], [0.34, 0.06], [0.28, 0.44], [0.44, 0.50], [0.60, 0.56], [0.52, 0.88], [0.16, 0.94]]
    },
    {
      at: { x: 0.44, y: 0.86 }, scale: 0.14,
      points: [[0, 0.30], [0.24, 0.62], [0.48, 0.24], [0.72, 0.64], [1, 0.32]]
    }
  ];

  function seed() {
    var count = Math.round((width * height) / 11000);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.15 + 0.3,
        alpha: Math.random() * 0.5 + 0.22,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.4,
        drift: 0.1 + Math.random() * 0.5          /* pixels per second */
      });
    }
  }

  function resize() {
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seed();
    if (calm.matches) draw(0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    /* the moon: a halo, no disc */
    var halo = ctx.createRadialGradient(
      width * 0.8, height * 0.14, 0,
      width * 0.8, height * 0.14, Math.max(width, height) * 0.36
    );
    halo.addColorStop(0, 'rgba(196, 181, 253, 0.14)');
    halo.addColorStop(0.42, 'rgba(147, 130, 220, 0.05)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    var seconds = time / 1000;

    /* the drift of small stars */
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      var twinkle = 0.6 + 0.4 * Math.sin(seconds * star.speed + star.phase);
      var x = (star.x + seconds * star.drift) % (width + 20);
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.r > 1.1 ? '#f4f1ff' : '#cfd0f5';
      ctx.beginPath();
      ctx.arc(x < 0 ? x + width : x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* the constellations */
    ctx.globalAlpha = 1;
    CONSTELLATIONS.forEach(function (group) {
      var originX = group.at.x * width;
      var originY = group.at.y * height;
      var span = group.scale * Math.min(width, height);

      var points = group.points.map(function (point) {
        return [originX + point[0] * span, originY + point[1] * span];
      });

      ctx.strokeStyle = 'rgba(233, 213, 168, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      points.forEach(function (point, index) {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.stroke();

      points.forEach(function (point, index) {
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(seconds * 0.9 + index);
        ctx.fillStyle = '#f6ecd8';
        ctx.beginPath();
        ctx.arc(point[0], point[1], 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.globalAlpha = 1;
  }

  function loop(time) {
    draw(time);
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);

  if (!calm.matches) {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(loop);
      }
    });
  }
})();
