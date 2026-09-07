#!/usr/bin/env python3
"""Fold the whole site into one self-contained HTML document.

    python3 _source/make-artifact.py

The multi-page site becomes one document with a tiny client-side router: every
page's <main> is stored in a <template>, CSS and JS are inlined, and every image
is embedded exactly once as a data: URI in a JS map (an <img> carries data-img
and is hydrated at runtime — inlining at every use would triple the file).
srcset/sizes/<source> are stripped, since one embedded copy serves every slot.
No network requests except Google Fonts, the one external origin the Artifact
CSP allows. Writes:
  _build/little-lobster-artifact.html   full document, opens from disk
  _build/little-lobster-publish.html    the same without the outer shell, for the Artifact host
"""
import base64, html, json, mimetypes, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
PAGES = ['index.html', 'menu.html', 'reviews.html', 'book.html', 'visit.html', 'gallery.html', '404.html']
MAX_W = int(os.environ.get('ARTIFACT_MAX_W', '1000'))   # the embedded size per image

def read(p): return open(p, encoding='utf-8').read()

IMG = {}
FMT = os.environ.get('ARTIFACT_FMT', 'avif')   # avif: ~2.5x smaller than jpeg; every current browser decodes it
def key_for(path):
    """Map any derivative path to the one embedded copy for that slug (≤ MAX_W)."""
    m = re.match(r'img/(.+?)-(\d+)\.(jpg|avif)$', path)
    if not m: return path
    slug = m.group(1)
    files = os.listdir('img')
    cands = sorted(int(x.group(1)) for x in re.finditer(re.escape(slug) + r'-(\d+)\.jpg', ' '.join(files)))
    cands = [w for w in cands if w <= MAX_W] or cands[:1]
    w = cands[-1]
    if FMT == 'avif' and f'{slug}-{w}.avif' in files: return f'img/{slug}-{w}.avif'
    return f'img/{slug}-{w}.jpg'

MIME = {'.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.gif': 'image/gif'}
def data_uri(path):
    mime = MIME.get(os.path.splitext(path)[1].lower()) or mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with open(path, 'rb') as f: return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())

def embed(path):
    k = key_for(path)
    if k not in IMG: IMG[k] = data_uri(k)
    return k

def rewrite_images(h):
    # <picture>: drop <source>, keep <img>
    h = re.sub(r'<source [^>]*>', '', h)
    def img(m):
        tag = m.group(0)
        srcm = re.search(r' src="([^"]+)"', tag)
        if not srcm or srcm.group(1).startswith(('data:', 'http')): return tag
        k = embed(srcm.group(1))
        tag = re.sub(r' srcset="[^"]*"', '', tag); tag = re.sub(r' sizes="[^"]*"', '', tag)
        tag = re.sub(r' src="[^"]+"', ' src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" data-img="%s"' % k, tag)
        tag = re.sub(r' data-full="([^"]+)"', lambda mm: ' data-full="%s"' % embed(mm.group(1)), tag)
        return tag
    h = re.sub(r'<img [^>]*>', img, h)
    # lightbox triggers carry the big file
    h = re.sub(r' data-lb="(img/[^"]+)"', lambda m: ' data-lb="%s"' % embed(m.group(1)), h)
    h = re.sub(r' data-full="(img/[^"]+)"', lambda m: ' data-full="%s"' % embed(m.group(1)), h)
    return h

src = read('index.html')
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
head = re.sub(r'<script>\(function\(\)\{var d=document\.documentElement.*?\}\)\(\);</script>', '', head, flags=re.S)
head = re.sub(r'\s*<link rel="stylesheet" href="css/[^"]+">', '', head)
head = re.sub(r'\s*<link rel="preload"[^>]*>', '', head)
head = re.sub(r'\s*<link rel="manifest"[^>]*>', '', head)
head = re.sub(r'\s*<link rel="canonical"[^>]*>', '', head)
head = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', '', head)
head = re.sub(r'\s*<meta property="og:[^"]*"[^>]*>', '', head)
head = re.sub(r'\s*<meta name="twitter:card"[^>]*>', '', head)
head = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', '', head, flags=re.S)
head = re.sub(r'<link rel="icon" href="favicon.svg"', '<link rel="icon" href="%s"' % data_uri('favicon.svg'), head)
head = re.sub(r'<!--#data-->.*?<!--/data-->', '', head, flags=re.S)
data_script = re.search(r'<!--#data-->\s*(<script>.*?</script>)\s*<!--/data-->', src, re.S).group(1)

css = read('css/ll.css')
js = read('js/ll.js')

body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
loader = re.search(r'(<div class="loader".*?</div>\s*</div>)', body, re.S).group(1)
top = re.search(r'<!--#p:top-->(.*?)<!--/p:top-->', body, re.S).group(1)
bottom = re.search(r'<!--#p:bottom-->(.*?)<!--/p:bottom-->', body, re.S).group(1)

templates, titles, descs = [], {}, {}
for p in PAGES:
    s = read(p)
    main = re.search(r'(<main id="main"[^>]*>)(.*?)</main>', s, re.S)
    attrs = re.search(r'class="([^"]*)"', main.group(1))
    titles[p] = {'th': re.search(r'<title[^>]*>(.*?)</title>', s, re.S).group(1), 'en': (re.search(r'<title data-en="([^"]*)"', s) or [None, ''])[1] if re.search(r'<title data-en="([^"]*)"', s) else ''}
    templates.append('<template data-page="%s" data-main-class="%s">%s</template>' % (p, attrs.group(1) if attrs else '', rewrite_images(main.group(2))))
