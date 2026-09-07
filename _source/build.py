#!/usr/bin/env python3
"""Render data into the pages, in place and idempotently.

    python3 _source/build.py

Markers in the HTML:
  <!--#pic slug="x" sizes="…" alt="…" alt-en="…" class="…" loading="lazy" fetchpriority="high" lb="1"-->
      → <picture> from _source/media-manifest.json (AVIF first, JPEG fallback, width/height read back)
  <!--#chips-->…<!--/chips-->          category chips (index)
  <!--#lunch-->…<!--/lunch-->          lunch card courses (index)
  <!--#sig-->…<!--/sig-->              signature board (index)
  <!--#marquee-->…<!--/marquee-->      the drifting board (index)
  <!--#rail-->…<!--/rail-->            menu category rail (menu)
  <!--#menu-->…<!--/menu-->            the whole menu (menu)
  <!--#menuld-->…<!--/menuld-->        Menu JSON-LD (menu)
  <!--#gallery-->…<!--/gallery-->      the full board (gallery)
  <!--#data-->…<!--/data-->            window.LL_DATA (every page)
  <!--#notes-->…<!--/notes-->          the venue's own captions (index)
Content: content/menu.json, content/site.json. Never edits anything outside the markers.
"""
import json, os, re, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
MENU = json.load(open('content/menu.json', encoding='utf-8'))
SITE = json.load(open('content/site.json', encoding='utf-8'))
MAN = json.load(open('_source/media-manifest.json', encoding='utf-8'))
RV = json.load(open('content/reviews.json', encoding='utf-8'))
PAGES = ['index.html', 'menu.html', 'visit.html', 'gallery.html', 'reviews.html', 'book.html', '404.html']

def esc(s): return html.escape(s or '', quote=True)
def thb(n): return '฿' + format(n, ',')

# ------------------------------------------------------------------ pictures
def picture(slug, sizes='100vw', alt='', alt_en=None, cls='', loading='lazy', fetchpriority=None, lb=False, cap=None, cap_en=None, w=None):
    m = MAN.get(slug)
    if not m: raise SystemExit('no image for slug ' + slug)
    sz = sorted(m['sizes'], key=lambda s: s['w'])
    biggest = sz[-1]
    mid = [s for s in sz if s['w'] >= 900] or sz
    default = mid[0]
    jpg_set = ', '.join(f"{s['jpg']} {s['w']}w" for s in sz)
    avif = [s for s in sz if s['avif']]
    avif_set = ', '.join(f"{s['avif']} {s['w']}w" for s in avif)
    attrs = f'src="{default["jpg"]}" srcset="{jpg_set}" sizes="{sizes}" width="{biggest["w"]}" height="{biggest["h"]}" alt="{esc(alt)}"'
    if alt_en is not None: attrs += f' data-en-alt="{esc(alt_en)}"'
    attrs += f' loading="{loading}" decoding="async"'
    if fetchpriority: attrs += f' fetchpriority="{fetchpriority}"'
    attrs += f' data-slug="{slug}" data-full="{biggest["jpg"]}"'
    src = ''
    if avif_set: src = f'<source type="image/avif" srcset="{avif_set}" sizes="{sizes}">'
    c = f' class="{cls}"' if cls else ''
    return f'<picture{c}>{src}<img {attrs}></picture>'

def pic_marker(m):
    a = dict(re.findall(r'([a-z-]+)="([^"]*)"', m.group(1)))
    return picture(a['slug'], a.get('sizes', '100vw'), a.get('alt', ''), a.get('alt-en'), a.get('class', ''), a.get('loading', 'lazy'), a.get('fetchpriority'))

def biggest(slug): return sorted(MAN[slug]['sizes'], key=lambda s: s['w'])[-1]['jpg']

# --------------------------------------------------------------- menu lookups
ITEMS = {}
for c in MENU['categories']:
    for it in c['items']: ITEMS[it['id']] = dict(it, cat=c)
