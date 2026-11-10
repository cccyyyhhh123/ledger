/* healing.js — the mood page: today's faces, the days behind, a line to keep,
 * and four minutes of breathing.
 *
 * The data is the same one the desk uses: deskMood = { 'YYYY-MM-DD': { morning|afternoon|evening: 1..5 } }.
 * Nothing leaves the browser.
 */
(function () {
  'use strict';

  var MOOD_KEY = 'deskMood';
  var UNDO_KEY = 'deskMoodUndo';

  var SLOTS = [
    { id: 'morning', label: 'Morning', short: 'M' },
    { id: 'afternoon', label: 'Afternoon', short: 'A' },
    { id: 'evening', label: 'Evening', short: 'E' }
  ];
  var MOUTHS = [
    'M15 22 Q20 17 25 22',
    'M15 21 Q20 19.5 25 21',
    'M15 21 H25',
    'M15 19.5 Q20 23 25 19.5',
    'M14.5 18.5 Q20 24.5 25.5 18.5'
  ];
  var LABELS = ['rough', 'low', 'okay', 'good', 'great'];

  var AFFIRMATIONS = [
    { en: 'Slow is smooth, and smooth is fast.', cn: '慢就是稳，稳就是快。' },
    { en: 'You do not have to feel ready to begin.', cn: '不必准备好了才开始。' },
    { en: 'One page is still a page done.', cn: '一页，也是一页。' },
    { en: 'The thing you are avoiding is usually small.', cn: '你躲的那件事，往往并不大。' },
    { en: 'Ask earlier than feels polite.', cn: '去问，比你以为的时机早一点。' },
    { en: 'Rest is part of the work, not a reward for it.', cn: '休息不是奖励，是工作的一部分。' },
    { en: 'Say the true thing once, plainly.', cn: '把真话说一遍，说清楚就好。' },
    { en: 'Finish something small today.', cn: '今天做完一件小事。' },
    { en: 'You are allowed to change your mind with evidence.', cn: '有证据时，你可以改变主意。' },
    { en: 'Being new at this is not the same as being bad at it.', cn: '刚学，不等于学不好。' },
    { en: 'A deadline is a shape, not a verdict.', cn: '截止日期是形状，不是判决。' },
    { en: 'Write it badly first.', cn: '先写烂，再写好。' },
    { en: 'Do the next honest thing.', cn: '做下一件老实的事。' },
    { en: 'A little every day beats a lot someday.', cn: '每天一点，胜过某天很多。' },
    { en: 'You can be tired and still be kind.', cn: '累了也可以好好说话。' },
    { en: 'Nothing here has to be perfect to be useful.', cn: '有用，不必完美。' },
    { en: 'Close the tab you are not reading.', cn: '关掉那个你不看的标签页。' },
    { en: 'Begin again from where you are.', cn: '从你现在的位置，再来一次。' }
  ];

  function iso(day) {
    return day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' +
      String(day.getDate()).padStart(2, '0');
  }

  function load() {
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem(MOOD_KEY)) || {}; } catch (e) { raw = {}; }
    var out = {};
    Object.keys(raw).forEach(function (key) {
      var value = raw[key];
      if (typeof value === 'number') out[key] = { afternoon: value };
      else if (value && typeof value === 'object') out[key] = value;
    });
    return out;
  }

  function save(data) {
    try { localStorage.setItem(MOOD_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  function face(level, size) {
    var s = size || 24;
    return '<svg viewBox="0 0 40 40" width="' + s + '" height="' + s + '" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="16.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>' +
      '<circle cx="14.5" cy="16" r="1.7" fill="currentColor"/>' +
      '<circle cx="25.5" cy="16" r="1.7" fill="currentColor"/>' +
      '<path d="' + MOUTHS[level - 1] + '" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round"/></svg>';
  }

  function currentSlot() {
    var hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  var data = load();
  var slot = currentSlot();

  /* ---------- today ---------- */
  function paintPicker() {
    var tabs = document.getElementById('healSlots');
    var faces = document.getElementById('healFaces');
    var note = document.getElementById('healNote');
    if (!tabs || !faces) return;

    tabs.replaceChildren();
    SLOTS.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mood__slot' + (item.id === slot ? ' is-on' : '');
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(item.id === slot));
      button.textContent = item.label;
      button.dataset.slot = item.id;
      tabs.appendChild(button);
    });

    var key = iso(new Date());
    var entry = data[key] || {};
    faces.replaceChildren();
    for (var level = 1; level <= 5; level++) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mood__btn' + (entry[slot] === level ? ' is-picked' : '');
      button.innerHTML = face(level, 26);
      button.dataset.level = String(level);
      button.setAttribute('aria-pressed', String(entry[slot] === level));
      button.setAttribute('aria-label', SLOTS.filter(function (s) { return s.id === slot; })[0].label +
        ': ' + LABELS[level - 1]);
      faces.appendChild(button);
    }

    if (note) {
      var parts = SLOTS.filter(function (item) { return entry[item.id]; })
        .map(function (item) { return item.label + ' ' + LABELS[entry[item.id] - 1]; });
      note.textContent = parts.length
        ? 'Today: ' + parts.join(' · ')
        : 'Nothing recorded yet today. Pick a face above.';
    }
  }

  document.addEventListener('click', function (event) {
    var tab = event.target.closest('.mood__slot');
    if (tab && tab.dataset.slot) {
      slot = tab.dataset.slot;
      paintPicker();
      return;
    }

    var pick = event.target.closest('#healFaces .mood__btn');
    if (!pick) return;
    var key = iso(new Date());
    var level = Number(pick.dataset.level);
    var entry = data[key] || (data[key] = {});
    if (entry[slot] === level) delete entry[slot];
    else entry[slot] = level;
    if (!Object.keys(entry).length) delete data[key];
    save(data);
    paintPicker();
    paintHistory();
  });

  /* ---------- the days behind ---------- */
  function paintHistory() {
    var host = document.getElementById('healHistory');
    var stats = document.getElementById('healStats');
    if (!host) return;

    var days = [];
    var today = new Date();
    for (var back = 0; back < 21; back++) {
      var day = new Date(today);
      day.setDate(today.getDate() - back);
      var key = iso(day);
      days.push({ key: key, date: day, entry: data[key] || {} });
    }

    var recorded = days.filter(function (d) { return Object.keys(d.entry).length; });
    host.replaceChildren();

    if (!recorded.length) {
      var empty = document.createElement('p');
      empty.className = 'heal__empty';
      empty.textContent = 'No history yet — the first face you pick today will appear here.';
      host.appendChild(empty);
    } else {
      recorded.forEach(function (day) {
        var row = document.createElement('div');
        row.className = 'heal__day';

        var label = document.createElement('span');
        label.className = 'heal__date';
        label.textContent = day.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

        var faces = document.createElement('span');
        faces.className = 'heal__faces';
        SLOTS.forEach(function (item) {
          var value = day.entry[item.id];
          var cell = document.createElement('span');
          cell.className = 'heal__face' + (value ? ' has l' + value : '');
          cell.title = item.label + ': ' + (value ? LABELS[value - 1] : '—');
          cell.innerHTML = value ? face(value, 20) : '<i></i>';
          faces.appendChild(cell);
        });

        var text = document.createElement('span');
        text.className = 'heal__words';
        text.textContent = SLOTS.filter(function (item) { return day.entry[item.id]; })
          .map(function (item) { return LABELS[day.entry[item.id] - 1]; }).join(' · ');

        row.append(label, faces, text);
        host.appendChild(row);
      });
    }

    if (stats) {
      var sums = { morning: 0, afternoon: 0, evening: 0 };
      var counts = { morning: 0, afternoon: 0, evening: 0 };
      var all = 0;
      var total = 0;
      recorded.forEach(function (day) {
        Object.keys(day.entry).forEach(function (slotId) {
          if (sums[slotId] == null) return;
          sums[slotId] += day.entry[slotId];
          counts[slotId] += 1;
          total += day.entry[slotId];
          all += 1;
        });
      });

      var streak = 0;
      for (var i = 0; i < days.length; i++) {
        if (Object.keys(days[i].entry).length) streak++;
        else if (i > 0) break;
      }

      var average = all ? (total / all).toFixed(1) : '—';
      var parts = ['Days recorded: ' + recorded.length, 'Average: ' + average];
      SLOTS.forEach(function (item) {
        if (counts[item.id]) parts.push(item.label + ' ' + (sums[item.id] / counts[item.id]).toFixed(1));
      });
      if (streak) parts.push('Streak: ' + streak);
      stats.textContent = parts.join(' · ');
    }
  }

