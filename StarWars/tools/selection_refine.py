from pathlib import Path
import re

app_path=Path('StarWars/app.js')
app=app_path.read_text()

old_group="const g=svg('g',{class:grouped?'screen-cluster':'screen-story',tabindex:0,role:'button','aria-label':`${m.name}, ${screenDate(m)}${grouped?`, ${m.items.length} titles, expand`:''}`});if(!grouped)g.dataset.screen=m.id;"
new_group="const g=svg('g',{class:grouped?'screen-cluster':'screen-story',tabindex:0,role:'button','aria-label':`${m.name}, ${screenDate(m)}${grouped?`, ${m.items.length} titles, expand`:''}`});if(grouped)g.dataset.screenGroup=m.id;else g.dataset.screen=m.id;"
assert old_group in app, 'screen group target not found'
app=app.replace(old_group,new_group,1)

old_legend="const g=svg('g',{tabindex:0,role:'button',class:'legend-stream','aria-label':`${f.name}, Legends`});"
new_legend=old_legend+"g.dataset.faction=f.id;"
assert old_legend in app, 'legend stream target not found'
app=app.replace(old_legend,new_legend,1)

new_apply=r'''  function applySelection(){
    map.querySelector('.selected-year')?.remove();map.querySelector('.screen-highlight')?.remove();
    const directFaction=selected?.type==='faction'?selected.id:null;
    const selectedEvent=selected?.type==='event'?D.events.find(v=>v.id===selected.id):null;
    const contextualFaction=directFaction||selectedEvent?.faction||null;
    map.querySelectorAll('.stream').forEach(p=>{
      const active=!!contextualFaction&&p.dataset.faction===contextualFaction;
      p.classList.toggle('dim',!!directFaction&&!active);
      p.classList.toggle('selected',active);
      p.setAttribute('aria-pressed',String(!!directFaction&&p.dataset.faction===directFaction));
    });
    const legendFaction=selected?.type==='legend-faction'?selected.id:null;
    const symbolFaction=legendFaction||contextualFaction,dimSymbols=!!directFaction||!!legendFaction;
    map.querySelectorAll('.faction-insignia').forEach(p=>{
      const active=!!symbolFaction&&p.dataset.faction===symbolFaction;
      p.classList.toggle('selected',active);
      p.classList.toggle('dim',dimSymbols&&!active);
    });
    map.querySelectorAll('.legend-stream').forEach(p=>{
      const active=!!legendFaction&&p.dataset.faction===legendFaction;
      p.classList.toggle('selected',active);
      p.classList.toggle('dim',!!legendFaction&&!active);
    });
    const eventFocus=['event','legend'].includes(selected?.type);
    map.querySelectorAll('.event').forEach(p=>{
      const active=eventFocus&&p.dataset.event===selected.id;
      p.classList.toggle('active',active);
      p.classList.toggle('dim',eventFocus&&!active);
    });
    const screenFocus=['screen','screen-group'].includes(selected?.type);
    $('screen-map').querySelectorAll('[data-screen],[data-screen-group]').forEach(p=>{
      const active=selected?.type==='screen'?p.dataset.screen===selected.id:selected?.type==='screen-group'?p.dataset.screenGroup===selected.id:false;
      p.classList.toggle('active',active);
      p.classList.toggle('dim',screenFocus&&!active);
    });
    const lifeFocus=selected?.type==='life';
    $('screen-map').querySelectorAll('[data-life]').forEach(p=>{
      const active=lifeFocus&&p.dataset.life===selected.id;
      p.classList.toggle('active',active);
      p.classList.toggle('dim',lifeFocus&&!active);
    });
    if(mode!=='canon')return;
    if(selected?.type==='event'){
      const e=D.events.find(v=>v.id===selected.id),y=eventY(e)*zoom;
      map.append(svg('line',{x1:mapX(84),x2:chartWidth-34,y1:y,y2:y,class:'selected-year'}));
    }
    const span=selected?.type==='screen'?D.screen.find(m=>m.id===selected.id):selected?.type==='screen-group'?screenGroups.find(m=>m.id===selected.id):selected?.type==='life'?D.lifelines.find(m=>m.id===selected.id):null;
    if(span){const y=yearY(span.start)*zoom,h=Math.max(2,(yearY(span.end)-yearY(span.start))*zoom);map.append(svg('rect',{x:mapX(84),y,width:chartWidth-mapX(84)-34,height:h,fill:span.color||'#e3c17c','fill-opacity':.075,class:'screen-highlight','pointer-events':'none'}));}
  }
'''
app,n=re.subn(r"  function applySelection\(\)\{.*?\n  \}\n  function overview\(\)",new_apply+"  function overview()",app,count=1,flags=re.S)
assert n==1, 'applySelection target not replaced'
app_path.write_text(app)