for it in MENU['dinein']['items']: ITEMS[it['id']] = dict(it, cat=MENU['dinein'], price=None)

def item_caption(it):
    return it['th'], it['en']

# ------------------------------------------------------------------- renders
def render_chips():
    out = []
    for c in MENU['categories']:
        n = len(c['items'])
        out.append(f'<a class="chip" href="menu.html#cat-{c["id"]}"><span data-en="{esc(c["title_en"])}">{esc(c["title_th"])}</span><small class="num">{n}</small></a>')
    out.append(f'<a class="chip" href="menu.html#cat-lunch"><span data-en="{esc(MENU["lunch"]["title_en"])}">{esc(MENU["lunch"]["title_th"])}</span><small>{MENU["lunch"]["time"]}</small></a>')
    out.append(f'<a class="chip" href="menu.html#cat-dinein"><span data-en="{esc(MENU["dinein"]["title_en"])}">{esc(MENU["dinein"]["title_th"])}</span><small class="num">{len(MENU["dinein"]["items"])}</small></a>')
    return '\n'.join(out)

def render_lunch():
    L = MENU['lunch']; out = []
    for co in L['courses']:
        opts = ''.join(f'<li><span data-en="{esc(o["en"])}">{esc(o["th"])}</span></li>' for o in co['options'])
        out.append(f'<div class="lunchcard__course"><h3 data-en="{esc(co["name_en"])}">{esc(co["name_th"])}</h3><ul>{opts}</ul></div>')
    return '\n'.join(out)

def tile_photo(slug, it, cls, sizes, extra=''):
    th, en = item_caption(it)
    price = f'<span class="price num">{thb(it["price"])}</span>' if it.get('price') else ''
    cap = f'<figcaption class="tile__cap"><b data-en="{esc(en)}">{esc(th)}</b>{price}</figcaption>'
    btn = f'<button type="button" data-lb="{biggest(slug)}" data-lb-cap="{esc(th)}" data-lb-cap-en="{esc(en)}" aria-label="{esc("ดูรูป " + th)}" data-en-aria-label="{esc("View photo: " + en)}"></button>'
    return f'<figure class="tile {cls}" {extra}>{picture(slug, sizes, th, en)}{cap}{btn}</figure>'

def render_sig():
    lob = ITEMS['grilled-lobster']; pz = ITEMS['truffle-pizza']; wing = ITEMS['chicken-wing']; carb = ITEMS['carbonara']; ris = ITEMS['lobster-risotto']
    t1 = tile_photo('lobster-baked-cheese', ITEMS['lobster-cheese'], 't1', '(max-width: 900px) 100vw, 42vw', 'data-reveal="wipe"')
    t2 = tile_photo('truffle-pizza', pz, 't2', '(max-width: 900px) 50vw, 33vw', 'data-reveal="wipe"')
    t3 = tile_photo('chicken-wings-parmesan', wing, 't3', '(max-width: 900px) 50vw, 25vw', 'data-reveal="wipe"')
    t4 = (f'<figure class="tile tile--text t4" data-reveal><div class="tile__text"><p class="eyebrow" data-en="Recommended № 2 on LINE MAN">แนะนำอันดับ 2 บน LINE MAN</p>'
          f'<h3 class="tile__name" data-en="{esc(carb["en"])}">{esc(carb["th"])}</h3><p data-en="{esc(carb["desc_en"])}">{esc(carb["desc_th"])}</p></div>'
          f'<div class="tile__foot"><span data-en="Pasta">พาสต้า</span><span class="price num">{thb(carb["price"])}</span></div></figure>')
    t5 = (f'<figure class="tile tile--text t5" data-reveal><svg class="tile__lob" viewBox="0 0 454 415" aria-hidden="true"><use href="#ll-mark"/></svg><div class="tile__text"><p class="eyebrow" data-en="The dish the restaurant always names first">จานแรกที่ร้านเอ่ยถึงเสมอ</p>'
          f'<h3 class="tile__name" data-en="{esc(ris["en"])}">{esc(ris["th"])}</h3><p data-en="{esc(ris["desc_en"])}">{esc(ris["desc_th"])}</p></div>'
          f'<div class="tile__foot"><span data-en="Dine-in menu · ask for today\'s price">เมนูหน้าร้าน · สอบถามราคาวันนี้</span><a class="textlink" href="menu.html#cat-dinein"><span data-en="On the printed menu">ดูเมนูหน้าร้าน</span><span class="textlink__arrow" aria-hidden="true">→</span></a></div></figure>')
    return '\n'.join([t1, t2, t3, t4, t5])

