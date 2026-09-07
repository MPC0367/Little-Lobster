# Little Lobster Cafe & Bistro — Design System (MASTER)

Source of truth. Outranks the code. Every fact comes from `SOURCES.md`; nothing here
invents the business.

---

## 1. What this restaurant actually is

A chef-cooked **Italian–French bistro in a converted house** at No. 34, Soi Prachachuen 9,
Tha Sai, Nonthaburi. The venue's own words: *ร้านอาหารอิตาเลียน-ฝรั่งเศสฟิวชัน สไตล์โฮมมี่*
and, on its own graphic, *Your Neighborhood French-Italian Gem*. Reviewers' word, four
times over: **ร้านลับ** — the hidden one.

What it sells: whole Canadian lobster (grilled in garlic butter, over spaghetti with garlic
and dried chilli, as a risotto, as a bisque), red-wine braises (beef cheek, lamb shank),
pork chop and picanha on mash, truffle pizza, carbonara, a 490+ lunch set from 11:00 to
14:00, premium French house wine, beer, coffee and sodas. Open daily from 11:00. Bookings
by LINE, phone or Messenger — there is no booking platform, so the site does not fake one.

Five facts that shape the design:

1. **It is a house you have to find.** Behind a white wall and a black-and-gold gate in a
   residential soi. The site's job is to get people through that gate.
2. **The sign is a round white disc on a dark green plaster wall**, back-lit at night, with
   the hand-drawn red lobster and the house number 34 beside it.
3. **The plates are bistro classics on white scalloped plates**, photographed by the
   restaurant itself for its LINE MAN storefront. Its printed menu is a grid of dish photos
   with black gutters.
4. **The rooms are burgundy leather, teal velvet, dark green marble, brass pendants**, a
   framed map of Paris, a wine wall, and a private room with one long live-edge table.
5. **Its printed material** is a cream torn-paper lunch card with a brown panel, a
   chalkboard drink menu ruled in red hairline boxes, and white paper printed with the
   red logo in repeat.

## 2. Central creative idea — บ้านเลขที่ 34 / THE HOUSE YOU HAVE TO FIND

Everything on the site is the way in: the loader is the disc sign switching on at night,
the hero puts you at the gate with the plate in view, the navigation follows the route
(the soi → the kitchen → the room → the gallery board → how to get there), the signature
interaction is a hand-drawn route from Prachachuen Road to the gate that draws itself as
you scroll and ends on the Directions button, and the language transition is the gate:
two iron panels close, the words change, the gate opens.

**Specificity test.** Swap the name for another Bangkok Italian bistro and the structure
breaks: there is no gate, no No. 34, no disc on a green wall, no hand-drawn lobster.
Cross-category (recorded per the swap test):

- *A Neapolitan pizzeria in Lisbon* — would not wear a Thai Didone, a residential-soi
  arrival, a LINE booking route, or cream card paper with a red lobster; its ground is
  tile and fire, not plaster and velvet.
- *A three-seat omakase counter in Osaka* — has no room to show, no gate to find, no
  36-row delivery menu; its density is a single sequence, ours is a family table.
- *A Lagos jollof canteen* — has no French house wine, no lobster, no 11:00–14:00 set
  lunch, and no reason for burgundy leather and a Paris map.
- *A Texas BBQ smokehouse* — is pit and smoke hours; nothing here encodes heat or time,
  everything encodes arrival and a set table.

## 3. Visual language — abstracted from the venue's own material

- **The disc.** The one circle in the system: the logo disc, the rating badge, the map pin.
  Nothing else is round. `--r-disc: 999px`; every other radius is 0 (photos are tiles from
  the menu board; the room is brick and marble).
- **The board.** Photographs sit in a grid with 3px `--ink` gutters, as on the printed menu
  book. Gallery, signature dishes and menu previews all use the board.
- **The red hairline box.** From the chalkboard drink menu: section headings and the
  primary button sit inside a 1px red rule. Used sparingly — category chips and the
  lunch card only.
