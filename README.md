# Ledger — one book, one balance

A shared expense book for a household or a crew. Everyone types the same six
digits and writes into the same running total. No account, no server, nothing
leaves the browser.

**Author:** Yuhan.Cai
**Stack:** hand-written HTML, CSS and JavaScript — no framework, no build step
**Storage:** `localStorage`

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: dark hero over a video glow, a mockup of the ledger screen, four steps |
| `pricing.html` | Pricing: three plans in an accordion, each one driving the preview panel; comparison table and five questions |
| `contact.html` | Contact: one field and one button, the facts about the book, three columns of links |
| `book.html` | The ledger screen: add a line, filter by month or type, delete a mistake |

Every page carries its own top bar and links to the other three. Open
`index.html` and press **Open a ledger** — a six-digit key is made for you and
the ledger opens with it.

## Identity

- `images/og-image.jpg` — 1200 × 630, the poster share cards show
- `images/apple-touch-icon.png` — 180 × 180
- `images/favicon-32.png` — 32 × 32 (plus `favicon-192.png` for Android)
- the Open Graph and Twitter tags sit in every page's `<head>`

## The look

One system across the four pages, kept in each file's own `<style>` block so
every page stands alone:

- ground `#0d0d12`, panels `#0f0f15`, hairlines `rgba(255,255,255,0.07)`
- one accent: purple `#a855f7` (hover `#9333ea`)
- type: Inter for text, Plus Jakarta Sans for headings
- corners: 16px panels, 10px controls, 6px chips, 999px pills

## Motion

- `index.html` — the balance in the mockup counts up once, when it scrolls into view
- `pricing.html` — picking a plan swaps the preview and grows the three usage meters
- `contact.html` — the rows fade up in a stagger; the form says “Sent!” for 3 s, then resets
- `book.html` — the balance counts from its old value to the new one on every change

All of it is shortened or skipped under `prefers-reduced-motion: reduce`.

## Files

```
index.html  pricing.html  contact.html  book.html
images/     favicon, icons, OG image, screenshots
vendor/     anime.min.js (3.2.2, MIT) — self-hosted, so the CDN cannot fail
```

## Credits

Made by **Yuhan.Cai**. Icons are drawn by hand as inline SVG; the type is Inter
and Plus Jakarta Sans from Google Fonts; Anime.js is MIT (Julian Garnier).