MARQUEE = ['truffle-pizza', 'grilled-lobster-garlic-butter', 'beef-cheek-red-wine', 'smoked-duck-salad', 'chicken-wings-parmesan', 'lamb-shank-red-wine', 'spicy-seafood-spaghetti', 'fried-squid-branded-paper', 'duck-leg-orange-sauce', 'lobster-baked-cheese', 'mille-feuille-dome', 'german-pork-knuckle']
SLUG_ITEM = {}
for it in ITEMS.values():
    if it.get('pic'): SLUG_ITEM[it['pic']] = it
EXTRA_CAP = {
    'studio-table': ('ล็อบสเตอร์ย่างเนยกระเทียม จานเนื้อกับมันบด และพิซซ่าทรัฟเฟิล จากภาพของร้าน', "Grilled lobster, a beef plate with mash and truffle pizza, from the restaurant's own photograph"),
    'room-bar': ('บาร์ โซฟาเชสเตอร์ฟิลด์ และเก้าอี้กำมะหยี่สีเขียว', 'The bar, the chesterfield and the teal velvet chairs'),
    'paper-fries-sq': ('กระดาษรองลายล็อบสเตอร์แดงของร้าน', "The restaurant's own red-lobster paper"),
    'hero-lobster-sq': ('ล็อบสเตอร์แคนาดาย่างเนยกระเทียม', 'Grilled Canadian lobster, garlic butter'),
    'beef-cheek-fb': ('แก้มวัวตุ๋นไวน์แดง จากภาพของร้าน', "Beef cheek in red wine, from the restaurant's own photograph"),
    'w-chicken-wing-fried-parmesan': ('ปีกไก่ทอดพาร์เมซาน', 'Chicken wings, parmesan'),
    'w-fish-burger-fries': ('เบอร์เกอร์ปลา', 'Fish burger'),
    'w-french-fries-closeup': ('เฟรนช์ฟราย', 'French fries'),
    'w-german-pork-knuckle-chopped-fries': ('ขาหมูเยอรมันทอด', 'German pork knuckle'),
    'w-bbq-pork-rib-fries-salad': ('ซี่โครงหมูบาบีคิว', 'BBQ pork rib'),
    'w-cheese-pizza-in-box': ('พิซซ่าหน้าชีส', 'Cheese pizza'),
}
def cap_for(slug):
    if slug in SLUG_ITEM: return item_caption(SLUG_ITEM[slug])
    if slug in EXTRA_CAP: return EXTRA_CAP[slug]
    return (slug, slug)

def marq_row(hidden):
    out = []
    for s in MARQUEE:
        th, en = cap_for(s)
        img = picture(s, '(max-width: 560px) 62vw, 22vw', '' if hidden else th, None if hidden else en)
        btn = '' if hidden else f'<button type="button" data-lb="{biggest(s)}" data-lb-cap="{esc(th)}" data-lb-cap-en="{esc(en)}" aria-label="{esc("ดูรูป " + th)}" data-en-aria-label="{esc("View photo: " + en)}"></button>'
        out.append(f'<li class="marq__item">{img}{btn}</li>')
    ah = ' aria-hidden="true"' if hidden else ''
    return f'<ul class="marq__row"{ah}>{"".join(out)}</ul>'