styles_path=Path('StarWars/styles.css')
styles=styles_path.read_text()
marker='/* selection-focus-20260907 */'
assert marker not in styles, 'selection focus styles already present'
selection_css=r'''

/* selection-focus-20260907 */
.stream,.faction-insignia,.event,.screen-story,.screen-cluster,.lifeline,.legend-stream{transition:opacity .18s ease,filter .18s ease}
.stream.dim{opacity:.11;filter:saturate(.58) brightness(.7)}
.stream.selected{filter:brightness(1.3) saturate(1.18) drop-shadow(0 0 1px rgba(255,255,255,.9)) drop-shadow(0 0 5px rgba(255,232,31,.34));stroke:#fff8d8;stroke-width:2.4}
.faction-insignia.dim{opacity:.2;filter:saturate(.5) brightness(.62)}
.faction-insignia.selected{opacity:1;filter:brightness(1.28) saturate(1.12) drop-shadow(0 0 2px rgba(255,255,255,.82)) drop-shadow(0 0 6px rgba(255,232,31,.28))}
.event.dim{opacity:.28}
.event.active{opacity:1;filter:brightness(1.08)}
.event.active .event-line{stroke:#fff1b8;stroke-width:1.8;filter:drop-shadow(0 0 2px rgba(255,255,255,.78)) drop-shadow(0 0 5px rgba(255,232,31,.4))}
.event.active .event-dot{fill:#fff3ad;stroke:#fffdf0;stroke-width:1.8;filter:drop-shadow(0 0 2px rgba(255,255,255,.88)) drop-shadow(0 0 7px rgba(255,232,31,.46))}
.event.active .event-number{fill:#172024;font-weight:700}
.selected-year{stroke:#fff1b8;stroke-width:1.4;stroke-dasharray:5 5;filter:drop-shadow(0 0 2px rgba(255,255,255,.7)) drop-shadow(0 0 5px rgba(255,232,31,.42))}
.screen-story.dim,.screen-cluster.dim{opacity:.27;filter:saturate(.62) brightness(.78)}
.screen-story.active,.screen-cluster.active{opacity:1;filter:brightness(1.18) saturate(1.22) drop-shadow(0 0 2px rgba(255,255,255,.72)) drop-shadow(0 0 6px rgba(255,255,255,.18))}
.screen-story.active .screen-card,.screen-cluster.active .screen-card{fill:#263a3f;stroke:#fff0bc;stroke-width:1.6}
.screen-story.active .screen-rail,.screen-cluster.active .screen-rail{opacity:1;stroke-width:5.5;filter:drop-shadow(0 0 2px rgba(255,255,255,.82)) drop-shadow(0 0 6px rgba(255,255,255,.22))}
.screen-story.active .screen-name,.screen-cluster.active .screen-name{fill:#fff9df}
.screen-story.active .screen-meta,.screen-cluster.active .screen-meta{fill:#e8f0eb}
.screen-highlight{stroke:#fff1bd;stroke-opacity:.3;stroke-width:1;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 4px rgba(255,232,31,.18))}
.lifeline.dim{opacity:.15;filter:saturate(.58) brightness(.72)}
.lifeline.active{opacity:1;filter:brightness(1.2) saturate(1.18) drop-shadow(0 0 2px rgba(255,255,255,.76)) drop-shadow(0 0 6px rgba(255,255,255,.19))}
.lifeline.active .life-stroke{stroke-width:5.5;filter:drop-shadow(0 0 2px rgba(255,255,255,.82)) drop-shadow(0 0 6px rgba(255,255,255,.22))}
.lifeline.active .life-label{fill:#fff0a7;stroke:#0b1518;stroke-width:7px}
.legend-stream.dim{opacity:.16;filter:saturate(.55) brightness(.68)}
.legend-stream.selected{opacity:1;filter:brightness(1.28) saturate(1.18) drop-shadow(0 0 2px rgba(255,255,255,.75)) drop-shadow(0 0 6px rgba(218,185,237,.34))}
@media(max-width:620px){.stream.selected{stroke-width:2.8}.event.active .event-dot{stroke-width:2}.screen-story.active,.screen-cluster.active,.lifeline.active{filter:brightness(1.2) saturate(1.2) drop-shadow(0 0 2px rgba(255,255,255,.72))}}
'''
styles_path.write_text(styles+selection_css)

index_path=Path('StarWars/index.html')
index=index_path.read_text()
index=index.replace('styles.css?v=desktop-20260907','styles.css?v=selection-20260907',1)
index=index.replace('app.js?v=qa-20260907','app.js?v=selection-20260907',1)
index_path.write_text(index)
