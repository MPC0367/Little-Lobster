# Little Lobster — verification record

Instruments: a WKWebView harness (offscreen snapshotter + DOM probe, non-persistent
data store) and the in-app browser (real rAF, hover and transitions). Every claim below
is a number a probe printed, not a judgement. Run 3 Sep 2026.

## Research and provenance

| | |
|---|---|
| Harvest agents | 5 host families, 30-tool-call cap each, 284 tool calls, 0 errors |
| Files pulled | 111 images — 50 publishable (`_real/`), 61 reference-only (`_reference/`) |
| Every published photograph | opened and described from its pixels before it was named |
| Facts registered | 33, each with source URL, verbatim evidence and level |
| Adversarial verification | 14 printed claims × 2 independent lenses (provenance, independent lookup) |
| Result | 4 clean · 9 contested · 1 refuted (the ครัวคุณหรีด endorsement — dropped) |
| Conflicts logged | 8, each with the level that settled it |
| Held back, never printed | pet policy, private-room capacity, live music, all-you-can-eat promo, price band, Wongnai/Restaurant Guru ratings, email, TikTok, founder/chef/opening year |

## Gate 7 — 35 page × viewport audits (5 pages × 375/390/430/768/1024/1440/1920)

Every row returned identical results:

| Check | Result |
|---|---|
| Horizontal overflow | `scrollWidth == clientWidth` at every width — 0 offending elements |
| Broken images | 0 of 103 image slots across the five pages |
| Missing alt / dimensions | 0 / 0 |
| Clipped or cramped headings | 0 (Thai display line-height never below 1.28) |
| `h1` per page | exactly 1 |
| Unnamed controls | 0 |
| Contrast below AA | 0, in every colour room (paper, green wall, marble, brown card, red button) |

## Interaction probes (dispatched events, asserted state)

- **Language** — every `data-en` node swaps and restores; `<html lang>`, title, description and `alt` follow; only `<title>`/`<meta>` differ from their stored Thai, by design. Titles carry no entity corruption on any page after a round trip.
- **Lightbox** — opens on the right image, locks scroll, focus moves to close; next/prev/Escape/arrow keys work; focus returns to the opener; index reads `1 / 40` on the gallery, `1 / 15` on the home page.
- **Menu, fine pointer** — the preview follows the cursor, never covers the dish name or price (`coversName: false`, `coversPrice: false`), stays on screen, binds to the hovered row's own slug; rapid hover across six rows leaves exactly one row live and no stale image.
- **Menu, touch** — spotlight centres the row nearest the viewport middle, dims the rest to 0.55; tapping opens one inline panel at a time and closes the previous.
- **Dish binding** — 33 of 33 rows with a photograph resolve to their own dish slug in both the inline panel and the preview; 0 mismatches. Rows with no owner photograph of the actual dish (carbonara, cream shrimp spaghetti, river prawn, glass-noodle salad) show none.
- **Marquee** — pause button toggles `data-paused` and `aria-pressed`, drag switches to manual scrolling, reduced motion leaves it static and scrollable.
- **Mobile panel** — opens, traps focus, closes on Escape, returns focus to the burger.
- **Route drawing** — `strokeDashoffset` reaches 0 and all four stops light at full scroll.

## No JavaScript (scripts stripped, real load)

| | index | menu | visit |
|---|---|---|---|
| Reveal blocks visible | 50/50 | — | 17/17 |
| Headline lines visible | 3/3 | — | — |
| Headings visible | 24/24 | 17/17 | 9/9 |
| Menu rows visible | — | 51/51 | — |
| Dish photographs open inline | — | 33/33 | — |
| Dead controls shown | 0 | 0 | 0 |
| Loader trapping the page | no | no | no |

## Reduced motion

Every audit above ran on the `?static=1` build, which is the reduced-motion path: the
loader is removed, the gate is skipped, reveals render in their final state, the marquee
is static and scrollable, the route is fully drawn. All 35 audits passed on it.

## Links

Every external link loaded and confirmed to land on this business: the LINE short link
resolves to the venue's own official account, Messenger to its page, Facebook, Instagram,
the LINE MAN storefront, the Google place and directions links (stable `place_id`, no
text-search URLs), and the three quoted Facebook posts. Every local href resolves 200 and
every in-page anchor exists. 0 guessed URLs. 0 `target="_blank"` without `rel="noopener"`.

