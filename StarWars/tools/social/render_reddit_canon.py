from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets'
DOWNLOADS = ROOT / 'downloads'
POSTER = DOWNLOADS / 'Star-Wars-Histomap-Poster.png'
TITLE_ART = ROOT / 'title-art'
TYPE = ROOT / 'tools' / 'poster' / 'star-wars-type'
POSTER_DATA = ROOT / 'tools' / 'poster' / 'star-wars-poster-data.json'
OUT = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.png'

GOLD = '#dfc17f'
INK = '#f2eee2'
MUTED = '#a8b8b8'
BG = '#000000'
PANEL = '#050c10'
URL = 'https://histomaps.org/starwars/'


def font(name, size):
    return ImageFont.truetype(str(TYPE / name), size)


def fit_cover(im, size):
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def starfield(size, darken=0.58):
    base = fit_cover(Image.open(ASSETS / 'starfield.webp').convert('RGB'), size)
    return Image.blend(base, Image.new('RGB', size, BG), darken).convert('RGBA')


def lockup(name, max_size):
    image = Image.open(TITLE_ART / name).convert('RGBA')
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


def paste_center(canvas, image, box):
    x0, y0, x1, y1 = box
    x = x0 + (x1 - x0 - image.width) // 2
    y = y0 + (y1 - y0 - image.height) // 2
    canvas.alpha_composite(image, (x, y))


def draw_discontinuous_marker(draw, box, dots, caption):
    x0, y0, x1, y1 = box
    cy = y0 + 28
    draw.line((x0, cy, x1, cy), fill=(135, 155, 156, 150), width=3)
    for frac in dots:
        x = round(x0 + (x1 - x0) * frac)
        draw.ellipse((x - 10, cy - 10, x + 10, cy + 10), fill=GOLD, outline=INK, width=2)
    draw.text((x0, y0 + 60), caption, font=font('NewsCycle-Bold.ttf', 25), fill=MUTED)


def interp(points, t):
    if t <= points[0][0]:
        return points[0][1]
    for (a, ya), (b, yb) in zip(points, points[1:]):
        if t <= b:
            return ya + (yb - ya) * (t - a) / (b - a)
    return points[-1][1]


