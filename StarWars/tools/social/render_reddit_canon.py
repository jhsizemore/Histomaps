from pathlib import Path
from html import escape
import base64
import json
import math
import os
import re
import shutil
import subprocess
from PIL import Image, PngImagePlugin

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets'
DOWNLOADS = ROOT / 'downloads'
POSTER_DATA = ROOT / 'tools' / 'poster' / 'star-wars-poster-data.json'
TITLE_ART_JS = ROOT / 'title-art.js'
INSIGNIA_JS = ROOT / 'insignia.js'
TYPE = ROOT / 'tools' / 'poster' / 'star-wars-type'
OUT_SVG = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.svg'
OUT_PNG = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.png'

# Logical SVG layout is 1:3, matching the approved Reddit composition.
# Chrome rasterizes it 3x for the public PNG. Chart geometry remains vector.
VW, VH = 1280, 3840
SCALE = 3
PW, PH = VW * SCALE, VH * SCALE

GOLD = '#dfc17f'
INK = '#f2eee2'
MUTED = '#9fb0b2'
BG = '#000000'
PANEL = '#040b0f'
RULE = '#40565b'
DARK_TEXT = '#16262a'
URL = 'https://histomaps.org/starwars/'


def js_json(path, marker):
    text = path.read_text(encoding='utf-8')
    at = text.index(marker) + len(marker)
    tail = text[at:].strip()
    if tail.endswith(';'):
        tail = tail[:-1]
    return json.loads(tail)


def data_uri(path, mime=None):
    if mime is None:
        mime = {
            '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.woff': 'font/woff',
            '.woff2': 'font/woff2'
        }[path.suffix.lower()]
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def interp(points, t):
    if t <= points[0][0]:
        return points[0][1]
    for (a, ya), (b, yb) in zip(points, points[1:]):
        if t <= b:
            return ya + (yb - ya) * (t - a) / (b - a)
    return points[-1][1]


def smooth_edge(points):
    if not points:
        return ''
    d = f'M {points[0][0]:.2f} {points[0][1]:.2f}'
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        mid = (y0 + y1) / 2
        d += f' C {x0:.2f} {mid:.2f} {x1:.2f} {mid:.2f} {x1:.2f} {y1:.2f}'
    return d


def ribbon_path(left, right):
    rev = list(reversed(right))
    if not left or not rev:
        return ''
    d = smooth_edge(left)
    d += f' L {rev[0][0]:.2f} {rev[0][1]:.2f}'
    tail = smooth_edge(rev)
    tail = re.sub(r'^M [^ ]+ [^ ]+', '', tail)
    return d + tail + ' Z'


def positions(targets, heights, lo, hi, gap=7):
    """Order-preserving collision layout, adapted from the poster renderer."""
    if not targets:
        return []
    offsets = [heights[0] / 2]
    for i in range(1, len(targets)):
        offsets.append(offsets[-1] + (heights[i - 1] + heights[i]) / 2 + gap)
    blocks = []
    for i, target in enumerate(targets):
        blocks.append([i, i, target - offsets[i], 1])
        while len(blocks) > 1 and blocks[-2][2] > blocks[-1][2]:
            b = blocks.pop()
            a = blocks.pop()
            n = a[3] + b[3]
            blocks.append([a[0], b[1], (a[2] * a[3] + b[2] * b[3]) / n, n])
    result = [0] * len(targets)
    last_limit = hi - offsets[-1] - heights[-1] / 2
    if last_limit < lo:
        raise RuntimeError('Too many media labels for Reddit property panel')
    for a, b, value, _ in blocks:
        value = max(lo, min(last_limit, value))
        for i in range(a, b + 1):
            result[i] = value + offsets[i]
    return result


def year_text(t):
    if t == 0:
        return '0 YAVIN'
    return f'{abs(t):g} ' + ('BBY' if t < 0 else 'ABY')


def year_range(item):
    a, b = item['start'], item['end']
    prefix = 'c. ' if item.get('approx') else ''
    if a == b:
        return prefix + year_text(a)
    # Avoid repeating the era when both endpoints are on the same side of Yavin.
    if a < 0 and b < 0:
        text = f'{abs(a):g}–{abs(b):g} BBY'
    elif a > 0 and b > 0:
        text = f'{a:g}–{b:g} ABY'
    else:
        text = f'{year_text(a)}–{year_text(b)}'
    return prefix + text


