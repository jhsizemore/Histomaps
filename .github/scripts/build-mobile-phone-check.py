#!/usr/bin/env python3
from pathlib import Path
import base64
import re

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'histomap_v0_34_149_zoom_elastic_lifelines_titles_tooltips.html'
PATCHES = [ROOT / f'deploy/v0.35.3.patch.part0{i}' for i in range(1, 5)]
OUT = Path('/tmp/histomap-mobile-qa/Histomap-v0.36.1-phone-check.html')


def apply_unified_patch(source: str, patch: str) -> str:
    source_had_final_newline = source.endswith('\n')
    lines = source.replace('\r\n', '\n').split('\n')
    if source_had_final_newline and lines and lines[-1] == '':
        lines.pop()
    p = patch.replace('\r\n', '\n').split('\n')
    offset = 0
    i = 0
    while i < len(p):
        m = re.match(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', p[i])
        if not m:
            i += 1
            continue
        old_start = int(m.group(1))
        old_count = 1 if m.group(2) is None else int(m.group(2))
        replacement, expected = [], []
        i += 1
        while i < len(p) and not p[i].startswith('@@ '):
            row = p[i]
            if row.startswith('--- ') or row.startswith('+++ ') or row == r'\ No newline at end of file':
                i += 1
                continue
            tag, text = (row[0], row[1:]) if row else (' ', '')
            if tag == ' ':
                expected.append(text)
                replacement.append(text)
            elif tag == '-':
                expected.append(text)
            elif tag == '+':
                replacement.append(text)
            i += 1
        at = old_start - 1 + offset
        actual = lines[at:at + old_count]
        if actual != expected:
            raise RuntimeError(f'Patch context mismatch near source line {old_start}')
        lines[at:at + old_count] = replacement
        offset += len(replacement) - old_count
    return '\n'.join(lines) + ('\n' if source_had_final_newline else '')


def data_uri(path: Path, mime: str) -> str:
    payload = base64.b64encode(path.read_bytes()).decode('ascii')
    return f'data:{mime};base64,{payload}'


source = BASE.read_text(encoding='utf-8')
patch = ''.join(path.read_text(encoding='utf-8') for path in PATCHES)
html = apply_unified_patch(source, patch)

mobile_css = (ROOT / 'world/mobile-v0.36.css').read_text(encoding='utf-8')
fix_css = (ROOT / 'world/mobile-v0.36.1-fixes.css').read_text(encoding='utf-8')
mobile_js = (ROOT / 'world/mobile-v0.36.js').read_text(encoding='utf-8')
fix_js = (ROOT / 'world/mobile-v0.36.1-fixes.js').read_text(encoding='utf-8')

logo_uri = data_uri(ROOT / 'assets/histomap-logo.svg', 'image/svg+xml')
favicon_uri = data_uri(ROOT / 'assets/favicon.svg', 'image/svg+xml')

for src in [
    'src="assets/histomap-logo.svg"',
    'src="../assets/histomap-logo.svg?v=366"',
    'src="../assets/histomap-logo.svg"'
]:
    html = html.replace(src, f'src="{logo_uri}"')
for href in [
    'href="assets/favicon.svg"',
    'href="../assets/favicon.svg?v=366"',
    'href="../assets/favicon.svg"'
]:
    html = html.replace(href, f'href="{favicon_uri}"')

head_injection = f'''\n<meta name="theme-color" content="#eee5d6">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<style id="histomap-mobile-v036-inline">\n{mobile_css}\n</style>\n<style id="histomap-mobile-v0361-refinement-inline">\n{fix_css}\n</style>\n'''
html = html.replace('</head>', head_injection + '</head>', 1)

script_injection = f'''\n<script>\n{mobile_js}\n</script>\n<script>\n{fix_js}\n</script>\n'''
html = html.replace('</body>', script_injection + '</body>', 1)

html = html.replace('<title>', '<title>PHONE CHECK · ', 1)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding='utf-8')

text = OUT.read_text(encoding='utf-8', errors='ignore')
required = [
    'HISTOMAP_MOBILE_V0361',
    'HISTOMAP_MOBILE_V0361_REFINEMENT',
    'hm-thumb-dock',
    'viewport-true context year',
    '<svg id="histomap"'
]
for needle in required:
    if needle not in text:
        raise RuntimeError(f'Standalone phone build missing {needle!r}')
if OUT.stat().st_size < 4_000_000:
    raise RuntimeError(f'Standalone phone build unexpectedly small: {OUT.stat().st_size}')
print(f'Built {OUT} ({OUT.stat().st_size:,} bytes)')