def render():
    # Everything below the masthead is copied at native pixel resolution from
    # the 5,200 px master poster. No chart artwork is enlarged or resampled.
    poster = Image.open(POSTER).convert('RGB')
    data = json.loads(POSTER_DATA.read_text())

    w, h = 3840, 10590
    header_h = 410
    # Start below the master poster's explanatory reading-notes strip so the
    # Reddit edition spends its pixels on the actual chart.
    source_y0, source_y1 = 970, 10400
    content_h = source_y1 - source_y0
    bottom_y = header_h + content_h

    canvas = starfield((w, h), 0.58)
    shade = Image.new('RGBA', (w, h), (2, 5, 7, 90))
    canvas = Image.alpha_composite(canvas, shade)
    d = ImageDraw.Draw(canvas)

    # Thumbnail-scale masthead: intentionally terse and high contrast.
    d.rectangle((0, 0, w, header_h), fill=(0, 0, 0, 255))
    d.line((24, 12, w - 24, 12), fill=GOLD, width=4)
    d.line((24, 390, w - 24, 390), fill=GOLD, width=3)

    main_logo = lockup('main.webp', (390, 180))
    canvas.alpha_composite(main_logo, (58, 62))
    d.text((510, 52), 'HISTOMAP', font=font('NewsCycle-Bold.ttf', 126), fill=GOLD)
    d.text((516, 190), 'CANON TIMELINE', font=font('NewsCycle-Bold.ttf', 70), fill=INK)
    d.text((518, 280), 'THE GALAXY AT A GLANCE', font=font('NewsCycle-Bold.ttf', 30), fill=MUTED)

    d.text((w - 70, 66), '500 BBY  →  35 ABY', font=font('NewsCycle-Bold.ttf', 64), fill=GOLD, anchor='ra')
    d.text((w - 70, 164), 'GALACTIC POWERS', font=font('NewsCycle-Bold.ttf', 34), fill=INK, anchor='ra')
    d.text((w - 70, 214), 'FILMS  ·  SERIES  ·  ANIMATION  ·  GAMES', font=font('NewsCycle-Bold.ttf', 28), fill=MUTED, anchor='ra')
    d.text((w - 70, 278), 'histomaps.org/starwars', font=font('NewsCycle-Bold.ttf', 30), fill=GOLD, anchor='ra')

    # Left: year axis + Force tracks + Canon galactic-power streams.
    map_crop = poster.crop((160, source_y0, 2605, source_y1)).convert('RGBA')
    # Right: aligned property-marker / title-lockup column from the master.
    media_crop = poster.crop((3150, source_y0, 4370, source_y1)).convert('RGBA')

    map_x = 50
    media_x = 2570
    content_y = header_h
    canvas.alpha_composite(map_crop, (map_x, content_y))
    canvas.alpha_composite(media_crop, (media_x, content_y))

    # Tight central divider; no unused poster columns.
    d.line((2534, content_y, 2534, bottom_y), fill=(223, 193, 127, 112), width=2)
    d.line((2555, content_y, 2555, bottom_y), fill=(87, 105, 107, 100), width=1)

    # Replace the screen-only column heading because this edition also includes games.
    d.rectangle((2720, 414, 3800, 566), fill=(2, 5, 7, 255))
    d.text((2745, 435), 'CANON PROPERTIES', font=font('NewsCycle-Bold.ttf', 37), fill=GOLD)
    d.text((2747, 491), 'FILMS · SERIES · ANIMATION · GAMES', font=font('NewsCycle-Bold.ttf', 22), fill=MUTED)

    # Enlarge the year labels modestly. The positions use the exact master
    # timeline mapping, but the typography is rendered directly at final size.
    anchors = data['anchors']
    q = 4500 / 3460

    def reddit_y(t):
        logical_y = 560 + interp(anchors, t) * q
        poster_y = 2 * logical_y
        return round(header_h + poster_y - source_y0)

    d.rectangle((0, content_y, 143, bottom_y), fill=(0, 0, 0, 255))
    ticks = [-500, -382, -232, -230, -228, -132, -100, -32, -24, -22, -20, -19, -18, -10, -9, -5, -2, 0, 3, 4, 5, 9, 28, 34, 35]
    last_y = -9999
    for t in ticks:
        y = reddit_y(t)
        if y - last_y < 94:
            continue
        last_y = y
        number = str(abs(t))
        era = 'YAVIN' if t == 0 else ('BBY' if t < 0 else 'ABY')
        color = GOLD if t == 0 else INK
        subcolor = GOLD if t == 0 else MUTED
        d.text((112, y - 34), number, font=font('PathwayGothicOne-Regular.ttf', 58), fill=color, anchor='ra')
        d.text((112, y + 27), era, font=font('NewsCycle-Bold.ttf', 24), fill=subcolor, anchor='ra')
        d.line((118, y, 139, y), fill=GOLD if t == 0 else (84, 102, 106), width=2)

    # Zero Company: canon game, set in the twilight of the Clone Wars.
    # This title was not part of the original screen-only lockup column, so it
    # is added as a crisp vector/text lockup with the same aligned marker grammar.
    zy = reddit_y(-20)
    card_x0, card_x1 = 2870, 3605
    card_y0, card_y1 = zy - 122, zy + 118
    d.rounded_rectangle((card_x0, card_y0, card_x1, card_y1), radius=10, fill=PANEL, outline=(60, 78, 83), width=2)
    d.line((2680, zy, card_x0 - 18, zy), fill=GOLD, width=3)
    d.ellipse((2668, zy - 12, 2692, zy + 12), fill=GOLD, outline=INK, width=2)
    d.text((card_x0 + 28, card_y0 + 22), 'STAR WARS', font=font('NewsCycle-Bold.ttf', 27), fill=INK)
    d.text((card_x0 + 28, card_y0 + 58), 'ZERO COMPANY', font=font('NewsCycle-Bold.ttf', 57), fill=INK)
    d.text((card_x0 + 30, card_y0 + 133), 'c. 20 BBY', font=font('NewsCycle-Bold.ttf', 28), fill=GOLD)
    d.text((card_x1 - 28, card_y0 + 133), 'GAME', font=font('NewsCycle-Bold.ttf', 27), fill=MUTED, anchor='ra')

    # Two Canon properties deliberately have no honest single continuous span.
    d.rectangle((30, bottom_y, w - 30, h - 30), fill=(2, 5, 7, 206), outline=(223, 193, 127, 120), width=2)
    d.text((70, bottom_y + 34), 'CANON STORIES WITHOUT ONE CONTINUOUS SPAN', font=font('PathwayGothicOne-Regular.ttf', 50), fill=INK)
    d.text((w - 70, bottom_y + 48), 'LOCKUPS RETAINED · FALSE CONTINUOUS RANGES AVOIDED', font=font('NewsCycle-Bold.ttf', 24), fill=MUTED, anchor='ra')

    divider_x = w // 2
    d.line((divider_x, bottom_y + 118, divider_x, h - 118), fill=(87, 105, 107, 120), width=2)

    underworld = lockup('tales-underworld.webp', (650, 190))
    paste_center(canvas, underworld, (70, bottom_y + 135, 820, bottom_y + 345))
    d.text((850, bottom_y + 158), 'TALES OF THE UNDERWORLD', font=font('NewsCycle-Bold.ttf', 34), fill=INK)
    d.text((850, bottom_y + 203), 'Cad Bane + Asajj Ventress stories occupy separate periods.', font=font('NewsCycle-Regular.ttf', 27), fill=MUTED)
    draw_discontinuous_marker(d, (850, bottom_y + 270, divider_x - 80, bottom_y + 365), (0.28, 0.72), 'SEPARATE STORY PERIODS · NO SINGLE CONTINUOUS RANGE')

    forces = lockup('forces-destiny.webp', (650, 190))
    paste_center(canvas, forces, (divider_x + 55, bottom_y + 135, divider_x + 805, bottom_y + 345))
    tx = divider_x + 835
    d.text((tx, bottom_y + 158), 'FORCES OF DESTINY', font=font('NewsCycle-Bold.ttf', 34), fill=INK)
    d.text((tx, bottom_y + 203), 'Canon shorts scattered across multiple eras.', font=font('NewsCycle-Regular.ttf', 27), fill=MUTED)
    draw_discontinuous_marker(d, (tx, bottom_y + 270, w - 80, bottom_y + 365), (0.10, 0.31, 0.54, 0.76, 0.93), 'MULTIPLE DISCONNECTED MARKERS · NOT ONE LONG STORY')

    d.line((70, h - 118, w - 70, h - 118), fill=GOLD, width=2)
    d.text((70, h - 93), 'histomaps.org/starwars', font=font('PathwayGothicOne-Regular.ttf', 45), fill=GOLD)
    d.text((w - 70, h - 78), 'J. HUNTER SIZEMORE  ·  CANON-FOCUSED REDDIT EDITION', font=font('NewsCycle-Regular.ttf', 24), fill=MUTED, anchor='ra')

    meta = PngImagePlugin.PngInfo()
    meta.add_text('Website', URL)
    meta.add_text('Description', 'Crisp high-resolution Canon-focused Star Wars Histomap Reddit edition with Zero Company, enlarged years, and thumbnail-scale masthead. ' + URL)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(OUT, 'PNG', optimize=True, pnginfo=meta)
    print(f'Wrote {OUT} ({w}x{h})')


if __name__ == '__main__':
    render()