- **Torn card paper.** The lunch card, and only the lunch card, carries a torn edge
  (`clip-path` polygon), because that is what the venue's own card looks like.
- **Plaster.** One page-wide material: a 4% `feTurbulence` grain on the green rooms
  (hero backdrop band, arrival, visit, footer). Paper sections stay flat.
- **Hand-lettering stays in the logo.** The wordmark is theirs; the site never imitates
  it with a script font.

## 4. Colour — pixel-sampled

| Token | Value | Sampled from | Use |
|---|---|---|---|
| `--lobster` | `#EA1C24` | the logo (dominant red, 3.4% of the file) | the mark, large display accents, the rule boxes |
| `--lobster-deep` | `#B8141B` | darkened for text | primary button fill, small red text (5.6:1 on paper) |
| `--ink` | `#1E1B1C` | the logo black | text, gutters, the gate |
| `--paper` | `#F1EEE6` | lunch card cream (`#DBDBD1` in the photo, lifted for screen) | page ground (~60%) |
| `--paper-2` | `#E6E2D7` | card panel shadow | quiet panels, hairline fills |
| `--card` | `#A07B5B` | the brown panel on the lunch card | the lunch card only |
| `--wall` | `#3E7267` | green plaster wall behind the disc sign | green-room accents, hover |
| `--wall-deep` | `#2C5A50` | the wall in shade | green-room ground (text-bearing) |
| `--wall-lit` | `#6C978C` | the wall in sun | rules and secondary text on green |
| `--marble` | `#17332D` | dark green marble tables and bar | the menu "table" and lightbox ground |
| `--velvet` | `#0F4C5C` | the teal velvet chairs | room section accent only |
| `--leather` | `#4A1208` | the burgundy chesterfield | room section accent only |
| `--brass` | `#C8A55B` | pendant lamps / gold overlay on their graphic | the gate bars, the lit-disc glow, the rating bars |
| `--star` | `#7E6220` | the same gold, darkened | review stars on paper (4.96:1) |
| `--star-lit` | `#DFC48D` | the same gold, lifted | review stars on the green wall (4.62:1) |
| `--cream-ink` | `#F1EEE6` | paper | text on green and marble |

Ratio: paper 60 · greens 30 · red ≤ 3 · velvet/leather/brass as accents inside the room
section and the gate only. No decorative gradients; the only gradient is the disc glow
(the back-lit sign) and the legibility scrim over photographs.

Contrast: `--ink` on `--paper` 15.6:1 · `--cream-ink` on `--wall-deep` 7.9:1 ·
`--cream-ink` on `--marble` 12.6:1 · `--lobster-deep` on `--paper` 5.6:1 ·
`--cream-ink` on `--lobster-deep` 6.6:1 · `--wall-lit` on `--wall-deep` 3.1:1 (large text
and rules only).

## 5. Typography — Bodoni + Didone Thai, because the cuisine is Parma and Paris

| Role | Family | Why |
|---|---|---|
| Display, Latin | **Bodoni Moda** (opsz 6–96, wght 400–900) | Bodoni is Parma, Didot is Paris — the Didone is the Italian–French fusion in a typeface |
| Display, Thai | **Trirong** 500–600 | Cadson Demak's Thai Didone; the same high-contrast rhythm with Thai loops intact |
| Body + UI, Thai and Latin | **IBM Plex Sans Thai** 400–600 | one family for both scripts, engineered for mixing them on one line; tabular figures for prices |

Script-aware stacking: display elements declare `font-family: "Bodoni Moda", Trirong, serif`.
Latin resolves in Bodoni; Thai glyphs are absent from Bodoni and fall through to Trirong.
One rule, both languages. `html[lang=th]` and `html[lang=en]` adjust leading and tracking.

