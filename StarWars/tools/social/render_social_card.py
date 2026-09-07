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
REDDIT_OUT = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.png'
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


def fit_contain(im, size):
    tw, th = size
    scale = min(tw / im.width, th / im.height)
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)


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


def render_reddit_launch(poster):
    w, h = 2400, 3000
    canvas = starfield((w, h), 0.54).convert('RGBA')
    wash = Image.new('RGBA', (w, h), (2, 5, 7, 148))
    canvas = Image.alpha_composite(canvas, wash)
    d = ImageDraw.Draw(canvas)

    d.rectangle((2, 2, w - 3, h - 3), outline=(223, 193, 127, 128), width=4)
    d.text((100, 82), 'H / HISTOMAPS', font=font('NewsCycle-Bold.ttf', 42), fill=GOLD)
    d.text((2300, 92), 'UNOFFICIAL FAN ATLAS · STORY SPOILERS', font=font('NewsCycle-Bold.ttf', 28), fill=MUTED, anchor='ra')

    logo = title_logo((520, 220))
    canvas.alpha_composite(logo, (100, 160))
    d.text((670, 230), 'histomap', font=font('starjedi.ttf', 102), fill=GOLD)
    d.text((100, 430), 'THE HISTORY OF THE STAR WARS GALAXY', font=font('PathwayGothicOne-Regular.ttf', 93), fill=INK)
    d.text((100, 520), 'POWER · STORIES · LIVES · ONE TIMELINE', font=font('NewsCycle-Bold.ttf', 38), fill=MUTED)
    d.rounded_rectangle((100, 592, 2300, 658), radius=5, fill=(14, 29, 34, 225), outline=(87, 105, 107, 220), width=2)
    d.text((130, 605), 'CANON 500 BBY—35 ABY   ·   FILMS & TV   ·   CHARACTER LIFELINES   ·   LEGENDS KEPT SEPARATE', font=font('NewsCycle-Bold.ttf', 27), fill='#c6d0cf')

    # Three magnified real-poster windows chosen to survive Reddit's feed compression.
    strips = [
        ('FALL OF THE JEDI', (90, 3750, 5110, 5400)),
        ('AGE OF REBELLION', (90, 7900, 5110, 9550)),
        ('NEW REPUBLIC + FIRST ORDER', (90, 11250, 5110, 12900)),
    ]
    y = 735
    strip_w, strip_h = 2200, 575
    for label, box in strips:
        crop = poster.crop(box)
        crop = fit_cover(crop, (strip_w, strip_h))
        crop = crop.filter(ImageFilter.UnsharpMask(radius=1.0, percent=120, threshold=2))
        canvas.paste(crop, (100, y))
        shade = Image.new('RGBA', (strip_w, 62), (0, 0, 0, 172))
        canvas.alpha_composite(shade, (100, y))
        d.text((128, y + 12), label, font=font('NewsCycle-Bold.ttf', 30), fill=INK)
        d.rectangle((100, y, 2300, y + strip_h), outline=(223, 193, 127, 126), width=2)
        y += strip_h + 55

    d.line((100, 2675, 2300, 2675), fill=GOLD, width=3)
    d.text((100, 2710), 'FULL 5,200 × 18,220 POSTER + INTERACTIVE MAP', font=font('NewsCycle-Bold.ttf', 35), fill=MUTED)
    d.text((100, 2760), 'histomaps.org/starwars', font=font('PathwayGothicOne-Regular.ttf', 72), fill=GOLD)
    d.text((2300, 2784), 'J. HUNTER SIZEMORE', font=font('NewsCycle-Regular.ttf', 27), fill=MUTED, anchor='ra')
    d.text((100, 2870), 'Use this image for the native Reddit post; link the complete vertical poster and interactive atlas in the post body or first comment.', font=font('NewsCycle-Regular.ttf', 27), fill='#aebbbb')

    REDDIT_OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(REDDIT_OUT, 'PNG', optimize=True)
    print(f'Wrote {REDDIT_OUT} ({w}x{h})')


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
    render_reddit_launch(poster)
    render_web_preview(poster)


if __name__ == '__main__':
    main()