def image_tag(href, x, y, w, h, preserve='xMidYMid meet', cls=''):
    return (f'<image x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
            f'href="{href}" preserveAspectRatio="{preserve}" class="{cls}"/>')


def text_tag(x, y, text, cls='', anchor='start', rotate=None, fill=None):
    attrs = [f'x="{x:.2f}"', f'y="{y:.2f}"', f'text-anchor="{anchor}"']
    if cls:
        attrs.append(f'class="{cls}"')
    if fill:
        attrs.append(f'fill="{fill}"')
    if rotate is not None:
        attrs.append(f'transform="rotate({rotate} {x:.2f} {y:.2f})"')
    return '<text ' + ' '.join(attrs) + '>' + escape(str(text)) + '</text>'


def render():
    data = json.loads(POSTER_DATA.read_text(encoding='utf-8'))
    title = js_json(TITLE_ART_JS, 'window.HISTOMAP.titleArt = ')
    insignia = js_json(INSIGNIA_JS, 'window.HISTOMAP.insignia=')

    title_assets = title['assets']
    # Keep the self-contained SVG compact: embed only artwork actually used by
    # this edition, not every unrelated title asset in the site bundle.
    used_title_keys = {item['id'] for item in data['screen']} | {
        'main', 'tales-underworld', 'forces-destiny'
    }
    title_href = {}
    for key in sorted(used_title_keys):
        meta = title_assets.get(key)
        if not meta:
            continue
        # Use the retained high-resolution poster lockup when available; it is the
        # same sourced title art, just less compressed than the web preview asset.
        hi_res = ROOT / 'tools' / 'poster' / 'title-art' / f'{key}.png'
        path = hi_res if hi_res.is_file() else ROOT / meta['src']
        if path.is_file():
            title_href[key] = data_uri(path)

    # Web insignia assets are already the same sourced silhouettes used by the live SVG.
    symbol_href = {key: value for key, value in insignia['assets'].items()}

    fonts = {
        'News': data_uri(TYPE / 'NewsCycle-Regular.ttf'),
        'NewsBold': data_uri(TYPE / 'NewsCycle-Bold.ttf'),
        'Pathway': data_uri(TYPE / 'PathwayGothicOne-Regular.ttf'),
        'StarJedi': data_uri(TYPE / 'starjedi.ttf'),
    }
    stars = data_uri(ASSETS / 'starfield.webp')

    out = []
    A = out.append
    A(f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{PW}" height="{PH}" viewBox="0 0 {VW} {VH}">
<defs>
<style><![CDATA[
@font-face{{font-family:News;src:url('{fonts['News']}') format('truetype')}}
@font-face{{font-family:NewsBold;src:url('{fonts['NewsBold']}') format('truetype');font-weight:700}}
@font-face{{font-family:Pathway;src:url('{fonts['Pathway']}') format('truetype')}}
@font-face{{font-family:StarJedi;src:url('{fonts['StarJedi']}') format('truetype')}}
text{{font-family:News,Arial,sans-serif;dominant-baseline:alphabetic}}
.h1{{font-family:NewsBold,Arial,sans-serif;font-weight:700;font-size:53px;letter-spacing:.5px}}
.h2{{font-family:NewsBold,Arial,sans-serif;font-weight:700;font-size:29px;letter-spacing:.8px}}
.h3{{font-family:Pathway,Arial Narrow,sans-serif;font-size:31px;letter-spacing:.5px}}
.section{{font-family:Pathway,Arial Narrow,sans-serif;font-size:31px;font-weight:700;letter-spacing:.7px}}
.small{{font-family:NewsBold,Arial,sans-serif;font-size:14px;letter-spacing:.45px}}
.micro{{font-family:NewsBold,Arial,sans-serif;font-size:11px;letter-spacing:.35px}}
.axis-num{{font-family:Pathway,Arial Narrow,sans-serif;font-size:24px}}
.axis-era{{font-family:NewsBold,Arial,sans-serif;font-size:10px;letter-spacing:.4px}}
.stream-label{{font-family:Pathway,Arial Narrow,sans-serif;font-weight:700;letter-spacing:.35px}}
.banner{{font-family:NewsBold,Arial,sans-serif;font-size:10px;letter-spacing:.2px}}
.prop-date{{font-family:NewsBold,Arial,sans-serif;font-size:11px;letter-spacing:.2px}}
.prop-kind{{font-family:NewsBold,Arial,sans-serif;font-size:10px;letter-spacing:.35px}}
.zero-logo{{font-family:Pathway,Arial Narrow,sans-serif;font-size:27px;letter-spacing:.5px}}
.footer{{font-family:NewsBold,Arial,sans-serif;font-size:13px;letter-spacing:.25px}}
]]></style>
<pattern id="starfield" width="512" height="341" patternUnits="userSpaceOnUse"><image href="{stars}" x="0" y="0" width="512" height="341" preserveAspectRatio="xMidYMid slice"/></pattern>
<linearGradient id="panelFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071218" stop-opacity=".80"/><stop offset="1" stop-color="#020608" stop-opacity=".70"/></linearGradient>
<clipPath id="mapClip"><rect x="122" y="300" width="690" height="3148"/></clipPath>
</defs>''')

    # Shared starfield, then a black wash so text and stream colors remain stable.
    A(f'<rect x="0" y="0" width="{VW}" height="{VH}" fill="url(#starfield)"/>')
    A(f'<rect x="0" y="0" width="{VW}" height="{VH}" fill="#000" opacity=".47"/>')

    # ---------------- Masthead ----------------
    A('<rect x="0" y="0" width="1280" height="210" fill="#000" opacity=".94"/>')
    A('<line x1="12" y1="202" x2="1268" y2="202" stroke="#dfc17f" stroke-width="1.5"/>')
    if 'main' in title_href:
        A(image_tag(title_href['main'], 56, 30, 290, 126))
    A('<line x1="382" y1="28" x2="382" y2="178" stroke="#dfc17f" stroke-width="3"/>')
    A(text_tag(414, 80, 'HISTOMAP', 'h1', fill=GOLD))
    A(text_tag(416, 137, 'CANON TIMELINE', 'h2', fill=INK))
    A(text_tag(417, 172, 'THE CANON GALAXY AT A GLANCE', 'small', fill=MUTED))
    # Compact promise block at the far right, matching the approved composition.
    rx = 1045
    for i, word in enumerate(['MOVIES', 'SERIES', 'ANIMATION', 'GAMES', 'ONE TIMELINE']):
        A(text_tag(rx, 42 + i * 29, word, 'small', fill=GOLD))

    # ---------------- Main panels ----------------
    map_x, map_y, map_w, map_h = 12, 218, 815, 3250
    prop_x, prop_y, prop_w, prop_h = 839, 218, 429, 3250
    for x, y, w, h in [(map_x, map_y, map_w, map_h), (prop_x, prop_y, prop_w, prop_h)]:
        A(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#panelFade)" stroke="{GOLD}" stroke-width="1.4"/>')
    A(text_tag(28, 258, 'GALACTIC POWERS', 'section', fill=GOLD))
    A(text_tag(509, 244, 'A VISUAL HISTORY OF POWER', 'micro', fill=MUTED))
    A(text_tag(509, 259, 'IN A GALAXY FAR, FAR AWAY.', 'micro', fill=MUTED))
    A('<line x1="24" y1="278" x2="815" y2="278" stroke="#40565b" stroke-width="1"/>')
    A(text_tag(855, 258, 'CANON SCREEN PROPERTIES', 'section', fill=GOLD))
    A(text_tag(855, 277, 'FILMS · TELEVISION · ANIMATION · GAMES', 'micro', fill=MUTED))
    A('<line x1="851" y1="290" x2="1256" y2="290" stroke="#40565b" stroke-width="1"/>')

    chart_top, chart_bottom = 300, 3448
    data_top, data_bottom = 110, data['height']
    axis_x = 60
    stream_x0, stream_x1 = 122, 812
    stream_w = stream_x1 - stream_x0

    def map_base(base):
        return chart_top + (base - data_top) / (data_bottom - data_top) * (chart_bottom - chart_top)

    def y_year(year):
        return map_base(interp(data['anchors'], year))

    # Year guides deliberately stay faint inside the map; the right property lane has its own anchors.
    ticks = [-500, -400, -300, -200, -100, -32, -20, -10, 0, 10, 20, 30, 40]
    last = -9999
    for t in ticks:
        y = chart_bottom - 7 if t == 40 else y_year(t)
        if y - last < 45:
            continue
        last = y
        guide = GOLD if t == 0 else '#34484d'
        opacity = '.65' if t == 0 else '.48'
        A(f'<line x1="66" y1="{y:.2f}" x2="812" y2="{y:.2f}" stroke="{guide}" stroke-width="{1.3 if t == 0 else .7}" opacity="{opacity}"/>')
        A(text_tag(axis_x, y - 4, str(abs(t)), 'axis-num', anchor='end', fill=GOLD if t == 0 else INK))
        A(text_tag(axis_x, y + 13, 'YAVIN' if t == 0 else ('BBY' if t < 0 else 'ABY'), 'axis-era', anchor='end', fill=GOLD if t == 0 else MUTED))

    # Thin Force-history lanes use the same elastic base coordinates as the live SVG.
    force_nodes = {
        'jedi': [[110,25],[660,23],[1080,25],[1309,22],[1335,3],[2130,3],[2420,5],[2690,13],[2850,16],[2910,2],[3180,4],[3370,9],[3460,9]],
        'sith': [[110,3],[660,3],[880,6],[1190,8],[1310,19],[2419,19],[2460,3],[3060,4],[3305,15],[3370,17],[3400,0],[3460,0]],
    }
    for key, cx, col in [('jedi', 89, '#9bc993'), ('sith', 108, '#d7808c')]:
        pts = force_nodes[key]
        left = [(cx - w * .28, map_base(base)) for base, w in pts]
        right = [(cx + w * .28, map_base(base)) for base, w in pts]
        A(f'<path d="{ribbon_path(left, right)}" fill="{col}" stroke="#000" stroke-width=".8"/>')
    A(text_tag(88, 507, 'HIGH REPUBLIC', 'micro', rotate=90, fill='#182820'))
    A(text_tag(88, 897, 'FALL OF THE JEDI', 'micro', rotate=90, fill='#182820'))
    A(text_tag(88, 1615, 'REIGN OF THE EMPIRE', 'micro', rotate=90, fill='#182820'))
    A(text_tag(88, 3075, 'RISE OF THE FIRST ORDER', 'micro', rotate=90, fill='#182820'))

    # Political streams: exact shared state model, converted directly to SVG paths.
    factions = data['factions'][:11]
    states = data['states']

    def state_weights(base):
        for (a, wa), (b, wb) in zip(states, states[1:]):
            if base <= b:
                t = max(0, (base - a) / (b - a))
                return [x + (z - x) * t for x, z in zip(wa, wb)]
        return states[-1][1]

    def bounds(weights, index):
        a = stream_x0 + sum(weights[:index]) / 100 * stream_w
        return a, a + weights[index] / 100 * stream_w

    for i, faction in enumerate(factions):
        active = [j for j, row in enumerate(states) if row[1][i] > 0]
        if not active:
            continue
        rows = states[max(0, active[0] - 1):min(len(states), active[-1] + 2)]
        left, right = [], []
        for base, weights in rows:
            a, b = bounds(weights, i)
            left.append((a, map_base(base)))
            right.append((b, map_base(base)))
        A(f'<path d="{ribbon_path(left, right)}" fill="{faction["color"]}" stroke="#071013" stroke-width="1.1" clip-path="url(#mapClip)"/>')

    faction_symbols = {
        'republic': 'republic', 'rebels': 'rebel', 'newRepublic': 'new-republic',
        'resistance': 'rebel', 'empire': 'empire', 'remnant': 'empire',
        'firstOrder': 'first-order', 'separatists': 'separatists', 'nihil': 'nihil',
    }

    # Label groups are constrained to their stream width; symbols never sit outside the ribbon.
    # Bounds are checked across the full glyph/logo height, not just at one centreline,
    # so curved bands cannot clip an insignia on either side.
    label_boxes = []

    def base_at_svg_y(y):
        return data_top + (y - chart_top) / (chart_bottom - chart_top) * (data_bottom - data_top)

    def safe_stream_span(index, cy, half_h):
        spans = []
        for sy in (cy - half_h, cy, cy + half_h):
            spans.append(bounds(state_weights(base_at_svg_y(sy)), index))
        return max(a for a, _ in spans), min(b for _, b in spans)

    def hits_label(box):
        l, t, r, b = box
        return any(l < or_ and r > ol and t < ob and b > ot for ol, ot, or_, ob in label_boxes)

    for i, faction in enumerate(factions):
        for t, orient in faction.get('labels', []):
            base = interp(data['anchors'], t)
            weights = state_weights(base)
            a, b = bounds(weights, i)
            wide = b - a
            if wide < 18:
                continue
            cx, y = (a + b) / 2, y_year(t)
            if faction['id'] == 'republic' and t == -21:
                y += 18
            tone = 'light' if faction['id'] in {'empire', 'remnant', 'nihil'} else 'dark'
            text_fill = INK if tone == 'light' else DARK_TEXT
            sym = faction_symbols.get(faction['id'])
            if orient == 1 or wide < 150 or faction['id'] == 'independent':
                fs = 19 if wide > 28 else 15
                label_len = max(46, len(faction['label']) * fs * .48)
                safe_a, safe_b = safe_stream_span(i, y, fs * .65)
                cx = (safe_a + safe_b) / 2
                if safe_b - safe_a < fs + 7:
                    continue
                A(text_tag(cx, y, faction['label'], 'stream-label', anchor='middle', rotate=-90, fill=text_fill).replace('class="stream-label"', f'class="stream-label" font-size="{fs}px"'))
                label_box = (cx - fs*.62, y - label_len/2, cx + fs*.62, y + label_len/2)
                label_boxes.append(label_box)

                # Put one compact emblem immediately beyond the vertical name only
                # when the curved stream has enough room at the emblem's real y.
                if sym:
                    src = symbol_href.get(sym, {}).get(tone)
                    placed = False
                    if src:
                        for size in (29, 25, 21, 17):
                            offsets = (
                                label_len/2 + size/2 + 11,
                                -label_len/2 - size/2 - 11,
                                label_len/2 + size/2 + 35,
                                -label_len/2 - size/2 - 35,
                            )
                            for offset in offsets:
                                sy = y + offset
                                if sy-size/2 < chart_top+10 or sy+size/2 > chart_bottom-8:
                                    continue
                                sa, sb = safe_stream_span(i, sy, size/2 + 2)
                                if sb-sa < size+8:
                                    continue
                                sx = (sa+sb)/2
                                box = (sx-size/2-3, sy-size/2-3, sx+size/2+3, sy+size/2+3)
                                if hits_label(box):
                                    continue
                                A(image_tag(src, sx-size/2, sy-size/2, size, size))
                                label_boxes.append(box)
                                placed = True
                                break
                            if placed:
                                break
            else:
                words = faction['label'].split(' ')
                fs = 25 if wide > 300 else 21
                icon = 43 if wide > 250 else 34
                line_h = fs * .88
                block_h = max(icon, len(words) * line_h)
                safe_a, safe_b = safe_stream_span(i, y, block_h/2 + 3)
                safe_w = safe_b-safe_a
                # The label+insignia block is centered as a single unit and always remains inside the stream.
                est_text = max(len(w) for w in words) * fs * .48
                group_w = icon + 14 + est_text
                if group_w > safe_w - 14:
                    ratio = max(.62, (safe_w - icon - 22) / max(1, est_text))
                    fs *= ratio
                    line_h = fs * .88
                    est_text = max(len(w) for w in words) * fs * .48
                    group_w = icon + 10 + est_text
                if group_w > safe_w - 8:
                    # Stream is too narrow for the horizontal composition; use a clean vertical name.
                    fs = min(18, max(13, safe_w-8))
                    cx = (safe_a+safe_b)/2
                    A(text_tag(cx, y, faction['label'], 'stream-label', anchor='middle', rotate=-90, fill=text_fill).replace('class="stream-label"', f'class="stream-label" font-size="{fs:.1f}px"'))
                    label_len = max(46, len(faction['label']) * fs * .48)
                    label_boxes.append((cx-fs*.62, y-label_len/2, cx+fs*.62, y+label_len/2))
                    continue
                cx = (safe_a+safe_b)/2
                start = cx - group_w / 2
                src = symbol_href.get(sym, {}).get(tone) if sym else None
                if src:
                    A(image_tag(src, start, y - icon/2, icon, icon))
                tx = start + icon + 10 + est_text/2
                top = y - (len(words)-1) * line_h / 2
                for j, word in enumerate(words):
                    A(text_tag(tx, top + j * line_h + fs*.3, word, 'stream-label', anchor='middle', fill=text_fill).replace('class="stream-label"', f'class="stream-label" font-size="{fs:.1f}px"'))
                label_boxes.append((start-3, y-block_h/2-3, start+group_w+3, y+block_h/2+3))

    # Five high-value chronology banners, no redundant visual key occupying the top of the chart.
    banners = [
        (-232, 'THE NIHIL CRISIS'), (-22, 'THE CLONE WARS'),
        (-19, 'THE REPUBLIC BECOMES THE EMPIRE'),
        (4, 'ENDOR: IMPERIAL POWER FRACTURES'), (34, 'THE FIRST ORDER WAR')
    ]
    for t, label in banners:
        y = y_year(t)
        A(f'<line x1="122" y1="{y:.2f}" x2="812" y2="{y:.2f}" stroke="#dfcc99" stroke-width="1" opacity=".85"/>')
        width = max(103, min(245, 16 + len(label) * 5.9))
        A(f'<rect x="133" y="{y-12:.2f}" width="{width:.2f}" height="24" rx="2" fill="#102127"/>')
        A(text_tag(142, y + 4, label, 'banner', fill=GOLD))

    # Sith Eternal fleet callout lives inside its own stream instead of crossing a logo/label.
    fleet_y = y_year(35) - 52
    eternal_index = next((i for i, f in enumerate(factions) if f['id'] == 'eternal'), None)
    if eternal_index is not None:
        ws = state_weights(interp(data['anchors'], 35))
        a, b = bounds(ws, eternal_index)
        cx = (a + b) / 2
        src = symbol_href.get('sith-eternal', {}).get('light')
        A(f'<line x1="{cx:.2f}" y1="{fleet_y:.2f}" x2="{min(800,cx+92):.2f}" y2="{fleet_y:.2f}" stroke="{INK}" stroke-width="1"/>')
        if src:
            A(image_tag(src, min(741, cx + 35), fleet_y - 14, 28, 28))
        A(text_tag(min(776, cx + 69), fleet_y + 4, 'SITH ETERNAL FLEET', 'micro', fill=INK))

    # ---------------- Property lane ----------------
    colors = {'film': GOLD, 'series': '#91c9c0', 'animation': '#91bade', 'anthology': '#d39ad6', 'game': '#8fd0ee'}
    kind_label = {'film': 'FILM', 'series': 'TV SERIES', 'animation': 'ANIMATION', 'anthology': 'ANIMATION', 'game': 'GAME'}

    media = [dict(item) for item in data['screen']]
    # Zero Company is a current canon game with a fixed Clone Wars-era schematic anchor in this static edition.
    media.append({'id': 'zero-company', 'name': 'Zero Company', 'kind': 'game', 'start': -20, 'end': -20, 'approx': True})
    same_year_order = {'mando-tv': 0, 'boba-tv': 1, 'ahsoka-tv': 2, 'skeleton-tv': 3}
    media.sort(key=lambda item: (
        (y_year(item['start']) + y_year(item['end'])) / 2,
        same_year_order.get(item['id'], 20), item['name']
    ))

    lane_x = 894
    leader_end = 948
    label_x = 958
    label_right = 1254
    label_w = label_right - label_x

    def logo_box(item):
        if item['id'] == 'zero-company':
            return 42
        meta = title_assets.get(item['id'])
        if not meta:
            return 42
        # Films retain the largest lockups; other property classes step down slightly.
        max_h = 54 if item['kind'] == 'film' else 46 if item['kind'] in {'series', 'animation'} else 43
        natural = label_w * meta['height'] / meta['width']
        return max(28, min(max_h, natural))

    heights = [logo_box(item) + 31 for item in media]
    # Pack the labels across the full panel height, while every leader still terminates
    # on its immutable true-date anchor. This preserves the approved no-dead-space UI
    # without pretending that collision-shifted titles occurred at different dates.
    usable_top, usable_bottom = chart_top + 14, chart_bottom - 13
    total_h = sum(heights)
    if len(heights) > 1:
        gap = max(4.5, (usable_bottom - usable_top - total_h) / (len(heights) - 1))
    else:
        gap = 0
    used_h = total_h + gap * max(0, len(heights) - 1)
    cursor = usable_top + max(0, (usable_bottom - usable_top - used_h) / 2)
    centers = []
    for h in heights:
        centers.append(cursor + h / 2)
        cursor += h + gap

    # A single clean vertical rail; each leader has one immutable temporal anchor.
    A(f'<line x1="{lane_x}" y1="{chart_top}" x2="{lane_x}" y2="{chart_bottom}" stroke="#6e8387" stroke-width="1" opacity=".55"/>')

    for item, h, cy in zip(media, heights, centers):
        a, b = y_year(item['start']), y_year(item['end'])
        mid = (a + b) / 2
        col = colors[item['kind']]
        # True span marker stays on the rail. Discontinuous/approximate ranges are visibly dashed.
        if abs(a - b) > .2:
            dash = ' stroke-dasharray="4 4"' if item.get('discontinuous') else (' stroke-dasharray="7 4"' if item.get('approx') else '')
            A(f'<line x1="{lane_x}" y1="{a:.2f}" x2="{lane_x}" y2="{b:.2f}" stroke="{col}" stroke-width="3"{dash}/>')
            A(f'<line x1="{lane_x-4}" y1="{a:.2f}" x2="{lane_x+4}" y2="{a:.2f}" stroke="{col}" stroke-width="1.5"/>')
            A(f'<line x1="{lane_x-4}" y1="{b:.2f}" x2="{lane_x+4}" y2="{b:.2f}" stroke="{col}" stroke-width="1.5"/>')
        else:
            if item['kind'] == 'film':
                A(f'<path d="M {lane_x} {mid-5:.2f} L {lane_x+5} {mid:.2f} L {lane_x} {mid+5:.2f} L {lane_x-5} {mid:.2f} Z" fill="{col}"/>')
            else:
                A(f'<circle cx="{lane_x}" cy="{mid:.2f}" r="4.2" fill="{PANEL}" stroke="{col}" stroke-width="2"/>')
        # The leader never runs through a lockup: horizontal, elbow, then stops before the text/logo zone.
        attach = max(cy - h/2 + 10, min(cy + h/2 - 10, mid))
        A(f'<path d="M {lane_x+5} {mid:.2f} H {leader_end-16} L {leader_end} {attach:.2f} H {label_x-7}" fill="none" stroke="{col}" stroke-width="1.1" opacity=".92"/>')

        top = cy - h/2
        logo_h = logo_box(item)
        if item['id'] == 'zero-company':
            A(text_tag(label_x + 3, top + 14, 'STAR WARS', 'micro', fill=INK))
            A(text_tag(label_x + 3, top + 43, 'ZERO COMPANY', 'zero-logo', fill=INK))
        elif item['id'] in title_href:
            A(image_tag(title_href[item['id']], label_x, top, label_w, logo_h))
        else:
            A(text_tag(label_x, top + 28, item['name'].upper(), 'h3', fill=INK))
        meta_y = top + logo_h + 17
        A(text_tag(label_x, meta_y, year_range(item), 'prop-date', fill=col))
        A(text_tag(label_right, meta_y, kind_label[item['kind']], 'prop-kind', anchor='end', fill=col))
        # Faint separators preserve the reference rhythm without boxing the title art.
        A(f'<line x1="{label_x}" y1="{top+h+1:.2f}" x2="{label_right}" y2="{top+h+1:.2f}" stroke="#2e4045" stroke-width=".7" opacity=".78"/>')

    # ---------------- Canon stories without one continuous span ----------------
    bottom_y, bottom_h = 3482, 268
    A(f'<rect x="12" y="{bottom_y}" width="1256" height="{bottom_h}" fill="#020608" fill-opacity=".88" stroke="{GOLD}" stroke-width="1.2"/>')
    A(text_tag(28, bottom_y + 33, 'CANON STORIES WITHOUT ONE CONTINUOUS SPAN', 'small', fill=INK))
    A(f'<line x1="28" y1="{bottom_y+49}" x2="1252" y2="{bottom_y+49}" stroke="#40565b" stroke-width="1"/>')

    def bottom_story(key, x, width, caption, kind='ANIMATION'):
        if key in title_href:
            A(image_tag(title_href[key], x, bottom_y + 70, width, 75))
        A(text_tag(x, bottom_y + 173, caption, 'small', fill=MUTED))
        A(text_tag(x, bottom_y + 216, kind, 'micro', fill=MUTED))

    bottom_story('tales-underworld', 55, 330, 'Short stories across the timeline.')
    A(f'<line x1="520" y1="{bottom_y+63}" x2="520" y2="{bottom_y+232}" stroke="#40565b" stroke-width="1"/>')
    bottom_story('forces-destiny', 570, 330, 'Character stories across multiple eras.')
    A(f'<line x1="980" y1="{bottom_y+63}" x2="980" y2="{bottom_y+232}" stroke="#40565b" stroke-width="1"/>')
    A(text_tag(1025, bottom_y + 105, 'DIFFERENT STORIES.', 'small', fill=GOLD))
    A(text_tag(1025, bottom_y + 136, 'THE SAME GALAXY.', 'small', fill=GOLD))

    # ---------------- Footer ----------------
    A(f'<line x1="12" y1="3772" x2="1268" y2="3772" stroke="{GOLD}" stroke-width="1.5"/>')
    A(text_tag(28, 3815, 'histomaps.org/starwars', 'footer', fill=GOLD))
    A(text_tag(1252, 3815, 'A FAN-MADE INFOGRAPHIC  ·  CANON-FOCUSED REDDIT EDITION', 'micro', anchor='end', fill=MUTED))
    A('</svg>')

    OUT_SVG.parent.mkdir(parents=True, exist_ok=True)
    OUT_SVG.write_text('\n'.join(out), encoding='utf-8')

    # Render the source SVG in Chromium so embedded fonts, title artwork, and SVG text remain exact.
    chrome = next((shutil.which(name) for name in ('google-chrome', 'google-chrome-stable', 'chrome', 'chromium', 'chromium-browser') if shutil.which(name)), None)
    if not chrome:
        raise RuntimeError('Chrome/Chromium is required to rasterize the Reddit SVG')
    tmp = OUT_PNG.with_name(OUT_PNG.stem + '-chrome.png')
    uri = OUT_SVG.resolve().as_uri()
    cmd = [
        chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars',
        '--force-device-scale-factor=1', f'--window-size={PW},{PH}',
        f'--screenshot={tmp.resolve()}', '--virtual-time-budget=1500', uri,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    rendered = Image.open(tmp).convert('RGB')
    if rendered.size != (PW, PH):
        raise RuntimeError(f'Unexpected browser render size: {rendered.size}')
    meta = PngImagePlugin.PngInfo()
    meta.add_text('Website', URL)
    meta.add_text('Description', 'Vector-source Canon-focused Star Wars Histomap Reddit edition, rendered from the same canonical timeline model as the interactive SVG. ' + URL)
    rendered.save(OUT_PNG, 'PNG', optimize=True, pnginfo=meta)
    tmp.unlink(missing_ok=True)
    print(f'Wrote {OUT_SVG} ({VW}x{VH} logical; {PW}x{PH} intrinsic)')
    print(f'Wrote {OUT_PNG} ({PW}x{PH})')


if __name__ == '__main__':
    render()
