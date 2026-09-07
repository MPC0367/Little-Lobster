#!/usr/bin/env python3
"""Media pipeline: _real/ originals -> img/ responsive derivatives (JPEG q72 sRGB + AVIF q60).
Never upscales. Reads dimensions back from sips. Writes _source/media-manifest.json.
    python3 _source/media.py
"""
import os, re, json, subprocess, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
CROP = os.environ.get('CROP_TOOL')  # optional: path to the crop binary
OUT = 'img'; os.makedirs(OUT, exist_ok=True)
ICC = '/System/Library/ColorSync/Profiles/sRGB Profile.icc'

def dims(p):
    o = subprocess.run(['sips','-g','pixelWidth','-g','pixelHeight',p], capture_output=True, text=True).stdout
    w = re.search(r'pixelWidth: (\d+)', o); h = re.search(r'pixelHeight: (\d+)', o)
    return (int(w.group(1)), int(h.group(1))) if w and h else (0, 0)

def sips(args):
    r = subprocess.run(['sips'] + args, capture_output=True, text=True)
    return r.returncode

# slug: (source, [widths], crop (x,y,w,h) or None)
D = 'delivery'; W = 'wongnai'; F = 'facebook'
def real(sub, prefix):
    return sorted(f for f in os.listdir(f'_real/{sub}') if f.startswith(prefix) and f.lower().endswith(('.jpg','.jpeg','.png')))

JOBS = []
# delivery dish photos: slug from the filename after the number
for f in real(D, 'delivery-'):
    slug = re.sub(r'^delivery-\d+-', '', f).rsplit('.', 1)[0]
    JOBS.append((slug, f'_real/{D}/{f}', [640, 1000, 1400], None))
for f in real(W, 'wongnai-m'):
    slug = 'w-' + re.sub(r'^wongnai-m\d+-menu-', '', f).rsplit('.', 1)[0]
    JOBS.append((slug, f'_real/{W}/{f}', [640, 960], None))
# owner facebook material
JOBS += [
    ('lunch-card',    f'_real/{F}/facebook-01-lunch-set-490-menu-card.jpg', [600], None),
    ('room-bar',      f'_real/{F}/facebook-02-interior-bar-chesterfield-sofa-neighborhood-gem-graphic.jpg', [600], (0, 190, 600, 410)),
    ('studio-table',  f'_real/{F}/facebook-05-krua-khun-reed-recommends-lobster-truffle-pizza-graphic.jpg', [640, 1000, 1080], (0, 1178, 1080, 742)),
    ('beef-cheek-fb', f'_real/{F}/facebook-06-beef-cheek-burgundy-mash-plate.jpg', [640, 1000], (0, 420, 1080, 1080)),
    ('hero-lobster-sq', f'_real/{D}/delivery-01-grilled-lobster-garlic-butter.jpg', [640, 1000, 1100], (0, 300, 1109, 1109)),
    ('hero-lobster',    f'_real/{D}/delivery-01-grilled-lobster-garlic-butter.jpg', [640, 1000, 1100], (0, 235, 1109, 1244)),
    ('paper-fries-sq',  f'_real/{D}/delivery-29-mixed-fried-branded-paper.jpg', [640, 1000, 1400], (0, 475, 1425, 1425)),
]

manifest = {}
tmpdir = '_source/_tmp'; os.makedirs(tmpdir, exist_ok=True)
bad = 0
for slug, src, widths, crop in JOBS:
    if not os.path.exists(src): print('MISSING', src); bad += 1; continue
    base = src
    if crop:
        if not CROP: print('no CROP_TOOL for', slug); bad += 1; continue
        base = f'{tmpdir}/{slug}-crop.jpg'
        x, y, w, h = crop
        r = subprocess.run([CROP, src, base, str(x), str(y), str(w), str(h), str(w), '0.96'], capture_output=True, text=True)
        if r.returncode != 0: print('CROP FAIL', slug, r.stdout, r.stderr); bad += 1; continue
    sw, sh = dims(base)
    entry = {'source': src, 'crop': crop, 'src_w': sw, 'src_h': sh, 'sizes': []}
    for wdt in widths:
        if wdt > sw:
            print(f'  {slug}: target {wdt} > source {sw}, clamped'); wdt = sw
        jpg = f'{OUT}/{slug}-{wdt}.jpg'; avif = f'{OUT}/{slug}-{wdt}.avif'
        # resample by width; sips --resampleWidth keeps aspect
        if sips(['-s','format','jpeg','-s','formatOptions','72','--resampleWidth',str(wdt),'--matchTo',ICC, base,'--out',jpg]) != 0 or not os.path.getsize(jpg):
            print('SIPS FAIL', jpg); bad += 1; continue
        ow, oh = dims(jpg)
        ok_avif = sips(['-s','format','avif','-s','formatOptions','60', jpg,'--out',avif]) == 0 and os.path.exists(avif) and os.path.getsize(avif) > 0
        if not ok_avif and os.path.exists(avif): os.remove(avif)
        entry['sizes'].append({'w': ow, 'h': oh, 'jpg': jpg, 'jpg_bytes': os.path.getsize(jpg), 'avif': avif if ok_avif else None, 'avif_bytes': os.path.getsize(avif) if ok_avif else 0})
    manifest[slug] = entry
    print(f'{slug:28} {sw}x{sh} -> ' + ', '.join(f"{s['w']}x{s['h']} {s['jpg_bytes']//1024}k/{s['avif_bytes']//1024}k" for s in entry['sizes']))
shutil.rmtree(tmpdir, ignore_errors=True)
json.dump(manifest, open('_source/media-manifest.json','w'), ensure_ascii=False, indent=1)
tot = sum(os.path.getsize(os.path.join(OUT,f)) for f in os.listdir(OUT) if f.endswith(('.jpg','.avif')))
print(f'\n{len(manifest)} images, {len(os.listdir(OUT))} files, {tot/1048576:.2f} MB in img/')
prof = subprocess.run('for f in img/*.jpg; do sips -g profile "$f"; done | grep profile | sort -u', shell=True, capture_output=True, text=True).stdout
print('profiles:', prof.strip())
sys.exit(1 if bad else 0)
