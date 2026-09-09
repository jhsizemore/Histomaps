from pathlib import Path
import base64
import re
import shutil
import subprocess
import urllib.request

from PIL import Image, PngImagePlugin

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
DOWNLOADS = ROOT / 'downloads'
TITLE_ART = ROOT / 'tools' / 'poster' / 'title-art'
SVG = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.svg'
PNG = DOWNLOADS / 'Star-Wars-Histomap-Reddit-Launch.png'

VW, VH = 1280, 3840
PW, PH = 3840, 11520
GOLD = '#dfc17f'
INK = '#f2eee2'
MUTED = '#9fb0b2'
PANEL = '#020608'
RULE = '#40565b'
URL = 'https://histomaps.org/starwars/'
ZERO_COMPANY_LOGO = (
    'https://images.ctfassets.net/seegk6e7ypwi/4OGRDyH5QDCj5H3ahtwsSo/'
    '8ee5c053e559cb95f316dd5b5f2d891e/star-wars-zero-company-product-logo.svg'
)


def file_data_uri(path, mime='image/png'):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def remote_svg_data_uri(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Histomaps/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read()
    if b'<svg' not in payload[:2000]:
        raise RuntimeError('Official Zero Company logo source did not return SVG data')
    return 'data:image/svg+xml;base64,' + base64.b64encode(payload).decode('ascii')


def image_tag(href, x, y, w, h):
    return (
        f'<image x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
        f'href="{href}" preserveAspectRatio="xMidYMid meet"/>'
    )


def text_tag(x, y, text, cls='small', fill=MUTED, anchor='start'):
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}" '
        f'class="{cls}" fill="{fill}">{text}</text>'
    )


def redraw_bottom_bar(svg):
    # Draw on top of the renderer's original bottom content. The opaque panel fill
    # deliberately replaces it, preserving the surrounding frame and heading.
    y0 = 3532
    y1 = 3748
    parts = [
        f'<g id="bottom-stories-polished">',
        f'<rect x="15" y="{y0}" width="1250" height="{y1-y0}" fill="{PANEL}"/>',
    ]
    stories = [
        ('tales-underworld', 'Short stories across the timeline.'),
        ('tales-jedi', 'Character stories across multiple eras.'),
        ('tales-empire', 'Character stories across multiple eras.'),
        ('forces-destiny', 'Short stories across multiple eras.'),
    ]
    left = 28
    total_w = 1224
    col_w = total_w / 4
    for i, (key, caption) in enumerate(stories):
        x = left + i * col_w
        if i:
            parts.append(
                f'<line x1="{x:.2f}" y1="3547" x2="{x:.2f}" y2="3729" '
                f'stroke="{RULE}" stroke-width="1"/>'
            )
        art = TITLE_ART / f'{key}.png'
        if not art.is_file():
            raise RuntimeError(f'Missing bottom-bar title art: {art}')
        href = file_data_uri(art)
        parts.append(image_tag(href, x + 17, 3552, col_w - 34, 88))
        parts.append(text_tag(x + 18, 3680, caption, 'small', MUTED))
    parts.append('</g>')
    insert = '\n'.join(parts) + '\n'
    footer_marker = '<!-- ---------------- Footer ---------------- -->'
    # Comments are Python-only and are not present in generated SVG. Insert immediately
    # before the known footer rule instead.
    rule = '<line x1="12" y1="3772" x2="1268" y2="3772"'
    at = svg.find(rule)
    if at < 0:
        raise RuntimeError('Could not find Reddit SVG footer rule')
    return svg[:at] + insert + svg[at:]


def replace_zero_company(svg):
    href = remote_svg_data_uri(ZERO_COMPANY_LOGO)
    pattern = re.compile(
        r'<text x="(?P<x>[\d.]+)" y="(?P<y1>[\d.]+)"[^>]*class="micro"[^>]*>STAR WARS</text>\n'
        r'<text x="(?P=x)" y="(?P<y2>[\d.]+)"[^>]*class="zero-logo"[^>]*>ZERO COMPANY</text>'
    )
    match = pattern.search(svg)
    if not match:
        raise RuntimeError('Could not find generated Zero Company text lockup')
    x = float(match.group('x')) - 3
    top = float(match.group('y1')) - 14
    replacement = image_tag(href, x, top, 296, 52)
    return svg[:match.start()] + replacement + svg[match.end():]


def rasterize():
    chrome = next(
        (shutil.which(name) for name in (
            'google-chrome', 'google-chrome-stable', 'chrome', 'chromium', 'chromium-browser'
        ) if shutil.which(name)),
        None,
    )
    if not chrome:
        raise RuntimeError('Chrome/Chromium is required to rasterize the polished Reddit SVG')
    tmp = PNG.with_name(PNG.stem + '-polished-chrome.png')
    cmd = [
        chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--hide-scrollbars', '--force-device-scale-factor=1', f'--window-size={PW},{PH}',
        f'--screenshot={tmp.resolve()}', '--virtual-time-budget=1800', SVG.resolve().as_uri(),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    rendered = Image.open(tmp).convert('RGB')
    if rendered.size != (PW, PH):
        raise RuntimeError(f'Unexpected polished browser render size: {rendered.size}')
    meta = PngImagePlugin.PngInfo()
    meta.add_text('Website', URL)
    meta.add_text(
        'Description',
        'Vector-source Canon-focused Star Wars Histomap Reddit edition with official Zero Company lockup, '
        'Star Wars-style Histomap masthead, enlarged year scale, and Tales anthology bottom bar. ' + URL,
    )
    rendered.save(PNG, 'PNG', optimize=True, pnginfo=meta)
    tmp.unlink(missing_ok=True)


def polish():
    svg = SVG.read_text(encoding='utf-8')

    # HISTOMAP uses the retained Star Jedi display face used elsewhere in Histomaps.
    svg = svg.replace(
        '.h1{font-family:NewsBold,Arial,sans-serif;font-weight:700;font-size:53px;letter-spacing:.5px}',
        '.h1{font-family:StarJedi,Arial,sans-serif;font-weight:400;font-size:49px;letter-spacing:1px}',
    )
    svg = svg.replace('>HISTOMAP</text>', '>histomap</text>', 1)

    # Make the left time scale substantially easier to read at Reddit zoom levels.
    svg = svg.replace(
        '.axis-num{font-family:Pathway,Arial Narrow,sans-serif;font-size:24px}',
        '.axis-num{font-family:Pathway,Arial Narrow,sans-serif;font-size:34px;font-weight:700}',
    )
    svg = svg.replace(
        '.axis-era{font-family:NewsBold,Arial,sans-serif;font-size:10px;letter-spacing:.4px}',
        '.axis-era{font-family:NewsBold,Arial,sans-serif;font-size:13px;letter-spacing:.45px}',
    )

    # Individual media-type tags repeat information already conveyed by the title art
    # and property rail; remove them from the property cards.
    svg = re.sub(r'<text [^>]*class="prop-kind"[^>]*>.*?</text>\n?', '', svg)

    svg = replace_zero_company(svg)
    svg = redraw_bottom_bar(svg)
    SVG.write_text(svg, encoding='utf-8')
    rasterize()
    print(f'Polished {SVG}')
    print(f'Rerendered {PNG} from polished SVG')


if __name__ == '__main__':
    polish()
