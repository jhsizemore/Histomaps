from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets'
DOWNLOADS = ROOT / 'downloads'
POSTER = DOWNLOADS / 'Star-Wars-Histomap-Poster.png'
TITLE_ART = ROOT / 'title-art'
TYPE = ROOT / 'tools' / 'poster' / 'star-wars-type'
OUT = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.png'

GOLD = '#dfc17f'
INK = '#f2eee2'
MUTED = '#a8b8b8'
BG = '#020507'
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


def starfield(size, darken=0.56):
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


def render():
    # Native-resolution crops from the 5,200 px master. Removing the Turning
    # Points and lifelines columns spends Reddit pixels on the two things this
    # edition is for: the Canon power map and every Canon screen-property lockup.
    poster = Image.open(POSTER).convert('RGB')

    w, h = 3840, 11200
    header_h = 410
    source_y0, source_y1 = 620, 10660
    content_h = source_y1 - source_y0
    bottom_y = header_h + content_h

    canvas = starfield((w, h), 0.58)
    shade = Image.new('RGBA', (w, h), (2, 5, 7, 90))
    canvas = Image.alpha_composite(canvas, shade)
    d = ImageDraw.Draw(canvas)

    # Compact header: no decorative dead zone before the chart starts.
    d.rectangle((2, 2, w - 3, h - 3), outline=(223, 193, 127, 122), width=4)
    d.text((54, 30), 'H / HISTOMAPS', font=font('NewsCycle-Bold.ttf', 34), fill=GOLD)
    d.text((w - 54, 36), 'UNOFFICIAL FAN ATLAS · STORY SPOILERS', font=font('NewsCycle-Bold.ttf', 25), fill=MUTED, anchor='ra')

    main_logo = lockup('main.webp', (390, 150))
    canvas.alpha_composite(main_logo, (54, 92))
    d.text((485, 121), 'histomap', font=font('starjedi.ttf', 86), fill=GOLD)
    d.text((1330, 110), 'CANON SCREEN TIMELINE', font=font('PathwayGothicOne-Regular.ttf', 86), fill=INK)
    d.text((1334, 204), 'GALACTIC POWERS + EVERY CANON SCREEN PROPERTY ON THE SAME BBY / ABY SCALE', font=font('NewsCycle-Bold.ttf', 30), fill=MUTED)
    d.line((54, 304, w - 54, 304), fill=(223, 193, 127, 170), width=2)
    d.text((54, 326), 'MOVIES SHOWN LARGE  ·  SERIES / ANIMATION SMALLER  ·  DASHED / BROKEN MARKERS = APPROXIMATE OR DISCONTINUOUS', font=font('NewsCycle-Bold.ttf', 26), fill='#c9d2d0')

    # Left: year axis + Force tracks + Canon galactic-power streams.
    map_crop = poster.crop((160, source_y0, 2605, source_y1)).convert('RGBA')
    # Right: the original aligned property-marker/lockup column. This retains
    # the exact vertical positions from the master instead of redrawing them.
    media_crop = poster.crop((3150, source_y0, 4370, source_y1)).convert('RGBA')

    map_x = 50
    media_x = 2570
    content_y = header_h
    canvas.alpha_composite(map_crop, (map_x, content_y))
    canvas.alpha_composite(media_crop, (media_x, content_y))

    # The narrow gap replaces two whole poster columns and makes the alignment
    # between political history and screen chronology immediately legible.
    d.line((2534, content_y, 2534, bottom_y), fill=(223, 193, 127, 112), width=2)
    d.line((2555, content_y, 2555, bottom_y), fill=(87, 105, 107, 100), width=1)

    # Two Canon properties deliberately have no honest single continuous span.
    # Keep their lockups and show broken markers rather than inventing a range.
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
    meta.add_text('Description', 'High-resolution Canon-focused Star Wars Histomap Reddit edition. ' + URL)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(OUT, 'PNG', optimize=True, pnginfo=meta)
    print(f'Wrote {OUT} ({w}x{h})')


if __name__ == '__main__':
    render()