def render_marquee():
    return '<div class="marq__track">' + marq_row(False) + marq_row(True) + '</div>'

GALLERY = ['grilled-lobster-garlic-butter', 'studio-table', 'truffle-pizza', 'beef-cheek-fb', 'smoked-duck-salad', 'lobster-baked-cheese', 'chicken-wings-parmesan', 'paper-fries-sq', 'lamb-shank-red-wine', 'spicy-seafood-spaghetti', 'duck-leg-orange-sauce', 'room-bar', 'salmon-steak', 'fried-squid-branded-paper', 'german-pork-knuckle', 'bbq-pork-ribs', 'smoked-salmon-zapp', 'spaghetti-vongole', 'shrimp-dried-chili-spaghetti', 'mille-feuille-dome', 'cinnamon-roll-pastry', 'banoffee-cups', 'fish-burger-fries', 'veal-sausage-mash', 'grilled-beef-tongue', 'baked-spinach-cheese', 'mixed-green-salad-balsamic', 'smoked-salmon-salad', 'crispy-silver-fish-salad', 'anchovy-salad', 'bacon-olio-spaghetti', 'cheese-pizza-box', 'french-fries', 'mixed-fried-branded-paper', 'mayongchid-loi-kaew', 'bacon-quiche', 'w-chicken-wing-fried-parmesan', 'w-bbq-pork-rib-fries-salad', 'w-fish-burger-fries', 'w-german-pork-knuckle-chopped-fries']
def render_gallery():
    out = []
    for i, s in enumerate(GALLERY):
        th, en = cap_for(s)
        m = MAN[s]; w, h = m['src_w'], m['src_h']
        cls = 'tall' if (h > w * 1.15 and i % 3 == 0) else ('wide' if s == 'studio-table' else '')
        sizes = '(max-width: 900px) 50vw, 25vw' if cls != 'wide' else '(max-width: 900px) 100vw, 50vw'
        btn = f'<button type="button" data-lb="{biggest(s)}" data-lb-cap="{esc(th)}" data-lb-cap-en="{esc(en)}" aria-label="{esc("ดูรูป " + th)}" data-en-aria-label="{esc("View photo: " + en)}"></button>'
        out.append(f'<figure class="tile {cls}">{picture(s, sizes, th, en)}<figcaption class="tile__cap"><b data-en="{esc(en)}">{esc(th)}</b></figcaption>{btn}</figure>')
    return '\n'.join(out)

def render_rail():
    out = [f'<a href="#cat-lunch"><span data-en="{esc(MENU["lunch"]["title_en"])}">{esc(MENU["lunch"]["title_th"])}</span><small>{MENU["lunch"]["time"]}</small></a>']
    for c in MENU['categories']:
        out.append(f'<a href="#cat-{c["id"]}"><span data-en="{esc(c["title_en"])}">{esc(c["title_th"])}</span><small class="num">{len(c["items"])}</small></a>')
    out.append(f'<a href="#cat-dinein"><span data-en="{esc(MENU["dinein"]["title_en"])}">{esc(MENU["dinein"]["title_th"])}</span><small class="num">{len(MENU["dinein"]["items"])}</small></a>')
    out.append(f'<a href="#cat-drinks"><span data-en="{esc(MENU["drinks"]["title_en"])}">{esc(MENU["drinks"]["title_th"])}</span></a>')
    return '\n'.join(out)

