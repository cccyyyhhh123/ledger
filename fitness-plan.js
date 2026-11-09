/* fitness-plan.js — turn a few numbers into a plan the reader can start today.
 *
 * Everything happens in this file: no server, nothing leaves the page. The
 * profile is kept in localStorage so the numbers are still there tomorrow.
 *
 * The arithmetic uses Mifflin-St Jeor for resting energy, activity factors for
 * daily energy, and 7 700 kcal per kilogram of fat for the rate the reader
 * asked for. Every estimate is bounded: a deficit never goes under the
 * 1200/1500 kcal floor, and a rate is never taken so fast that it costs muscle.
 */
(function (global) {
  'use strict';

  var KEY = 'deskFitnessProfile';
  var KCAL_PER_KG = 7700;

  var ACTIVITY = {
    sedentary: { factor: 1.2, label: 'desk-bound, little walking', steps: 6000 },
    light: { factor: 1.375, label: 'some walking, 1–2 sessions a week', steps: 8000 },
    moderate: { factor: 1.55, label: '3–4 sessions a week', steps: 10000 },
    high: { factor: 1.725, label: '5+ sessions or an active job', steps: 12000 }
  };

  function round(value, step) {
    var unit = step || 1;
    return Math.round(value / unit) * unit;
  }

  function readForm(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name) return;
      data[field.name] = field.type === 'checkbox' ? field.checked : field.value;
    });
    return data;
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  /* ---------- the arithmetic ---------- */
  function build(input) {
    var sex = input.sex === 'male' ? 'male' : 'female';
    var age = Number(input.age) || 20;
    var height = Number(input.height) || 170;
    var weight = Number(input.weight) || 65;
    var activity = ACTIVITY[input.activity] || ACTIVITY.light;
    var rate = Number(input.rate) || 0.5;               /* kg per week */
    var goal = input.goal || 'lose';
    var days = Math.max(2, Math.min(6, Number(input.days) || 3));

    var bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
    var tdee = bmr * activity.factor;
    var bmi = weight / Math.pow(height / 100, 2);

    /* a deficit is what the asked-for rate needs, but it is bounded both ends */
    var wanted = (rate * KCAL_PER_KG) / 7;
    var floor = sex === 'male' ? 1500 : 1200;
    var deficit = Math.max(0, Math.min(700, wanted));
    if (goal !== 'lose') deficit = 0;

    var target = round(tdee - deficit, 10);
    var capped = target < floor;
    if (capped) {
      target = floor;
      deficit = Math.max(0, round(tdee - floor, 10));
    }

    var protein = round(weight * (goal === 'lose' ? 2.0 : 1.6), 5);
    var fat = round(weight * 0.8, 5);
    var carbs = Math.max(0, round((target - protein * 4 - fat * 9) / 4, 5));
    var water = Math.round(weight * 0.035 * 10) / 10;

    var weeks = deficit > 0 && goal === 'lose'
      ? Math.max(1, Math.ceil((weight * 0.1) / (deficit * 7 / KCAL_PER_KG)))
      : null;

    return {
      sex: sex, age: age, height: height, weight: weight,
      bmi: bmi, bmr: round(bmr, 10), tdee: round(tdee, 10),
      deficit: deficit, target: target, capped: capped,
      protein: protein, fat: fat, carbs: carbs, water: water,
      steps: Math.max(activity.steps, goal === 'lose' ? 8000 : activity.steps),
      days: days, rate: rate, goal: goal,
      weeks: weeks, activity: activity.label
    };
  }

  /* ---------- notes from the reader's own words ---------- */
  function notesFrom(text) {
    var notes = [];
    var t = (text || '').toLowerCase();
    if (/vegan|素|不吃肉|plant/.test(t)) {
      notes.push('Plant protein: tofu, tempeh, edamame, lentils, soy milk, seitan — combine two sources a meal to cover the amino acids.');
    }
    if (/vegetarian|蛋奶素/.test(t)) {
      notes.push('Eggs, Greek yoghurt, cottage cheese and whey are the cheapest ways to hit the protein number.');
    }
    if (/knee|膝|joint|关节/.test(t)) {
      notes.push('Knees: swap lunges and jumps for cycling, swimming, sled or incline walking; keep the squat to a depth that stays comfortable.');
    }
    if (/back|腰|lower back/.test(t)) {
      notes.push('Lower back: hinge with a hip-dominant pattern, train the core with dead-bug and side plank rather than sit-ups.');
    }
    if (/shoulder|肩/.test(t)) {
      notes.push('Shoulders: press at a pain-free angle, and use neutral-grip rows and push-ups on an incline while it settles.');
    }
    if (/食堂|canteen|cafeteria|外卖|takeaway|eat out/.test(t)) {
      notes.push('Canteen days: pick the protein first, ask for half rice, and keep the sauce on the side — that alone is usually 200 kcal.');
    }
    if (/夜班|night shift|不规律|irregular/.test(t)) {
      notes.push('Irregular hours: anchor protein at every wake-up, and treat the walk as fixed — it survives a broken schedule better than a session does.');
    }
    if (/gym|健身房|no equipment|家里|home/.test(t)) {
      notes.push('Home setup: a pair of adjustable dumbbells and a doorway pull-up bar cover all five movements.');
    }
    if (/fast|快|quick|short/.test(t)) {
      notes.push('Short on time: two 25-minute full-body sessions and 8k steps will hold muscle while the deficit does the work.');
    }
    return notes;
  }

  /* ---------- the week ---------- */
  function week(days) {
    var templates = {
      2: [['Strength A', 'Squat · row · push-up'], ['Strength B', 'Hinge · press · pull-down']],
      3: [['Strength A', 'Squat · row · push-up'], ['Strength B', 'Hinge · press · pull-down'], ['Strength C', 'Lunge · row · carry']],
      4: [['Strength A', 'Squat · row · push-up'], ['Cardio', '30–40 min easy'], ['Strength B', 'Hinge · press · pull-down'], ['Strength C', 'Lunge · row · carry']],
      5: [['Strength A', 'Squat · row · push-up'], ['Cardio', '30 min easy'], ['Strength B', 'Hinge · press · pull-down'], ['Intervals', '6 × 1 min, 2 min easy between'], ['Strength C', 'Lunge · row · carry']],
      6: [['Strength A', 'Squat · row · push-up'], ['Cardio', '30 min easy'], ['Strength B', 'Hinge · press · pull-down'], ['Intervals', '6 × 1 min'], ['Strength C', 'Lunge · row · carry'], ['Walk', '60 min easy']]
    };
    var chosen = templates[days] || templates[3];
    var names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var out = [];
    /* spread the sessions across the week, then let the gaps be rest days */
    var slots = [];
    if (chosen.length === 7) {
      for (var s = 0; s < 7; s++) slots.push(s);
    } else {
      for (var k = 0; k < chosen.length; k++) {
        slots.push(Math.round((k * 7) / chosen.length));
      }
    }

    for (var i = 0; i < 7; i++) {
      var at = slots.indexOf(i);
      if (at >= 0) out.push({ day: names[i], name: chosen[at][0], detail: chosen[at][1] });
      else out.push({ day: names[i], name: 'Rest', detail: 'walk if you feel like it' });
    }
    return out;
  }

  /* ---------- the panel ---------- */
  function render(target, plan, notes, raw) {
    var cls = plan.bmi < 18.5 ? 'is-low' : plan.bmi < 25 ? 'is-ok' : plan.bmi < 30 ? 'is-high' : 'is-very-high';
    var html = '';

    html += '<div class="plan__head">';
    html += '<div class="plan__stat"><span>Resting burn</span><b>' + plan.bmr + '</b><i>kcal</i></div>';
    html += '<div class="plan__stat"><span>Daily burn</span><b>' + plan.tdee + '</b><i>kcal</i></div>';
    html += '<div class="plan__stat is-key"><span>Eat about</span><b>' + plan.target + '</b><i>kcal</i></div>';
    html += '<div class="plan__stat ' + cls + '"><span>BMI</span><b>' + plan.bmi.toFixed(1) + '</b><i>kg/m²</i></div>';
    html += '</div>';

    html += '<p class="plan__line">' + (plan.goal === 'lose'
      ? 'A deficit of <b>' + plan.deficit + ' kcal</b> a day — about <b>' + (plan.deficit * 7 / KCAL_PER_KG).toFixed(2) + ' kg</b> a week.'
      : plan.goal === 'gain'
        ? 'A surplus keeps you at <b>' + plan.target + ' kcal</b>; the training below decides what the extra weight becomes.'
        : 'Maintenance: <b>' + plan.target + ' kcal</b> a day, with protein high enough to hold what you have.') +
      (plan.capped ? ' The number was raised to the healthy floor — a faster deficit would cost muscle.' : '') + '</p>';

    html += '<div class="plan__macros">';
    html += '<div><span>Protein</span><b>' + plan.protein + ' g</b></div>';
    html += '<div><span>Fat</span><b>' + plan.fat + ' g</b></div>';
    html += '<div><span>Carbs</span><b>' + plan.carbs + ' g</b></div>';
    html += '<div><span>Water</span><b>' + plan.water.toFixed(1) + ' L</b></div>';
    html += '<div><span>Steps</span><b>' + plan.steps + '</b></div>';
    html += '</div>';

    html += '<table class="fit__table plan__week"><caption class="fit__caption">' +
      plan.days + ' training days a week, arranged around the rest</caption><thead><tr><th>Day</th><th>Session</th><th>Detail</th></tr></thead><tbody>';
    week(plan.days).forEach(function (row) {
      html += '<tr><td>' + row.day + '</td><td>' + row.name + '</td><td>' + row.detail + '</td></tr>';
    });
    html += '</tbody></table>';

    html += '<ul class="fit__list plan__notes">';
    if (plan.weeks) {
      html += '<li><b>First check-in.</b> Ten percent of body weight is a fair first target — roughly ' +
        plan.weeks + ' weeks at this rate. Compare weekly averages, not Monday against Friday.</li>';
    }
    if (plan.bmi < 18.5) {
      html += '<li><b>This is not a weight-loss situation.</b> At a BMI under 18.5 a deficit does harm. Eat at maintenance or above and speak to a doctor.</li>';
    }
    if (plan.bmi >= 30) {
      html += '<li><b>Worth a doctor in the loop.</b> At a BMI of 30 or more, supervision turns a plan into a safe one — and there is more room to be generous with protein.</li>';
    }
    if (plan.age < 18) {
      html += '<li><b>Under 18.</b> Growth changes the maths; a guardian and a doctor should agree the plan before you follow it.</li>';
    }
    notes.forEach(function (note) { html += '<li>' + note + '</li>'; });
    if (raw && raw.wish && raw.wish.trim()) {
      html += '<li><b>Your note.</b> “' + raw.wish.trim().replace(/[<>&]/g, '') + '” — the numbers above are the frame; keep the plan inside it.</li>';
    }
    html += '</ul>';

    target.innerHTML = html;
    target.hidden = false;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- wiring ---------- */
  function init() {
    var form = document.getElementById('fitForm');
    var out = document.getElementById('fitPlan');
    if (!form || !out) return;

    var stored = load();
    if (stored) {
      Array.prototype.forEach.call(form.elements, function (field) {
        if (field.name && stored[field.name] != null) field.value = stored[field.name];
      });
      render(out, build(stored), notesFrom(stored.wish), stored);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = readForm(form);
      if (!data.weight || !data.height) return;
      save(data);
      render(out, build(data), notesFrom(data.wish), data);
    });

    var reset = document.getElementById('fitReset');
    if (reset) {
      reset.addEventListener('click', function () {
        try { localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ }
        form.reset();
        out.hidden = true;
        out.innerHTML = '';
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.DeskFitness = { build: build, notesFrom: notesFrom };
})(window);
