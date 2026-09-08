from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'assets'
DOWNLOADS = ROOT / 'downloads'
POSTER = DOWNLOADS / 'Star-Wars-Histomap-Poster.png'
TITLE_ART = ROOT / 'title-art' / 'main.webp'
TYPE = ROOT / 'tools' / 'poster' / 'star-wars-type'
SOCIAL_OUT = ASSETS / 'star-wars-histomap-social-card.png'
WEB_PREVIEW_OUT = ASSETS / 'star-wars-histomap-poster-preview.webp'

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


def starfield(size, darken=0.42):
    canvas = fit_cover(Image.open(ASSETS / 'starfield.webp').convert('RGB'), size)
    return Image.blend(canvas, Image.new('RGB', size, BG), darken)


def title_logo(max_size):
    logo = Image.open(TITLE_ART).convert('RGBA')
    logo.thumbnail(max_size, Image.Resampling.LANCZOS)
    return logo


def render_social_card(poster):
    w, h = 1200, 630
    canvas = starfield((w, h), 0.42)

    crop = poster.crop((180, 5000, 5050, 10115))
    crop = fit_cover(crop, (610, h))
    crop = crop.filter(ImageFilter.UnsharpMask(radius=1.1, percent=115, threshold=3))

    mask = Image.new('L', (610, h), 255)
    md = ImageDraw.Draw(mask)
    for x in range(105):
        md.rectangle((x, 0, x, h), fill=round(255 * (x / 104) ** 1.6))
    canvas.paste(crop, (590, 0), mask)

    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, 665, h), fill=(2, 5, 7, 222))
    for x in range(665, 760):
        alpha = round(222 * (1 - (x - 665) / 95))
        od.rectangle((x, 0, x, h), fill=(2, 5, 7, alpha))
    od.rectangle((0, 0, w - 1, h - 1), outline=(223, 193, 127, 120), width=2)
    canvas = Image.alpha_composite(canvas.convert('RGBA'), overlay)
    d = ImageDraw.Draw(canvas)

    d.text((54, 42), 'H / HISTOMAPS', font=font('NewsCycle-Bold.ttf', 24), fill=GOLD)
    d.text((566, 46), 'UNOFFICIAL FAN ATLAS', font=font('NewsCycle-Bold.ttf', 17), fill=MUTED, anchor='ra')
    logo = title_logo((292, 126))
    canvas.alpha_composite(logo, (54, 98))
    d.text((54, 216), 'histomap', font=font('starjedi.ttf', 61), fill=GOLD)
    d.text((54, 305), 'THE HISTORY OF THE GALAXY,', font=font('PathwayGothicOne-Regular.ttf', 43), fill=INK)
    d.text((54, 348), 'ALL AT ONCE.', font=font('PathwayGothicOne-Regular.ttf', 58), fill=INK)
    d.text((56, 426), 'POWER  ·  STORIES  ·  LIVES  ·  ONE TIMELINE', font=font('NewsCycle-Bold.ttf', 20), fill=MUTED)
    d.rounded_rectangle((54, 478, 565, 518), radius=3, fill=(14, 29, 34, 238), outline=(87, 105, 107, 220), width=1)
    d.text((70, 486), 'CANON 500 BBY—35 ABY  ·  FILMS & TV  ·  LIFELINES  ·  LEGENDS', font=font('NewsCycle-Bold.ttf', 16), fill='#c6d0cf')
    d.line((54, 553, 565, 553), fill=GOLD, width=2)
    d.text((54, 568), 'histomaps.org/starwars', font=font('PathwayGothicOne-Regular.ttf', 34), fill=GOLD)
    d.text((566, 581), 'J. HUNTER SIZEMORE', font=font('NewsCycle-Regular.ttf', 14), fill=MUTED, anchor='ra')

    SOCIAL_OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(SOCIAL_OUT, 'PNG', optimize=True)
    print(f'Wrote {SOCIAL_OUT} ({w}x{h})')


def render_web_preview(poster):
    target_w = 900
    target_h = round(poster.height * target_w / poster.width)
    preview = poster.resize((target_w, target_h), Image.Resampling.LANCZOS)
    preview = preview.filter(ImageFilter.UnsharpMask(radius=0.7, percent=105, threshold=2))
    WEB_PREVIEW_OUT.parent.mkdir(parents=True, exist_ok=True)
    preview.save(WEB_PREVIEW_OUT, 'WEBP', quality=82, method=6)
    print(f'Wrote {WEB_PREVIEW_OUT} ({target_w}x{target_h})')


def main():
    poster = Image.open(POSTER).convert('RGB')
    render_social_card(poster)
    from render_reddit_canon import render as render_reddit_canon
    render_reddit_canon()
    render_web_preview(poster)


if __name__ == '__main__':
    main()