def row(it, n, dinein=False):
    has = bool(it.get('pic')) and it['pic'] in MAN
    th, en = it['th'], it['en']
    rec = f'<span class="mrow__rec" data-en="Recommended {it["recommended"]}">แนะนำอันดับ {it["recommended"]}</span>' if it.get('recommended') else ''
    desc = f'<span class="mrow__desc" data-en="{esc(it.get("desc_en", ""))}">{esc(it.get("desc_th", ""))}</span>' if it.get('desc_th') else ''
    if dinein or it.get('price') is None:
        price = '<span class="mrow__price mrow__price--ask" data-en="ask">สอบถาม</span>'
    else:
        price = f'<span class="mrow__price num">{thb(it["price"])}</span>'
    name = f'<span class="mrow__name"><span data-en="{esc(en)}">{esc(th)}</span>{rec}<span class="mrow__en" data-en="{esc(th)}">{esc(en)}</span></span>'
    if has:
        slug = it['pic']; m = MAN[slug]; big = biggest(slug)
        small = sorted(m['sizes'], key=lambda s: s['w'])[0]
        cue = '<span class="mrow__cue" aria-hidden="true" data-en="Photo ↗" data-th="ดูรูป ↗">ดูรูป ↗</span>'
        btn = f'<button class="mrow__btn" type="button" aria-expanded="false" aria-controls="pic-{it["id"]}">{name}{desc}{price}{cue}</button>'
        pic = (f'<figure class="mrow__pic" id="pic-{it["id"]}" data-open="false"><div class="mrow__picinner">'
               f'<img src="{small["jpg"]}" data-full="{big}" width="{small["w"]}" height="{small["h"]}" alt="{esc(th)}" data-en-alt="{esc(en)}" loading="lazy" decoding="async"></div>'
               f'<figcaption data-en="{esc(en)}">{esc(th)}</figcaption></figure>')
        return f'<li class="mrow mrow--haspic" data-pic="{slug}">{btn}{pic}</li>'
    return f'<li class="mrow"><div class="mrow__btn" role="presentation">{name}{desc}{price}</div></li>'

def render_menu():
    out = []
    L = MENU['lunch']
    courses = ''.join(f'<div class="lunchcard__course"><h3 data-en="{esc(co["name_en"])}">{esc(co["name_th"])}</h3><ul>' + ''.join(f'<li><span data-en="{esc(o["en"])}">{esc(o["th"])}</span></li>' for o in co['options']) + '</ul></div>' for co in L['courses'])
    out.append(f'''<section class="mcat" id="cat-lunch" aria-labelledby="h-lunch">
<div class="mcat__head"><h2 class="mcat__title" id="h-lunch" data-en="{esc(L["title_en"])}">{esc(L["title_th"])}</h2><span class="mcat__label num">{L["time"]}</span></div>
<div class="lunchcard lunchcard--menu"><svg class="lunchcard__mark" viewBox="0 0 454 415" aria-hidden="true"><use href="#ll-mark"/></svg>
<div class="lunchcard__head"><p class="lunchcard__price num">490<sup>+</sup></p><p class="lunchcard__time"><b data-en="Lunch">มื้อเที่ยง</b>{L["time"]}</p></div>
{courses}
<p class="lunchcard__note"><span data-en="{esc(L["plus_note_en"])}">{esc(L["plus_note_th"])}</span> · <span data-en="{esc(L["status_en"])}">{esc(L["status_th"])}</span></p>
</div></section>''')
    for c in MENU['categories']:
        rows = ''.join(row(it, i) for i, it in enumerate(c['items']))
        out.append(f'''<section class="mcat" id="cat-{c["id"]}" aria-labelledby="h-{c["id"]}">
<div class="mcat__head"><h2 class="mcat__title" id="h-{c["id"]}" data-en="{esc(c["title_en"])}">{esc(c["title_th"])}</h2><span class="mcat__label"><span data-en="on LINE MAN as">บน LINE MAN:</span> {esc(c["storefront_label"])}</span></div>
<ul class="mlist">{rows}</ul></section>''')
    D = MENU['dinein']
    rows = ''.join(row(it, i, dinein=True) for i, it in enumerate(D['items']))
    out.append(f'''<section class="mcat" id="cat-dinein" aria-labelledby="h-dinein">
<div class="mcat__head"><h2 class="mcat__title" id="h-dinein" data-en="{esc(D["title_en"])}">{esc(D["title_th"])}</h2></div>
<p class="small muted" style="margin-bottom:10px" data-en="{esc(D["note_en"])}">{esc(D["note_th"])}</p>
<ul class="mlist">{rows}</ul></section>''')
    K = MENU['drinks']
    lines = ''.join(f'<li><span data-en="{esc(e)}">{esc(t)}</span></li>' for t, e in zip(K['lines_th'], K['lines_en']))
    out.append(f'''<section class="mcat" id="cat-drinks" aria-labelledby="h-drinks">
<div class="mcat__head"><h2 class="mcat__title" id="h-drinks" data-en="{esc(K["title_en"])}">{esc(K["title_th"])}</h2><span class="mcat__label" data-en="{esc(K["note_en"])}">{esc(K["note_th"])}</span></div>
<ul class="drinks__list">{lines}</ul></section>''')
    return '\n'.join(out)

