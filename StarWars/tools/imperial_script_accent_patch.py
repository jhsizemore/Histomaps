from pathlib import Path

index_path=Path('StarWars/index.html')
index=index_path.read_text()

# Load the OFL Imperial Script face from Google Fonts, but keep every usage decorative.
needle='  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 40 40\'%3E%3Crect width=\'40\' height=\'40\' rx=\'8\' fill=\'%2311191c\'/%3E%3Ctext x=\'20\' y=\'29\' text-anchor=\'middle\' font-size=\'29\' fill=\'%23efd493\' font-family=\'serif\'%3EH%3C/text%3E%3C/svg%3E">\n'
assert needle in index
fonts=(needle+
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
'  <link href="https://fonts.googleapis.com/css2?family=Imperial+Script&display=swap" rel="stylesheet">\n')
index=index.replace(needle,fonts,1)
index=index.replace('styles.css?v=synopsis-20260907','styles.css?v=imperial-20260907',1)
index=index.replace('app.js?v=synopsis-20260907','app.js?v=imperial-20260907',1)

old='<div class="launch-foot"><span>Scroll downward through time · select any stream or event</span><span>By J. Hunter Sizemore · histomaps.org</span></div>'
new='<div class="launch-foot"><span>Scroll downward through time · select any stream or event</span><span class="launch-script-flourish" aria-hidden="true">across the ages</span><span>By J. Hunter Sizemore · histomaps.org</span></div>'
assert old in index
index=index.replace(old,new,1)

old='<aside id="inspector" class="inspector" aria-label="Selected story" hidden><div class="inspector-bar"><span class="eyebrow">ARCHIVE RECORD</span><button id="close-inspector" aria-label="Close story">×</button></div><div id="inspector-content"></div></aside>'
new='<aside id="inspector" class="inspector" aria-label="Selected story" hidden><div class="inspector-bar"><div class="inspector-archive-label"><span class="eyebrow">ARCHIVE RECORD</span><span class="imperial-archive-mark" aria-hidden="true">Galactic Archives</span></div><button id="close-inspector" aria-label="Close story">×</button></div><div id="inspector-content"></div></aside>'
assert old in index
index=index.replace(old,new,1)
index_path.write_text(index)

app_path=Path('StarWars/app.js')
app=app_path.read_text()
needle="  function appendSynopsis(target,data){if(data?.synopsis)target.append(el('p','record-synopsis',data.synopsis));}\n"
assert needle in app and 'appendImperialActive' not in app
app=app.replace(needle,needle+"  function appendImperialActive(target){const date=target.querySelector('.record-date');if(!date)return;const mark=el('span','imperial-active-mark','active record');mark.setAttribute('aria-hidden','true');date.append(mark);}\n",1)

old="    $('inspector').hidden=false;$('inspector').classList.add('open');$('inspector').scrollTop=0;applySelection();heading.focus({preventScroll:true});\n"
new="    appendImperialActive(box);$('inspector').hidden=false;$('inspector').classList.add('open');$('inspector').scrollTop=0;applySelection();heading.focus({preventScroll:true});\n"
assert app.count(old)==1
app=app.replace(old,new,1)

old="    $('inspector').hidden=false;$('inspector').classList.add('open');$('inspector').scrollTop=0;heading.tabIndex=-1;applySelection();heading.focus({preventScroll:true});\n"
new="    appendImperialActive(box);$('inspector').hidden=false;$('inspector').classList.add('open');$('inspector').scrollTop=0;heading.tabIndex=-1;applySelection();heading.focus({preventScroll:true});\n"
assert app.count(old)==1
app=app.replace(old,new,1)
app_path.write_text(app)

styles_path=Path('StarWars/styles.css')
styles=styles_path.read_text()
marker='/* imperial-script-accents-20260907 */'
assert marker not in styles
styles += r'''

/* imperial-script-accents-20260907
   Imperial Script is decorative only: readable UI labels remain in News Cycle / Pathway. */
.inspector-archive-label{display:grid;align-content:center;gap:0;min-width:0;padding:3px 0 2px}
.imperial-archive-mark,.imperial-active-mark,.launch-script-flourish{font-family:'Imperial Script','Brush Script MT','Segoe Script',cursive;font-weight:400;font-synthesis:none;letter-spacing:0;text-transform:none}
.imperial-archive-mark{display:block;margin-top:-2px;font-size:20px;line-height:1;color:#d8c38dbd;text-shadow:0 0 9px #e3c17c16;transform:rotate(-1deg);transform-origin:left center;white-space:nowrap}
.imperial-active-mark{display:inline-block;margin-left:10px;font-size:17px;line-height:1;color:#67d9efaa;text-shadow:0 0 9px #4bd5ee1c;vertical-align:-2px;transform:rotate(-1.5deg);transform-origin:left center;white-space:nowrap}
.launch-script-flourish{font-size:23px;line-height:1;color:#d7c28bb5;text-shadow:0 0 9px #ffe81f14;transform:rotate(-1.5deg);white-space:nowrap;text-align:center;align-self:center}
@media(max-width:700px){
  .imperial-archive-mark{font-size:18px}.imperial-active-mark{font-size:15px;margin-left:7px}.launch-script-flourish{font-size:20px}
  .launch-foot{grid-template-columns:1fr}.launch-script-flourish{grid-row:2}.launch-foot>span:last-child{grid-row:3}
}
@media(max-height:500px) and (orientation:landscape){.imperial-archive-mark{font-size:16px}.imperial-active-mark{font-size:14px}}
'''
styles_path.write_text(styles)
