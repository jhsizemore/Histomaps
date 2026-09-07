from pathlib import Path

index_path=Path('StarWars/index.html')
index=index_path.read_text()

# Remove the mistakenly used cursive Imperial Script webfont.
for line in [
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n',
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n',
'  <link href="https://fonts.googleapis.com/css2?family=Imperial+Script&display=swap" rel="stylesheet">\n',
]:
    index=index.replace(line,'')

index=index.replace('styles.css?v=imperial-20260907','styles.css?v=aurebesh-20260907',1)
index=index.replace('app.js?v=imperial-20260907','app.js?v=aurebesh-20260907',1)
index=index.replace('launch-script-flourish','launch-aurebesh-flourish')
index=index.replace('imperial-archive-mark','aurebesh-archive-mark')
index=index.replace('imperial-active-mark','aurebesh-active-mark')
index=index.replace('Star Jedi by Boba Fonts supplies the display lettering. News Cycle and Pathway Gothic One carry the readable supporting text.',
                    'Star Jedi by Boba Fonts supplies the display lettering. News Cycle and Pathway Gothic One carry the readable supporting text; FT Aurebesh supplies small decorative in-universe interface markings.')
index_path.write_text(index)

app_path=Path('StarWars/app.js')
app=app_path.read_text()
app=app.replace('appendImperialActive','appendAurebeshActive')
app=app.replace('imperial-active-mark','aurebesh-active-mark')
app_path.write_text(app)

styles_path=Path('StarWars/styles.css')
styles=styles_path.read_text()
marker='/* imperial-script-accents-20260907'
pos=styles.find(marker)
assert pos!=-1, 'old Imperial Script accent block not found'
styles=styles[:pos].rstrip()+r'''

/* aurebesh-accents-20260907
   FT Aurebesh is decorative only: readable UI labels remain in News Cycle / Pathway. */
@font-face{font-family:'FT Aurebesh';src:url('fonts/ft-aurebesh.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
.inspector-archive-label{display:grid;align-content:center;gap:1px;min-width:0;padding:3px 0 2px}
.aurebesh-archive-mark,.aurebesh-active-mark,.launch-aurebesh-flourish{font-family:'FT Aurebesh',monospace;font-style:normal;font-synthesis:none;text-transform:none;white-space:nowrap}
.aurebesh-archive-mark{display:block;margin-top:1px;font-size:11px;line-height:1.05;font-weight:560;letter-spacing:.12em;color:#d8c38da8;text-shadow:0 0 7px #e3c17c12}
.aurebesh-active-mark{display:inline-block;margin-left:10px;font-size:9px;line-height:1;font-weight:580;letter-spacing:.1em;color:#69d9efb8;text-shadow:0 0 7px #4bd5ee20;vertical-align:1px}
.launch-aurebesh-flourish{font-size:11px;line-height:1;font-weight:520;letter-spacing:.14em;color:#d7c28b9b;text-shadow:0 0 7px #ffe81f12;text-align:center;align-self:center}
@media(max-width:700px){
  .aurebesh-archive-mark{font-size:10px;letter-spacing:.1em}.aurebesh-active-mark{font-size:8px;margin-left:7px}.launch-aurebesh-flourish{font-size:10px;letter-spacing:.12em}
  .launch-foot{grid-template-columns:1fr}.launch-aurebesh-flourish{grid-row:2}.launch-foot>span:last-child{grid-row:3}
}
@media(max-height:500px) and (orientation:landscape){.aurebesh-archive-mark{font-size:9px}.aurebesh-active-mark{font-size:8px}}
'''
styles_path.write_text(styles)

credits_path=Path('StarWars/fonts/credits.txt')
credits=credits_path.read_text()
credits=credits.replace('Imperial Script by Robert Leuschke: SIL Open Font License 1.1. Used only for small decorative interface accents and loaded through Google Fonts. https://github.com/googlefonts/imperial-script\n','')
if 'FT Aurebesh by Rodrigo Fuenzalida' not in credits:
    credits=credits.replace('WOFF copies preserve font outlines and metadata.\n',
        'FT Aurebesh by Rodrigo Fuenzalida / fragTYPE: SIL Open Font License 1.1; see ft-aurebesh-OFL.txt. Used only for decorative in-universe Aurebesh interface accents. https://www.behance.net/gallery/169610961/FT-Aurebesh\nWOFF/WOFF2 copies preserve font outlines and metadata.\n')
credits_path.write_text(credits)