## Single-file build

`_build/little-lobster-artifact.html` — 4.93 MB, under the 16 MB ceiling. 5 page
templates, 42 images embedded once each as AVIF data URIs, client-side router.
Re-probed independently: navigation between all five pages, back/forward, the menu's 51
rows and 33 inline photographs, the gallery's 40 tiles, the lightbox (natural width 1000),
the language switch and the live open/closed line all work; 0 broken images.

## Not verified

- Real-network performance (LCP/CLS/INP). The harness serves from localhost; the figures
  would be meaningless. Payload is stated instead: 103 KB of markup, 49 KB CSS, 30 KB JS,
  and responsive AVIF/JPEG at three widths per photograph.
- Actual devices. Viewport emulation only.

---

## Reviews and booking — added 3 Sep 2026

**Gate 7 re-run across seven pages × seven widths = 49 audits, all clean**: no horizontal
overflow, 0 broken images of 106 slots, no clipped headings, one `h1` per page, no unnamed
controls, and no contrast failure in any colour room. Two failures were found and fixed in
this pass: stars at 2.0:1 on paper (now a darkened gold at 4.96:1) and at 3.35:1 on the
green wall (now a lifted gold at 4.62:1), and a note class reused on a dark section at
1.18:1 (now cream at 5.49:1).

**Reviews page, probed:**

| Assertion | Result |
|---|---|
| Cards rendered | 8, all carrying a star and a written comment |
| Filter chips | 7 rendered, every one matching ≥1 review; zero-match chips never render |
| Filtering | `มีข้อติ / With a criticism` → 5 of 8, stars 4,4,4,3 and one 5 with a caveat; count announced through `aria-live` |
| Star distribution | 98 / 22 / 8 / 1 / 0 rendered at 76% / 17% / 6% / 1% / 0%, summing to Google's 129 |
| Languages preserved | th, en, zh — no quote translated in place |
| Star ratings | exposed as `role="img"` with a text label, never as bare glyphs |
| Review/aggregateRating JSON-LD | absent, by design |

**Booking composer, probed:**

| Assertion | Result |
|---|---|
| Time buttons | 20, 11:00 to 20:30, generated from `site.json` hours; 6 marked as the lunch-set window |
| Send control before a valid form | disabled |
| Send control after a valid form | enabled; message composed correctly in Thai with a Buddhist-era date |
| Invalid phone | blocks the send again |
| Draft persistence | survives in `sessionStorage` |
| Any state claiming a booked / confirmed / reserved table | **none** — asserted against the rendered text |
| Submit verb | *copy and open LINE*, never *book now* |

---

## The curtain — one transition for language and every page change (3 Sep 2026)

The two-panel iron gate that carried the language switch was replaced by **the disc
curtain**: the restaurant's own round sign, the same white lockup as the loader, on the
plaster-green ground, carried up across the screen. It now carries the language switch
**and** every move between pages, so the two read as one gesture.

| Assertion | Result |
|---|---|
| The mark in the curtain | `#ll-lockup` — the full lockup, not the 88px lobster the gate used |
| Ground | `--wall-deep` with the plaster grain, matching the loader |
| State machine | `""` → `in` → (content swapped) → `out` → `""`, verified through a live language switch |
| Timings, paired with the CSS | in 380ms · covered 110ms · out 420ms · 910ms end to end |
| Covered state, rendered | verified by screenshot: disc centred, lit, glow on |
| Language switch | text swaps only while covered; a second click mid-flight is ignored |
| Page navigation | the click is intercepted, the curtain raised, the hand-over flag set, then the browser navigates |
| Arriving page | starts covered with the flag consumed, then lifts — one continuous movement across the page change |
| Failsafe | navigation fires at 400ms, and again at 1200ms if the first is missed, so the curtain can never trap anyone |
| Same-page anchors, the menu rail, external links, `tel:` | **not** intercepted — asserted; nothing is being replaced there |
| Reduced motion (`?static=1`) | curtain never becomes visible; the language still swaps |
| No JavaScript | `display: none`, height 0, on every page |
| bfcache | `pageshow` with `persisted` resets the curtain, so back never restores a covered page |
| Single-file build | the router raises the same curtain around its `<main>` swap |