/* ---------- one thing for right now ---------- */
  var QUICK = [
    { title: 'Two short breaths, one long one', time: '20 seconds', how: 'In through the nose, a second sniff on top, then a long slow exhale. Three times. Done.' },
    { title: 'Cold water on your wrists', time: '30 seconds', how: 'Run the tap cold, hold both wrists under it, and let your shoulders drop while you wait.' },
    { title: 'Stand up and look out of a window', time: '1 minute', how: 'Something further than a screen. Let your eyes go slack; distance is what relaxes them.' },
    { title: 'Drop the shoulders and unclench the jaw', time: '20 seconds', how: 'Three slow rolls back, tongue off the roof of the mouth, fingers spread wide then soft.' },
    { title: 'Write the loud thing down', time: '3 minutes', how: 'One sentence on paper or in the box below. Not a plan — just the sentence you keep repeating.' },
    { title: 'Walk to the end of the corridor and back', time: '2 minutes', how: 'No phone. The point is the change of view and the fact that your body moved.' },
    { title: 'Drink a glass of water slowly', time: '1 minute', how: 'Both hands on the glass, all of it gone. Thirst and anxiety feel almost identical.' },
    { title: 'Close every tab but this one', time: '1 minute', how: 'Each open tab is a small unpaid debt. Pay them all at once by closing them.' },
    { title: 'Put your hand on your chest and count six breaths', time: '1 minute', how: 'Count to six on the out-breath. If the count wanders, that is the practice, not a failure.' },
    { title: 'Name it out loud', time: '15 seconds', how: '"I am tired and behind." Saying it plainly takes the edge off faster than reasoning with it.' }
  ];

  var quickIndex = -1;

  function paintQuick(step) {
    var title = document.getElementById('quickTitle');
    var how = document.getElementById('quickHow');
    var time = document.getElementById('quickTime');
    if (!title) return;

    quickIndex = (quickIndex + (step == null ? 1 : step) + QUICK.length) % QUICK.length;
    title.textContent = QUICK[quickIndex].title;
    how.textContent = QUICK[quickIndex].how;
    if (time) time.textContent = QUICK[quickIndex].time;
  }

  /* ---------- the brain dump ---------- */
  var DUMP_KEY = 'deskHealDump';

  function paintDump() {
    var box = document.getElementById('healDump');
    var count = document.getElementById('healCount');
    if (!box) return;
    var text = box.value.trim();
    var words = text ? text.split(/\s+/).length : 0;
    if (count) count.textContent = words + (words === 1 ? ' word' : ' words');
    try { localStorage.setItem(DUMP_KEY, box.value); } catch (e) { /* private mode */ }
  }

  /* ---------- a line to keep ---------- */
  function paintAffirmation(step) {
    var line = document.getElementById('healLine');
    var cn = document.getElementById('healCn');
    if (!line || !cn) return;

    var index = Number(localStorage.getItem('deskAffirmShow') || '-1');
    index = (index + (step == null ? 1 : step) + AFFIRMATIONS.length * 2) % AFFIRMATIONS.length;
    try { localStorage.setItem('deskAffirmShow', String(index)); } catch (e) {}
    line.textContent = AFFIRMATIONS[index].en;
    cn.textContent = AFFIRMATIONS[index].cn;
  }

  /* ---------- four minutes of breathing ---------- */
  var breathing = { running: false, phase: 0, timer: 0, left: 0, raf: 0, started: 0 };

  var PHASES = [
    { name: 'Breathe in', seconds: 4, scale: 1.18 },
    { name: 'Hold', seconds: 4, scale: 1.18 },
    { name: 'Breathe out', seconds: 6, scale: 0.82 },
    { name: 'Hold', seconds: 2, scale: 0.82 }
  ];

  function paintBreath() {
    var orb = document.getElementById('healOrb');
    var word = document.getElementById('healBreathWord');
    var clock = document.getElementById('healBreathLeft');
    if (!orb || !word) return;

    var phase = PHASES[breathing.phase % PHASES.length];
    word.textContent = breathing.running ? phase.name : 'Ready when you are';
    orb.style.transform = 'scale(' + (breathing.running ? phase.scale : 1) + ')';
    orb.dataset.phase = breathing.running ? String(breathing.phase % PHASES.length) : '';
    if (clock) {
      var seconds = Math.max(0, Math.ceil(breathing.left));
      clock.textContent = breathing.running ? seconds + 's · ' + Math.floor(breathing.left / 60) + ':' +
        String(Math.max(0, Math.round(breathing.left % 60))).padStart(2, '0') + ' left' : '4 minutes';
    }
  }

  function tickBreath(now) {
    if (!breathing.running) return;
    breathing.left -= 0.05;
    if (breathing.left <= 0) {
      stopBreath();
      return;
    }
    breathing.phase = Math.floor((240 - breathing.left) / 4) % PHASES.length;
    paintBreath();
    breathing.raf = setTimeout(function () { tickBreath(Date.now()); }, 200);
  }

  function startBreath() {
    breathing.running = true;
    breathing.left = 240;
    breathing.phase = 0;
    paintBreath();
    tickBreath(Date.now());
  }

  function stopBreath() {
    breathing.running = false;
    clearTimeout(breathing.raf);
    paintBreath();
    var word = document.getElementById('healBreathWord');
    if (word) word.textContent = 'Done. Carry it with you.';
  }

  /* ---------- wiring ---------- */
  function init() {
    paintPicker();
    paintHistory();
    paintAffirmation(0);

    var next = document.getElementById('healAnother');
    if (next) next.addEventListener('click', function () { paintAffirmation(1); });

    var start = document.getElementById('healStart');
    var stop = document.getElementById('healStop');
    if (start) start.addEventListener('click', startBreath);
    if (stop) stop.addEventListener('click', stopBreath);

    paintBreath();

    /* quick action and the dump */
    paintQuick(0);
    var next = document.getElementById('quickNext');
    if (next) next.addEventListener('click', function () { paintQuick(1); });

    var dump = document.getElementById('healDump');
    if (dump) {
      try { dump.value = localStorage.getItem(DUMP_KEY) || ''; } catch (e) { dump.value = ''; }
      paintDump();
      dump.addEventListener('input', paintDump);
      var clearDump = document.getElementById('healDumpClear');
      if (clearDump) {
        clearDump.addEventListener('click', function () {
          dump.value = '';
          paintDump();
          dump.focus();
        });
      }
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && breathing.running) stopBreath();
    });

    var clear = document.getElementById('healClear');
    if (clear) {
      clear.addEventListener('click', function () {
        if (!confirm('Remove every mood entry kept in this browser?')) return;
        try {
          localStorage.removeItem(MOOD_KEY);
          localStorage.removeItem(UNDO_KEY);
        } catch (e) { /* nothing to do */ }
        data = {};
        paintPicker();
        paintHistory();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
