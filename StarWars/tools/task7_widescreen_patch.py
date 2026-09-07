from pathlib import Path

SW=Path(__file__).resolve().parents[1]
app=SW/'app.js'
styles=SW/'styles.css'
index=SW/'index.html'
js=app.read_text()
css=styles.read_text()
html=index.read_text()

old="""    else if(width<620){
      const share=layer==='screen'?.39:.34,min=layer==='screen'?148:128,max=layer==='screen'?166:148;
      screenWidth=Math.round(Math.min(max,Math.max(min,width*share)));
    }else screenWidth=Math.round(Math.min(310,Math.max(220,width*.27)));"""
new="""    else if(width<620){
      const share=layer==='screen'?.39:.34,min=layer==='screen'?148:128,max=layer==='screen'?166:148;
      screenWidth=Math.round(Math.min(max,Math.max(min,width*share)));
    }else if(width<1400)screenWidth=Math.round(Math.min(310,Math.max(220,width*.27)));
    else{
      const share=layer==='screen'?.23:.18,min=layer==='screen'?340:280,max=layer==='screen'?560:420;
      screenWidth=Math.round(Math.min(max,Math.max(min,width*share)));
    }"""
if old not in js: raise RuntimeError('desktop companion sizing target not found')
js=js.replace(old,new,1)

marker="""  function renderScreen(){
    const pane=$('screen-map'),W=screenWidth;pane.replaceChildren();
    screenGroups=makeScreenGroups();"""
replacement="""  function renderCompanionGuides(pane,W){
    D.eras.slice(1).forEach(era=>pane.append(svg('line',{x1:0,x2:W,y1:era.y*zoom,y2:era.y*zoom,class:'companion-era-guide','pointer-events':'none'})));
    const yavin=yearY(0)*zoom;
    pane.append(svg('line',{x1:0,x2:W,y1:yavin,y2:yavin,class:'companion-yavin-guide','pointer-events':'none'}));
  }
  function renderScreen(){
    const pane=$('screen-map'),W=screenWidth;pane.replaceChildren();
    renderCompanionGuides(pane,W);
    screenGroups=makeScreenGroups();"""
if marker not in js: raise RuntimeError('renderScreen insertion point not found')
js=js.replace(marker,replacement,1)

marker2="""  function renderLives(){
    const pane=$('screen-map'),W=screenWidth,people=D.lifelines.filter(p=>p.groups.includes(lifeGroup));pane.replaceChildren();
    pane.append(svg('text',{x:10,y:29,class:'screen-meta'},'● Birth   × Death'));"""
replacement2="""  function renderLives(){
    const pane=$('screen-map'),W=screenWidth,people=D.lifelines.filter(p=>p.groups.includes(lifeGroup));pane.replaceChildren();
    renderCompanionGuides(pane,W);
    pane.append(svg('text',{x:10,y:29,class:'screen-meta'},'● Birth   × Death'));"""
if marker2 not in js: raise RuntimeError('renderLives insertion point not found')
js=js.replace(marker2,replacement2,1)

wide_css="""

/* Final desktop / widescreen pass: use additional horizontal space for chronology context. */
.companion-era-guide{stroke:#b8c5c51b;stroke-width:1;stroke-dasharray:2 6}
.companion-yavin-guide{stroke:#e3c17c66;stroke-width:1.3;stroke-dasharray:5 5}
@media(min-width:1400px){
  :root{--header-height:56px}
  .masthead{padding-left:max(28px,env(safe-area-inset-left));padding-right:max(28px,env(safe-area-inset-right))}
  .atlas-controls{padding-left:max(24px,env(safe-area-inset-left));padding-right:max(24px,env(safe-area-inset-right));min-height:54px}
  .track-headings{min-height:32px}.stream-heading{padding-left:22px;padding-right:22px}
  #companion-heading{padding-left:12px;padding-right:12px}
  #screen-map{background:linear-gradient(90deg,#0b171c 0,#102025 18px,#102025 100%)}
  .navigation{width:300px;padding-left:26px;padding-right:26px}
  .inspector{width:min(440px,28vw);padding-left:32px;padding-right:32px}
  .inspector h2{font-size:42px}.inspector p{font-size:16px;line-height:1.78}
  .map-footer{padding-left:22px;padding-right:22px}
}
@media(min-width:2200px){
  .masthead{padding-left:max(38px,env(safe-area-inset-left));padding-right:max(38px,env(safe-area-inset-right))}
  .atlas-controls{padding-left:max(34px,env(safe-area-inset-left));padding-right:max(34px,env(safe-area-inset-right))}
  .navigation{width:320px}
  .inspector{width:min(480px,24vw);padding-left:38px;padding-right:38px}
  .screen-meta{font-size:13px}.screen-name{font-size:15px}.column-title{font-size:11px}
}
"""
if 'Final desktop / widescreen pass' not in css:
    css += wide_css

html=html.replace('styles.css?v=mobile-20260907','styles.css?v=desktop-20260907')
html=html.replace('app.js?v=mobile-20260907','app.js?v=desktop-20260907')

app.write_text(js)
styles.write_text(css)
index.write_text(html)
print('Applied final desktop / widescreen pass.')