**Thai clipping is forbidden.** Display Thai `line-height ≥ 1.32`; body Thai `1.8`; no
`overflow: hidden` on any element whose content is a Thai heading; reveal masks carry
`padding-block: .18em` of overscan; buttons size from line-height, never fixed height.
Latin display may use `line-height 1.02`, Thai never below 1.32 — the `:lang()` rules do it.

**Large numerals are a special case.** Bodoni Moda's display cut (`opsz` 60–96) thins the
`4`'s diagonal until it reads as a `1` — the lunch card's `490` was being read as `190`.
Every big number therefore takes **weight 700 at `opsz` 14**: the price, the Google score,
the house number, the rating disc. Never set a numeral in this face above `opsz` 20.

Scale (fluid): hero `clamp(2.6rem, 1.4rem + 5.2vw, 6rem)` · h2 `clamp(1.9rem, 1.2rem + 2.6vw, 3.5rem)`
· h3 `clamp(1.35rem, 1.1rem + 1vw, 1.9rem)` · lead `clamp(1.06rem, 1rem + .4vw, 1.3rem)`
· body `clamp(1rem, .96rem + .2vw, 1.0625rem)` · small `.875rem` · eyebrow `.75rem`
tracked `.14em`, Latin uppercase only (Thai is never letter-spaced or uppercased).

## 6. Grid, space, geometry

12 columns desktop, 6 tablet, 4 phone. Gutter `clamp(16px, 2.2vw, 28px)`. Page margin
`clamp(20px, 5vw, 72px)`. Container `min(1440px, 100% − 2 × margin)`. Section rhythm
varies: `--s-1: clamp(56px, 8vw, 120px)` between rooms, `--s-2: clamp(32px, 4vw, 64px)`
inside them. Composition rule: no two consecutive sections share a shape — hero splits
6/6, the gem strip is a single line across 12, signatures are a 7/5 board, the lunch card
sits in cols 2–6 with the menu chips in 7–12, the house is a 5/7 with the photo small and
low, the route is full-bleed, the board is edge-to-edge, the kitchen notes are three narrow
columns, visit is 4/8.

Corners: 0 everywhere except the disc. Rules: 1px `--ink` at 18% on paper, 1px cream at
22% on green. Shadows: none, except the disc glow.

## 7. Motion — the sign switches on, the gate opens, the route draws

| Class | Duration | Easing | Where |
|---|---|---|---|
| fast | 180ms | `cubic-bezier(.2,.7,.2,1)` | hover, focus, chips |
| ui | 360ms | same | menu pop, spotlight, language text swap |
| editorial | 700ms | `cubic-bezier(.16,1,.3,1)` | line reveals, image wipes |
| cinematic | 1100ms | `cubic-bezier(.16,1,.3,1)` | the disc lighting up, the gate |

- **Loader:** green plaster, the disc unlit, then the glow comes on and the lobster fades in.
  420ms floor, 2200ms hard cap, lifts on hero decode, once per session, never under
  reduced motion or without JS. It never locks scroll.
- **The curtain — one device for every full-screen change.** The restaurant's own round
  sign, the same white disc as the loader, on a plaster-green ground, carried up across the
  screen: it rises from below (380ms, `--e-inout`), the content is replaced while nothing
  can be seen (110ms), and it continues up and away (420ms). It carries **both** the
  language switch and every move between pages, so the two read as the same gesture.
  Scroll position, the open menu category and a booking draft all survive it. Reduced
  motion, or no JavaScript: no curtain, the change is instant. On arrival the incoming page
  starts covered and lifts, so a page change is one continuous movement rather than two.
  Same-page anchors and the menu category rail are deliberately excluded — nothing is being
  replaced there, so nothing is covered.

  *(This replaced an earlier two-panel iron gate. It was busier, and it used only the
  lobster mark at 88px rather than the sign the restaurant actually hangs outside.)*
- **Reveals:** headline lines rise out of a clip with overscan; images wipe up by 6% scale
  and opacity. Only on `html.has-motion`, only once, only for elements marked `data-reveal`.
