# Star Wars Histomap poster

Retained native chart source for the 5,200 × 18,220 PNG. Requires Python 3 and Pillow for local rendering.

Run `python tools/poster/render.py` from either the Sites checkout or the public StarWars directory. The renderer finds the matching public assets and writes `downloads/Star-Wars-Histomap-Poster.png`. Add `--preview-dir /absolute/temporary/path` to create inspection crops and placement manifests.

The shared background is `assets/starfield.webp`. It is original AI-generated starfield artwork, drawn below all native chart content. The source retains exact timeline data, type, insignia, and title artwork. Font licenses are in the public `fonts` directory; artwork attribution is retained in the manifests and generated PNG.

In the repository, `.github/workflows/starwars-generated-assets.yml` is the authoritative automated build. It runs `audit-data-sync.js` before rendering, generates this poster and the 1,200 × 630 social preview, validates dimensions and canonical metadata, uploads review artifacts for pull requests/manual runs, and commits changed generated files automatically after qualifying pushes to `main`.