def render_menuld():
    secs = []
    for c in MENU['categories']:
        items = []
        for it in c['items']:
            d = {"@type": "MenuItem", "name": it['en'], "alternateName": it['th']}
            if it.get('price'): d["offers"] = {"@type": "Offer", "price": str(it['price']), "priceCurrency": "THB", "description": "LINE MAN delivery price, read 2026-09-03"}
            if it.get('pic') and it['pic'] in MAN: d["image"] = SITE['origin'] + '/' + biggest(it['pic'])
            items.append(d)
        secs.append({"@type": "MenuSection", "name": c['title_en'], "alternateName": c['title_th'], "hasMenuItem": items})
    ld = {"@context": "https://schema.org", "@type": "Menu", "@id": SITE['origin'] + "/menu.html#menu", "name": "Little Lobster menu", "inLanguage": ["th", "en"], "hasMenuSection": secs,
          "description": "Delivery prices from the restaurant's LINE MAN storefront; dine-in prices may differ."}
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>'

def render_notes():
    out = []
    for c in SITE['captions']:
        out.append(f'<blockquote class="note"><p data-en="{esc(c["en"])}">{esc(c["th"])}</p><cite><span data-en="Little Lobster, on Facebook">Little Lobster บน Facebook</span> · <a href="{c["url"]}" target="_blank" rel="noopener" data-en="Read the post">อ่านโพสต์</a></cite></blockquote>')
    return '\n'.join(out)

def render_data(page=None):
    # The booking token and endpoint ride only on the page that books. There is no
    # reason for the 404 page or the gallery to carry a write credential.
    d = {"hours": SITE['hours'], "phone": SITE['phone_e164'], "line": SITE['line_url']}
    if page == 'book.html':
        d["booking"] = {k: v for k, v in SITE.get('booking', {}).items() if not k.startswith('_')}
    return '<script>window.LL_DATA=' + json.dumps(d, ensure_ascii=False) + ';</script>'

MONO = ['--wall', '--leather', '--velvet', '--card', '--marble', '--lobster-deep']

def stars(n, scale=5):
    """Stars as text with an accessible label — never an image, never a bare glyph run."""
    full = '★' * int(n) + '☆' * (scale - int(n))
    return (f'<p class="rv__stars" role="img" aria-label="{n} ' + esc('ดาว จาก') + f' {scale}" '
            f'data-en-aria-label="{n} out of {scale} stars"><span aria-hidden="true">{full}</span></p>')

