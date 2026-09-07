from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets'
POSTER = ROOT / 'downloads' / 'Star-Wars-Histomap-Poster.png'
TITLE_ART = ROOT / 'title-art' / 'main.webp'
TYPE = ROOT / 'tools' / 'poster' / 'star-wars-type'
OUT = ASSETS / 'star-wars-histomap-social-card.png'

W, H = 1200, 630
GOLD = '#dfc17f'
INK = '#f2eee2'
MUTED = '#a8b8b8'
BG = '#020507'


def font(name, size):
    return ImageFont.truetype(str(TYPE / name), size)


def fit_cover(im, size):
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


canvas = fit_cover(Image.open(ASSETS / 'starfield.webp').convert('RGB'), (W, H))
canvas = Image.blend(canvas, Image.new('RGB', (W, H), BG), 0.42)

# Real chart crop: Clone Wars through Galactic Civil War, including streams,
# turning points, screen stories and lifelines. It provides recognizable project
# geometry without trying to reproduce the full tall poster in a social thumbnail.
poster = Image.open(POSTER).convert('RGB')
left, top, right, bottom = 180, 5000, 5050, 10115
crop = poster.crop((left, top, right, bottom))
crop = fit_cover(crop, (610, H))
crop = crop.filter(ImageFilter.UnsharpMask(radius=1.1, percent=115, threshold=3))

# Fade the chart into the editorial title field.
mask = Image.new('L', (610, H), 255)
md = ImageDraw.Draw(mask)
for x in range(105):
    md.rectangle((x, 0, x, H), fill=round(255 * (x / 104) ** 1.6))
canvas.paste(crop, (590, 0), mask)

overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
od.rectangle((0, 0, 665, H), fill=(2, 5, 7, 222))
for x in range(665, 760):
    alpha = round(222 * (1 - (x - 665) / 95))
    od.rectangle((x, 0, x, H), fill=(2, 5, 7, alpha))
od.rectangle((0, 0, W, H), outline=(223, 193, 127, 120), width=2)
canvas = Image.alpha_composite(canvas.convert('RGBA'), overlay)
d = ImageDraw.Draw(canvas)

# Brand / editorial hierarchy.
d.text((54, 42), 'H / HISTOMAPS', font=font('NewsCycle-Bold.ttf', 24), fill=GOLD)
d.text((566, 46), 'UNOFFICIAL FAN ATLAS', font=font('NewsCycle-Bold.ttf', 17), fill=MUTED, anchor='ra')

logo = Image.open(TITLE_ART).convert('RGBA')
logo.thumbnail((292, 126), Image.Resampling.LANCZOS)
canvas.alpha_composite(logo, (54, 98))
d.text((54, 216), 'histomap', font=font('starjedi.ttf', 61), fill=GOLD)

d.text((54, 305), 'THE HISTORY OF THE GALAXY,', font=font('PathwayGothicOne-Regular.ttf', 43), fill=INK)
d.text((54, 348), 'ALL AT ONCE.', font=font('PathwayGothicOne-Regular.ttf', 58), fill=INK)
d.text((56, 426), 'POWER  ·  STORIES  ·  LIVES  ·  ONE TIMELINE', font=font('NewsCycle-Bold.ttf', 20), fill=MUTED)

# Compact scope line.
d.rounded_rectangle((54, 478, 565, 518), radius=3, fill=(14, 29, 34, 238), outline=(87, 105, 107, 220), width=1)
d.text((70, 486), 'CANON 500 BBY—35 ABY  ·  FILMS & TV  ·  LIFELINES  ·  LEGENDS', font=font('NewsCycle-Bold.ttf', 16), fill='#c6d0cf')

d.line((54, 553, 565, 553), fill=GOLD, width=2)
d.text((54, 568), 'histomaps.org/starwars', font=font('PathwayGothicOne-Regular.ttf', 34), fill=GOLD)
d.text((566, 581), 'J. HUNTER SIZEMORE', font=font('NewsCycle-Regular.ttf', 14), fill=MUTED, anchor='ra')

OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.convert('RGB').save(OUT, 'PNG', optimize=True)
print(f'Wrote {OUT} ({W}x{H})')
