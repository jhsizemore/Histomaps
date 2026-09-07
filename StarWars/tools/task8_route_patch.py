from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SW=ROOT/'StarWars'
index=SW/'index.html'
readme=SW/'README.md'
renderer=SW/'tools/poster/render.py'
headers=ROOT/'_headers'
redirects=ROOT/'_redirects'

html=index.read_text()
if 'rel="canonical" href="https://histomaps.org/starwars/"' not in html:
    needle='  <meta name="description" content="Explore the rise and fall of galactic powers in an interactive Star Wars Histomap, with canon character lifelines, synchronized film and TV spans, and separate Legends histories.\">\n'
    if needle not in html: raise RuntimeError('Star Wars description meta target not found')
    html=html.replace(needle,needle+'  <link rel="canonical" href="https://histomaps.org/starwars/">\n',1)
html=html.replace('Star-Wars-Histomap-Poster.png?v=mobile-20260907','Star-Wars-Histomap-Poster.png?v=route-20260907')
index.write_text(html)

text=readme.read_text()
text=text.replace('Public route: `/StarWars/` (Cloudflare Pages static directory).','Canonical public route: `https://histomaps.org/starwars/`. The retained `StarWars/` directory is an internal deployment source; Cloudflare Pages redirects legacy/case-variant public routes and proxies the lowercase route to these static assets.')
readme.write_text(text)

py=renderer.read_text()
py=py.replace('histomaps.org/StarWars','histomaps.org/starwars')
renderer.write_text(py)

redirects.write_text('''# Star Wars canonical public route.\n# Redirect legacy and common case variants; lowercase is the only public URL.\n/StarWars /starwars/ 301\n/StarWars/ /starwars/ 301\n/StarWars/index.html /starwars/ 301\n/StarWars/* /starwars/:splat 301\n/STARWARS /starwars/ 301\n/STARWARS/ /starwars/ 301\n/STARWARS/* /starwars/:splat 301\n/Starwars /starwars/ 301\n/Starwars/ /starwars/ 301\n/Starwars/* /starwars/:splat 301\n/starWars /starwars/ 301\n/starWars/ /starwars/ 301\n/starWars/* /starwars/:splat 301\n/starwars /starwars/ 301\n\n# Serve the existing static tree behind the lowercase browser URL.\n# Cloudflare Pages applies only the first matching rule, so this proxy does not loop\n# back through the uppercase redirect above.\n/starwars/ /StarWars/index.html 200\n/starwars/* /StarWars/:splat 200\n''')

h=headers.read_text().replace('\r\n','\n')
canon='''\n/starwars/\n  Link: <https://histomaps.org/starwars/>; rel="canonical"\n'''
if '/starwars/\n  Link: <https://histomaps.org/starwars/>; rel="canonical"' not in h:
    h=h.rstrip()+canon+'\n'
headers.write_text(h)

print('Canonicalized Star Wars public route to https://histomaps.org/starwars/.')