def render_rvsum():
    A = RV['aggregate']; D = RV['distribution']; total = A['count']
    rows = []
    for k, label in (('five', '5'), ('four', '4'), ('three', '3'), ('two', '2'), ('one', '1')):
        n = D[k]; pct = round(n * 100 / total) if total else 0
        rows.append(f'<div class="rvbar"><span class="rvbar__k num">{label}<span aria-hidden="true">★</span></span>'
                    f'<span class="rvbar__t"><i style="width:{pct}%"></i></span>'
                    f'<span class="rvbar__n num">{n}</span></div>')
    return f"""<div class="rvsum__score">
  <p class="rvsum__big num">{A['rating']}</p>
  {stars(round(float(A['rating'])))}
  <p class="rvsum__meta"><span data-en="from {A['count']} reviews on Google">จาก {A['count']} รีวิวบน Google</span><br>
     <span class="small" data-en="read {esc(A['read_en'])}">อ่านเมื่อ {esc(A['read_th'])}</span></p>
  <a class="textlink" href="{A['url']}" target="_blank" rel="noopener"><span data-en="Read them on Google">อ่านบน Google</span><span class="textlink__arrow" aria-hidden="true">↗</span></a>
</div>
<div class="rvsum__dist">
  <h3 class="rvsum__disth" data-en="All {A['count']} ratings">เรตติ้งทั้ง {A['count']} รายการ</h3>
  {''.join(rows)}
  <p class="rvsum__note small" data-en="{esc(RV['distribution_note_en'])}">{esc(RV['distribution_note_th'])}</p>
  <p class="rvsum__note small" data-en="{esc(RV['elsewhere_en'])}">{esc(RV['elsewhere_th'])}</p>
</div>"""

def render_rvchips():
    counts = {t['id']: sum(1 for r in RV['reviews'] if t['id'] in r['tags']) for t in RV['tags']}
    out = [f'<button class="rvchip" type="button" data-filter="all" aria-pressed="true">'
           f'<span data-en="All {len(RV["reviews"])}">ทั้งหมด {len(RV["reviews"])}</span></button>']
    total = len(RV['reviews'])
    for t in RV['tags']:
        n = counts[t['id']]
        # a chip must discriminate: one that matches nothing, or everything, is not a filter
        if n == 0 or n == total:
            continue
        out.append(f'<button class="rvchip" type="button" data-filter="{t["id"]}" aria-pressed="false">'
                   f'<span data-en="{esc(t["en"])}">{esc(t["th"])}</span><small class="num">{n}</small></button>')
    return '\n'.join(out)

def render_rvcards():
    out = []
    for i, r in enumerate(RV['reviews']):
        initial = (r['author'].strip() or '?')[0].upper()
        tone = MONO[i % len(MONO)]
        dishes = ''.join(f'<li>{esc(d)}</li>' for d in r.get('dishes', []))
        dishwrap = (f'<ul class="rv__dishes" aria-label="{esc("จานที่รีวิวพูดถึง")}" data-en-aria-label="Dishes this review names">{dishes}</ul>') if dishes else ''
        pic = ''
        if r.get('pic') and r['pic'] in MAN:
            th, en = cap_for(r['pic'])
            pic = (f'<figure class="rv__pic">{picture(r["pic"], "(max-width: 900px) 90vw, 30vw", th, en)}'
                   f'<figcaption data-en="{esc(en)} — the dish this review names, photographed by the restaurant">'
                   f'{esc(th)} — จานที่รีวิวพูดถึง ถ่ายโดยร้าน</figcaption></figure>')
        body = esc(r['text']).replace(chr(10), '<br>')
        trimnote = ('<p class="rv__trim small" data-en="A line about a buffet the restaurant no longer runs is left out of this quote.">ตัดบรรทัดที่พูดถึงบุฟเฟ่ต์ซึ่งร้านไม่ได้จัดแล้วออกจากคำพูดนี้</p>') if r.get('trimmed') else ''
        out.append(f"""<article class="rv" data-tags="{' '.join(r['tags'])}" data-stars="{r['stars']}">
  <header class="rv__head">
    <span class="rv__mono" aria-hidden="true" style="background:var({tone})">{esc(initial)}</span>
    <span class="rv__who"><b>{esc(r['author'])}</b><span class="rv__when small" data-en="{esc(r['when_en'])}">{esc(r['when_th'])}</span></span>
    {stars(r['stars'])}
  </header>
  <blockquote class="rv__text" lang="{r['lang']}"><p>{body}</p></blockquote>
  {trimnote}{dishwrap}{pic}
</article>""")
    return '\n'.join(out)