- **Signature — the route:** an SVG path from the main road to the gate; `stroke-dashoffset`
  follows the section's scroll progress (passive scroll listener + rAF, no scroll-jacking,
  no pinning). Four numbered stops because the route *is* a sequence. Reduced motion or no
  JS: fully drawn.
- **Menu pop (fine pointer):** the dish photo follows the cursor with 0.2 lerp, flips
  sides near the right edge, never covers name or price. Touch: spotlight — the row
  nearest the viewport centre scales 1.02 and the others dim to 0.6; tap opens the photo
  inline beneath the row. Keyboard: Enter/Space toggles the same inline panel.
- **Board (gallery):** CSS marquee at 72s per loop, pauses on hover/focus and via a real
  Pause button; drag and swipe scroll it manually; reduced motion: static, scrollable.
- **Cursor:** none. The venue is not a gimmick.

## 8. Content system

Thai is the served language (the venue's customers and its own voice are Thai); English
is a switch. Every translatable node carries `data-en`. Thai copy is written as Thai, not
translated: short headlines, no สัมผัส/ค้นพบ/ยกระดับ, CTAs by action (จองโต๊ะ, ดูเมนู,
นำทาง, โทร). Prices print as `฿1,268` with tabular figures and the note that they are
LINE MAN delivery prices read on 3 Sep 2026; dine-in dishes without a published price
print no price.

Held facts are never printed as claims. Closing time, pet policy, private-room capacity,
live music, the all-you-can-eat promotion and the ครัวคุณหรีด endorsement are all held
(see `SOURCES.md` §B); the private room appears only as *"ask us about the private room
for a group"*, and the closing time as the venue's own posted hours with a call-ahead line.

## 8b. The reviews page and the booking composer

Two modules added 3 Sep 2026. Both sit inside the existing system — no new colour, no new
typeface, no new geometry — and both are built so a reader can check them.

**Reviews (`reviews.html`).** The rating lives on **marble**, because it is the one number
the restaurant is judged on and the marble room is where the site puts things it wants read
slowly. The bars are brass on a 14%-cream track; the cards sit on paper with the 2px ink
top rule the kitchen notes already use. Stars are the one place a **second gold** was
needed: `--star #7E6220` on paper (4.96:1) and `--star-lit #DFC48D` on the green wall
(4.62:1), because the single brass fails as text on both. Avatars are the palette colours
in a **square** field — a monogram is typography, not a face, so it takes no radius.
Filter chips reuse the booking chip exactly.

**The calendar.** A month grid on white inside the paper form, square-cornered like
everything else, day cells 40px square so a thumb can hit them. Today is ringed in
`--lobster`; the chosen day is solid `--ink`. It replaced four shortcut buttons, which
answered "tonight or the weekend" and nothing else.

**Booking (`book.html`).** The four steps are numbered because they *are* a sequence, and
the numerals sit in the **red hairline box** from the drink board — the same device as the
menu category labels. The form is on paper; the message panel is **marble and sticky**,
so what you are about to send is always in view. The message is a real, editable
`<textarea>`, never a preview of something hidden. The one flourish is the lunch-set
underline on the 11:00–13:30 time buttons, in the lunch-card brown.

The verb is *request*, in both languages, everywhere — see the manual §10.9 and
`SOURCES.md` §J.2 for why this venue gets a composer and not a booking engine.

## 9. What is deliberately absent

- No story/founder/chef page — no founder, chef name, opening date or origin story exists in
  any source.
- No pet-friendly badge, no live-music module, no price band, no testimonials carousel of
  strangers' words — only the Google aggregate with its date, and the venue's own captions.
- No booking form — the venue books by LINE, phone and Messenger.
- No AI-generated imagery. Interior and exterior photographs exist only from reviewers,
  which are never published; the room is therefore told in words, materials and the one
  owner interior graphic, and the launch checklist asks the venue for its own photographs.