One bug was found and fixed in this pass: resetting from `out` to rest animated the
transform, sweeping the whole curtain back down the screen. The rest state now carries
`transition: none`; entering is unaffected, because a transition is read from the state
being moved *to*.

**Gate 7 re-run after the change: 49 audits, 0 failing.**

---

## The calendar and the Google Sheet (4 Sep 2026)

Three changes: large numerals reset, the four date shortcuts replaced by a month calendar,
and a submission path into the restaurant's own Google Sheet. All three were put through a
three-lens adversarial review (accessibility, data protection, abuse resistance), 45
findings raised, each verified against the code before being acted on.

**Numerals.** Bodoni Moda's display cut thins the `4`'s diagonal until it reads as a `1` —
the lunch card's `490` was being read as `190`. Every large numeral is now weight 700 at
`opsz` 14: the price, the Google score, the house number, the rating disc. Rule recorded in
`MASTER.md` §5.

**Calendar, after the review fixed eight defects:**

| Assertion | Result |
|---|---|
| Roving tab stop after paging three months forward and three back | exactly 1, every time |
| Prev at the current month | soft-disabled via `aria-disabled`; focus never falls to `<body>` |
| Month change announced | yes, through the live region |
| Grid accessible name | carries the month it is showing |
| Today | `aria-current="date"`, and named as today |
| Selected day | `aria-selected` on the gridcell, repeated in the button's name, by mouse and by Enter |
| Typed past date | rejected, send stays blocked, view stays on a bookable month |
| Disabled past days | ~3.3:1 rather than the 1.35:1 an undefined token had produced |
| Focus ring on a day | drawn inside the cell, brass on the dark selected day |

**Submission path.** Empty endpoint by default: the send button does not render and the form
keeps its LINE hand-off, so it can never appear to have sent something it has not.

| Assertion | Result |
|---|---|
| Success | only `{"ok":true}` from the script counts — a captive portal or an Apps Script sign-in page answers 200 too |
| Timeout at 12s | says the result is **unknown**, never "nothing was sent", because a simple POST cannot be recalled |
| Only a synchronous dispatch failure | says nothing was sent |
| After a success | the button stays disabled until a field changes, so nobody lands in the sheet twice |
| Honeypot | judged by the script, not the browser — a password manager filling it can no longer make the form silently do nothing |
| Booking token and endpoint | emitted on `book.html` only, not on all seven pages |
| Privacy notice | lists every field in the payload, names the recipient, states purpose, erasure route and retention; swaps with the endpoint, as do the page intro; the footer is now true either way |

**Apps Script, hardened after the security lens:**

- **Spreadsheet formula injection closed.** A guest named `=IMPORTXML(...)` would have had it
  evaluated when the owner opened the sheet, exfiltrating every earlier guest's name and
  phone. Leading `=`, `+`, `-`, `@`, tab and CR are now neutralised — verified against six inputs.
- **Raw control bytes removed from the source.** The character class held literal `0x00`,
  `0x1F` and `0x7F`; pasting the file into the Apps Script editor dropped the NUL and turned
  the class into one starting with a literal hyphen, which would have stripped the dashes out
  of every phone number and date. Now written as `\u` escapes; the file is byte-checked clean.
- A mail failure after the row is committed no longer reports the booking as failed.
- Exception text is logged, never returned: it carries quota state, sheet names and sometimes
  the owner's address.
- `waitLock` failure returns `busy` instead of throwing into the generic handler.
- Party size is bounded at both ends (`-5` was accepted); dates must be plausible and inside 400 days.
- The `Message` column was dropped: it duplicated the guest's name, phone and note, so an
  erasure request needed two places cleared.
- `purgeOld()` ships with the script so the one-year retention line on the page is actionable.

**Gate 7 re-run after all of it: 49 audits, 0 failing.** Two probe false positives were
corrected in the process — the audit now skips `aria-hidden` subtrees, which is right in
general and was flagging the honeypot.

**Not verified.** The end-to-end POST has never run against a live Apps Script deployment,
because that needs the restaurant's own Google account. The client path is probed in both
configurations and the script's guards are simulated, but the first real booking should be a
test one.