def render_rvstrip():
    """Home-page teaser: three reviews and the aggregate, linking to the page."""
    A = RV['aggregate']
    pick = sorted([r for r in RV['reviews'] if r['stars'] == 5], key=lambda r: len(r['text']))[:3]
    cards = []
    for i, r in enumerate(pick):
        initial = (r['author'].strip() or '?')[0].upper()
        cards.append(f"""<article class="rv rv--sm" data-reveal>
  <header class="rv__head">
    <span class="rv__mono" aria-hidden="true" style="background:var({MONO[i % len(MONO)]})">{esc(initial)}</span>
    <span class="rv__who"><b>{esc(r['author'])}</b><span class="rv__when small" data-en="{esc(r['when_en'])}">{esc(r['when_th'])}</span></span>
    {stars(r['stars'])}
  </header>
  <blockquote class="rv__text" lang="{r['lang']}"><p>{esc(r['text'][:190]) + ('…' if len(r['text']) > 190 else '')}</p></blockquote>
</article>""")
    return '\n'.join(cards)

def render_symbols():
    """The traced logo as inline <symbol>s so the ink can take currentColor."""
    def sym(path, sid):
        s = open(path, encoding='utf-8').read()
        vb = re.search(r'viewBox="([^"]+)"', s).group(1)
        body = re.sub(r'^<svg[^>]*>|</svg>$', '', s.strip())
        return f'<symbol id="{sid}" viewBox="{vb}">{body}</symbol>'
    return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' + sym('img/brand/mark.svg', 'll-mark') + sym('img/brand/lockup.svg', 'll-lockup') + '</svg>'

def render_partial(name):
    return open(f'_source/partials/{name}.html', encoding='utf-8').read().strip()

RENDER = {'rvsum': render_rvsum, 'rvchips': render_rvchips, 'rvcards': render_rvcards, 'rvstrip': render_rvstrip, 'chips': render_chips, 'lunch': render_lunch, 'sig': render_sig, 'marquee': render_marquee, 'rail': render_rail, 'menu': render_menu, 'menuld': render_menuld, 'gallery': render_gallery, 'data': render_data, 'notes': render_notes, 'symbols': render_symbols}

def build(page):
    if not os.path.exists(page): return
    s = open(page, encoding='utf-8').read()
    orig = s
    # partials first (they may contain other markers)
    s = re.sub(r'<!--#p:([a-z]+)-->.*?<!--/p:\1-->', lambda m: f'<!--#p:{m.group(1)}-->\n{render_partial(m.group(1))}\n<!--/p:{m.group(1)}-->', s, flags=re.S)
    for key, fn in RENDER.items():
        pat = re.compile(r'<!--#' + key + r'-->.*?<!--/' + key + r'-->', re.S)
        if pat.search(s):
            out = fn(page) if key == 'data' else fn()
            s = pat.sub(lambda m: f'<!--#{key}-->\n{out}\n<!--/{key}-->', s)
    # pictures: keep the marker as a comment before the rendered picture so rebuilds are idempotent
    s = re.sub(r'<!--#pic ([^>]*?)-->(?:\s*<picture[^\0]*?</picture>)?', lambda m: '<!--#pic ' + m.group(1) + '-->' + pic_marker(m), s)
    # current page in the header
    s = re.sub(r' aria-current="page"', '', s)
    s = re.sub(r'(<a class="head__link" href="' + re.escape(page) + r'" data-nav="' + re.escape(page) + r'")', r'\1 aria-current="page"', s)
    if s != orig: open(page, 'w', encoding='utf-8').write(s)
    print(f'{page:14} {len(s)//1024} KB')

for p in PAGES: build(p)
