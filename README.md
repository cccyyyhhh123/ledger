# Yuhan's Desk

Six tools on one page, hand-written HTML, CSS and JavaScript. No framework, no build step;
everything runs from GitHub Pages and keeps its state in the browser.

| Page | What it is |
| --- | --- |
| `index.html` | The desk: the clock as the anchor number, today's affirmation, study figures, a rail of tools |
| `music.html` | Search QQ Music and play it in their own embedded player |
| `study.html` | Four courses of revision cards, a chart with a period switch, exams and a revision plan |
| `clock.html` | A clock whose hands are hanging ropes, a countdown with presets, five other cities |
| `weather.html` | Live weather for Danzhou from Open-Meteo |
| `ledger.html` | The shared expense book — one six-digit key, entries kept locally |

Shared files: `style.css` (one stylesheet), `theme.js` (light/dark plus wall-paper palettes),
`nav.js` (the sliding menu highlight and the theme switch), `counter.js` (the rolling digits),
`sky.js` (the tarot starfield), `elastic-slider.js` (the volume control).

Light and dark are the same component tree with different token values; a palette chosen
from an image is turned into a light or dark version depending on the mode.

Written by Yuhan Cai.