top = rewrite_images(top); bottom = rewrite_images(bottom); loader = rewrite_images(loader)

ROUTER = r"""
/* ------------------------------------------------------------- router ----
   One document: navigation swaps <main> from a <template> and re-runs the
   page initialisers (LL.boot), so every behaviour of the multi-page site
   keeps working — menu pop and spotlight, gallery, lightbox, route, map. */
(function () {
  var TITLES = %s;
  var main = document.getElementById('main');
  function tpl(page) { return document.querySelector('template[data-page="' + page + '"]'); }
  function go(page, hash, push) {
    var t = tpl(page) || tpl('404.html');
    if (!t) return false;
    if (window.LL && LL.dishHide) LL.dishHide();
    main.innerHTML = '';
    main.className = t.getAttribute('data-main-class') || '';
    main.appendChild(t.content.cloneNode(true));
    llHydrate(main);
    var lang = document.documentElement.lang === 'en' ? 'en' : 'th';
    var tt = TITLES[page] || TITLES['index.html']; document.title = (lang === 'en' && tt.en) ? tt.en : tt.th;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (push) history.pushState({ page: page }, '', '#' + page + (hash || ''));
    if (window.LL && LL.boot) LL.boot(main);
    if (hash) { var el = document.getElementById(hash.slice(1)); if (el) { el.scrollIntoView({ behavior: 'auto', block: 'start' }); return true; } }
    window.scrollTo(0, 0);
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (!href || /^(https?:|mailto:|tel:)/.test(href)) return;
    if (href.charAt(0) === '#') return;                          /* same-page anchor: ll.js handles it */
    var parts = href.split('#'), page = parts[0].split('?')[0];
    if (!tpl(page)) return;
    e.preventDefault();
    if (window.LL && LL.closeMenu) LL.closeMenu(false);
    var hash = parts[1] ? '#' + parts[1] : '';
    /* same curtain as the multi-page site: cover, swap <main>, leave */
    if (window.LL && LL.curtain) LL.curtain.run(function () { go(page, hash, true); });
    else go(page, hash, true);
  });
  window.addEventListener('popstate', function () {
    var h = location.hash.replace('#', ''); var page = h.split('#')[0];
    go(tpl(page) ? page : 'index.html', '', false);
  });
  llHydrate(document);
  var start = location.hash.replace('#', '').split('#')[0];
  go(tpl(start) ? start : 'index.html', '', false);
})();
"""

out = """<!DOCTYPE html>
<html lang="th" class="js">
<head>
<meta charset="utf-8">
<title>%(title)s</title>
%(head)s
<style>
%(css)s
</style>
%(data)s
<script>
window.__llArtifact = true;
(function(){var d=document.documentElement;
try{if(location.search.indexOf('static=1')<0&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('has-motion');}else{d.classList.add('has-no-motion');}}catch(e){}})();
var LL_IMG = %(images)s;
function llHydrate(root) {
  (root || document).querySelectorAll('img[data-img]').forEach(function (im) {
    var s = LL_IMG[im.getAttribute('data-img')];
    if (s && im.getAttribute('src') !== s) im.setAttribute('src', s);
  });
}
</script>
</head>
<body>
%(loader)s
%(top)s
<main id="main"></main>
%(bottom)s
%(templates)s
<script>
%(js)s
</script>
<script>
%(router)s
</script>
</body>
</html>
""" % {
    'title': titles['index.html']['th'],
    'head': head.strip(),
    'css': css,
    'data': data_script,
    'images': json.dumps(IMG, ensure_ascii=False),
    'loader': loader,
    'top': top,
    'bottom': bottom,
    'templates': '\n'.join(templates),
    'js': js,
    # The router assigns these to document.title, which takes PLAIN TEXT: handing it the
    # raw markup prints 'Cafe &amp; Bistro' in the browser tab. The <title> element above
    # is the opposite case — it is markup and keeps the entities. Same strings, two encodings.
    'router': ROUTER % json.dumps(
        {p: {k: html.unescape(v) for k, v in t.items()} for p, t in titles.items()},
        ensure_ascii=False),
}
# ll.js boots the document once on load; in the artifact the router boots each page, so main is empty at that moment — harmless.
os.makedirs('_build', exist_ok=True)
OUT = '_build/little-lobster-artifact.html'
open(OUT, 'w', encoding='utf-8').write(out)

# publish copy: the Artifact host supplies doctype/html/head/body
pub = out.split('<head>', 1)[1]
pub = pub.replace('</head>\n<body>', '', 1)
pub = pub.rsplit('</body>', 1)[0]
pub = ('<script>document.documentElement.lang="th";document.documentElement.className="js";</script>\n' + pub.strip())
PUB = '_build/little-lobster-publish.html'
open(PUB, 'w', encoding='utf-8').write(pub)
mb = os.path.getsize(OUT) / 1048576
print('%s  %.2f MB  (%d images embedded)' % (OUT, mb, len(IMG)))
print('%s  %.2f MB' % (PUB, os.path.getsize(PUB) / 1048576))
if mb > 15.5: print('!! over the 16 MB ceiling — lower ARTIFACT_MAX_W'); sys.exit(1)
