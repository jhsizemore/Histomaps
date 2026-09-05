(() => {
  'use strict';
  const D=window.HISTOMAP, NS='http://www.w3.org/2000/svg';
  const $=id=>document.getElementById(id), map=$('map'), scroller=$('map-scroll');
  let zoom=1, level=2, selected=null, history=[], lastFocus=null, resizeWidth=0;
  let mode='canon', showScreen=true, chartWidth=620, screenWidth=360, renderedHeight=D.height;
  const factions=Object.fromEntries(D.factions.map(f=>[f.id,f]));
  const formatYear=y=>y<0?`${Math.abs(y)} BBY`:y===0?'0 · YAVIN':`${y} ABY`;
  const date=e=>e.date||`${e.approx?'c. ':''}${formatYear(e.year)}`;
  function yearY(t){
    if(t<=D.anchors[0][0])return D.anchors[0][1];
    for(let i=1;i<D.anchors.length;i++){
      const [b,yb]=D.anchors[i],[a,ya]=D.anchors[i-1];
      if(t<=b)return ya+(yb-ya)*(t-a)/(b-a);
    }
    return D.anchors.at(-1)[1];
  }
  const eventY=e=>e.y??yearY(e.year);
  const sortedEvents=[...D.events].sort((a,b)=>eventY(a)-eventY(b));
  function svg(tag,attrs={},text){
    const el=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function sourceLink(key){
    const [label,url]=D.sources[key];const a=el('a','source-link',`${label} ↗`);
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function weightsAt(y){
    for(let i=1;i<D.states.length;i++){
      const [a,wa]=D.states[i-1],[b,wb]=D.states[i];
      if(y<=b){const t=Math.max(0,(y-a)/(b-a));return wa.map((v,j)=>v+(wb[j]-v)*t);}
    }
    return D.states.at(-1)[1];
  }
  function limits(weights,i){const left=166+weights.slice(0,i).reduce((a,b)=>a+b,0)*4.34;return [left,left+weights[i]*4.34];}
  function edges(points,xs,ys){
    let d=`M ${points[0][0]*xs} ${points[0][1]*ys}`;
    for(let i=1;i<points.length;i++){
      const [a,ya]=points[i-1],[b,yb]=points[i],m=(ya+yb)/2;
      d+=` C ${a*xs} ${m*ys},${b*xs} ${m*ys},${b*xs} ${yb*ys}`;
    }
    return d;
  }
  function ribbon(left,right,xs=1,ys=1){
    const rev=[...right].reverse();let d=edges(left,xs,ys)+` L ${rev[0][0]*xs} ${rev[0][1]*ys}`;
    return d+edges(rev,xs,ys).replace(/^M [^ ]+ [^ ]+/,'')+' Z';
  }
  function politicalPath(i,xs=1,ys=1){
    const active=D.states.map((r,j)=>r[1][i]>0?j:-1).filter(j=>j>=0);
    if(!active.length)return '';
    const rows=D.states.slice(Math.max(0,active[0]-1),Math.min(D.states.length,active.at(-1)+2));
    const left=[],right=[];
    rows.forEach(([y,w])=>{const [l,r]=limits(w,i);left.push([l,y]);right.push([r,y]);});
    return ribbon(left,right,xs,ys);
  }
  const forceNodes={
    jedi:[[110,25],[660,23],[1080,25],[1309,22],[1335,3],[2130,3],[2420,5],[2690,13],[2850,16],[2910,2],[3180,4],[3370,9],[3460,9]],
    sith:[[110,3],[660,3],[880,6],[1190,8],[1310,19],[2419,19],[2460,3],[3060,4],[3305,15],[3370,17],[3400,0],[3460,0]]
  };
  function forcePath(id,xs,ys){const cx=id==='jedi'?100:139;const pts=forceNodes[id];return ribbon(pts.map(([y,w])=>[cx-w/2,y]),pts.map(([y,w])=>[cx+w/2,y]),xs,ys);}
  function addStream(target,f,d,interactive){
    const path=svg('path',{d,fill:f.color,class:interactive?'stream':'',...(interactive?{tabindex:0,role:'button','aria-label':`Explore ${f.name}`}:{})});
    if(interactive){
      path.dataset.faction=f.id;
      path.append(svg('title',{},f.name));
      path.addEventListener('click',()=>openRecord({type:'faction',id:f.id}));
      path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRecord({type:'faction',id:f.id});}});
    }
    target.append(path);
  }
  function textLines(target,text,x,y,maxChars,cls,line=18){
    const words=text.split(' '),lines=[];let row='';
    words.forEach(word=>{if(row&&(row+' '+word).length>maxChars){lines.push(row);row=word;}else row+=(row?' ':'')+word;});if(row)lines.push(row);
    const n=svg('text',{x,y,class:cls});
    lines.forEach((s,i)=>n.append(svg('tspan',{x,dy:i===0?0:line},s)));target.append(n);return lines.length;
  }
  function renderCanon(){
    const W=chartWidth, xs=W/820, H=D.height*zoom;
    map.replaceChildren();map.setAttribute('viewBox',`0 0 ${W} ${H}`);map.style.height=`${H}px`;
    const bg=svg('g');
    [84,119,157,612].forEach(x=>bg.append(svg('line',{x1:x*xs,x2:x*xs,y1:72*zoom,y2:H,stroke:'#526c6938','stroke-width':1})));
    map.append(bg);
    const bandGroup=svg('g');D.factions.slice(0,11).forEach((f,i)=>addStream(bandGroup,f,politicalPath(i,xs,zoom),true));
    ['jedi','sith'].forEach(id=>addStream(bandGroup,factions[id],forcePath(id,xs,zoom),true));map.append(bandGroup);
    map.append(svg('text',{x:18*xs,y:31,class:'column-title'},'DATE'));
    map.append(svg('text',{x:87*xs,y:31,class:'column-title'},'FORCE'));
    map.append(svg('text',{x:166*xs,y:31,class:'column-title'},'GALACTIC POWERS'));
    map.append(svg('text',{x:638*xs,y:31,class:'column-title'},'TURNING POINTS'));
    map.append(svg('text',{x:89*xs,y:53,class:'column-title',fill:factions.jedi.color},'J'));
    map.append(svg('text',{x:135*xs,y:53,class:'column-title',fill:factions.sith.color},'S'));
    const ticks=[-500,-382,-232,-230,-132,-100,-32,-24,-22,-20,-19,-10,-9,-5,-2,0,3,4,5,9,28,34,35];
    let prevTick=-100;
    ticks.forEach(year=>{
      const y=yearY(year)*zoom;
      if(y-prevTick<29&&![0,-19,35].includes(year))return;prevTick=y;
      map.append(svg('line',{x1:71*xs,x2:615*xs,y1:y,y2:y,class:'grid-line'}));
      const n=svg('text',{x:66*xs,y:y-7,'text-anchor':'end',class:`axis-year ${year===0?'axis-zero':''}`},year===0?'0':Math.abs(year).toString());
      n.append(svg('tspan',{x:66*xs,dy:15,'font-size':10},year<0?'BBY':year===0?'YAVIN':'ABY'));map.append(n);
    });
    D.eras.forEach(era=>{
      const y=era.y*zoom;
      map.append(svg('line',{x1:166*xs,x2:600*xs,y1:y,y2:y,class:'era-line'}));
      // Era captions sit just above their boundary, away from stream labels.
      if(era.id==='high')map.append(svg('text',{x:166*xs,y:y-15,class:'era-title'},'I / THE HIGH REPUBLIC'));
    });
    D.factions.slice(0,11).forEach((f,i)=>{
      (f.labels||[]).forEach(([year,direction])=>{
        const y=yearY(year),[a,b]=limits(weightsAt(y),i),cx=(a+b)/2*xs,wide=(b-a)*xs;
        if(wide<12)return;
        const rotate=direction===1||wide<126||f.id==='independent';
        if(rotate){
          const n=svg('text',{x:cx,y:y*zoom,'text-anchor':'middle',class:`ribbon-label ${['empire','remnant','nihil'].includes(f.id)?'light':''}`,transform:`rotate(90 ${cx} ${y*zoom})`,style:'font-size:14px;letter-spacing:1.1px'},f.label);map.append(n);
        }else{
          const words=f.label.split(' ');const n=svg('text',{x:cx,y:y*zoom,'text-anchor':'middle',class:`ribbon-label ${['empire','remnant','nihil'].includes(f.id)?'light':''}`});
          words.forEach((word,j)=>n.append(svg('tspan',{x:cx,dy:j===0?0:22},word)));map.append(n);
        }
      });
    });
    [['JEDI ORDER',100,240],['HIDDEN SITH',139,540],['SURVIVORS',100,1620],['SIDIOUS & VADER',139,1680],['LUKE’S STUDENTS',100,2780]].forEach(([text,x,y])=>{
      const n=svg('text',{x:x*xs,y:y*zoom,class:'force-caption','text-anchor':'middle',transform:`rotate(90 ${x*xs} ${y*zoom})`},text);map.append(n);
    });
    let previousBottom=64;
    sortedEvents.filter(e=>e.level<=level).forEach(e=>{
      const targetY=eventY(e)*zoom, labelY=Math.max(targetY,previousBottom+25),x=638*xs;
      const g=svg('g',{class:'event',tabindex:0,role:'button','aria-label':`${date(e)}: ${e.title}`});g.dataset.event=e.id;
      const dotX=620*xs;
      g.append(svg('path',{d:`M ${602*xs} ${targetY} L ${dotX-5} ${targetY} L ${dotX-5} ${labelY-3} L ${dotX} ${labelY-3}`,class:'event-line',fill:'none'}));
      g.append(svg('circle',{cx:dotX,cy:labelY-3,r:e.level===1?4:3,class:'event-dot'}));
      const chars=Math.max(16,Math.floor((W-x-10)/7.1));
      const n=textLines(g,e.title,x,labelY,chars,'event-title',18);
      g.append(svg('text',{x,y:labelY+n*18+1,class:'event-date'},date(e).split(' · ')[0]));
      g.prepend(svg('rect',{x:dotX-10,y:labelY-15,width:W-dotX+5,height:n*18+27,class:'event-hit'}));
      previousBottom=labelY+n*18+3;
      g.addEventListener('click',()=>openRecord({type:'event',id:e.id}));
      g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openRecord({type:'event',id:e.id});}});
      map.append(g);
    });
    if(previousBottom+30>H){map.setAttribute('viewBox',`0 0 ${W} ${previousBottom+30}`);map.style.height=`${previousBottom+30}px`;}
    renderedHeight=Math.max(renderedHeight,previousBottom+30);
    if(showScreen)renderScreen();
    applySelection();updateViewport();
  }
  function renderMini(){if(mode!=='canon'){renderLegendMini();return;}const m=$('mini-svg');m.replaceChildren();D.factions.slice(0,11).forEach((f,i)=>addStream(m,f,politicalPath(i),false));['jedi','sith'].forEach(id=>addStream(m,factions[id],forcePath(id,1,1),false));}
  function applySelection(){
    if(mode!=='canon')return;
    if(selected?.type!=='screen'){map.querySelector('.screen-highlight')?.remove();$('screen-map').querySelectorAll('.active').forEach(n=>n.classList.remove('active'));}
    const activeFaction=selected?.type==='faction'?selected.id:null;
    map.querySelectorAll('.stream').forEach(p=>{p.classList.toggle('dim',!!activeFaction&&p.dataset.faction!==activeFaction);p.classList.toggle('selected',p.dataset.faction===activeFaction);p.setAttribute('aria-pressed',String(p.dataset.faction===activeFaction));});
    map.querySelectorAll('.event').forEach(p=>p.classList.toggle('active',selected?.type==='event'&&p.dataset.event===selected.id));
    map.querySelector('.selected-year')?.remove();
    if(selected?.type==='event'){
      const e=D.events.find(v=>v.id===selected.id),y=eventY(e)*zoom,xs=chartWidth/820;
      map.append(svg('line',{x1:85*xs,x2:604*xs,y1:y,y2:y,class:'selected-year'}));
    }
  }
  function overview(){
    if(mode!=='canon'){legendOverview();return;}
    const box=$('inspector-content');box.replaceChildren();
    box.append(el('div','record-number','01—06'),el('div','record-date','500 BBY — 35 ABY'),el('h2','', 'The shape of power.'),el('p','','A republic becomes an empire. A rebellion becomes a republic. Its ashes shelter the next threat.'));
    box.append(el('p','','Follow the streams through five centuries of galactic history, with the Jedi and Sith running alongside the political story.'));
    const stat=el('div','overview-stat');stat.append(el('strong','',D.events.length.toString()),el('span','','turning points to explore'));box.append(stat);
    const start=el('button','start-event','Explore the fall of the Republic →');start.addEventListener('click',()=>{goYear(-22);openRecord({type:'event',id:'geonosis'});});box.append(start);
    box.append(el('p','hint','Gold: the Republic. Red: Imperial power. Green and blue: movements for freedom. The narrower tracks at left follow the Jedi and Sith.'));
    const a=el('button','method-link','Sources & interpretation ↗');a.addEventListener('click',showInfo);box.append(a);
  }
  function openRecord(record,remember=true){
    if(['screen','legend','legend-faction'].includes(record.type)){openExtendedRecord(record,remember);return;}
    lastFocus=document.activeElement;
    if(remember&&selected&&(selected.type!==record.type||selected.id!==record.id))history.push(selected);
    selected=record;const box=$('inspector-content');box.replaceChildren();
    if(history.length){const back=el('button','back-record','← Previous record');back.addEventListener('click',()=>openRecord(history.pop(),false));box.append(back);}
    const isEvent=record.type==='event',data=isEvent?D.events.find(e=>e.id===record.id):factions[record.id];
    const index=isEvent?sortedEvents.findIndex(e=>e.id===data.id):D.factions.findIndex(f=>f.id===data.id);
    box.append(el('div','record-number',String(index+1).padStart(2,'0')),el('div','record-date',isEvent?date(data):(['jedi','sith'].includes(data.id)?'FORCE TRADITION':'POLITICAL STREAM')));
    const heading=el('h2','',isEvent?data.title:data.name);heading.tabIndex=-1;box.append(heading,el('p','',data.text));
    box.append(el('div','record-divider'),el('div','record-label',isEvent?'Why the stream changes':'Reading this stream'),el('p','',isEvent?data.effect:data.reading));
    const tags=el('div','record-tags');(isEvent?data.media:data.tags).forEach(t=>tags.append(el('span','',t)));box.append(tags);
    if(data.note)box.append(el('p','hint',data.note));
    box.append(el('div','record-label','Follow the evidence'));data.sources.forEach(s=>box.append(sourceLink(s)));
    if(isEvent&&!data.sources.includes('dates')&&!data.sources.includes('chronology'))box.append(sourceLink('dates'));
    if(!isEvent){const b=el('button','start-event','Explore a turning point →');b.addEventListener('click',()=>selectEvent(data.event,true));box.append(b);}
    else{
      const bar=el('div','record-steps');
      const prev=el('button','','← Earlier');prev.disabled=index===0;prev.addEventListener('click',()=>selectEvent(sortedEvents[index-1].id,true));
      const next=el('button','','Later →');next.disabled=index===sortedEvents.length-1;next.addEventListener('click',()=>selectEvent(sortedEvents[index+1].id,true));bar.append(prev,next);box.append(bar);
      const f=el('button','method-link',`Follow ${factions[data.faction].name} ↗`);f.addEventListener('click',()=>openRecord({type:'faction',id:data.faction}));box.append(f);
    }
    $('inspector').classList.add('open');$('inspector').scrollTop=0;applySelection();heading.focus({preventScroll:true});
  }
  function selectEvent(id,go=false){
    const e=D.events.find(e=>e.id===id);
    if(e.level>level){level=e.level;$('detail-level').value=String(level);render();}
    if(go)goY(eventY(e));openRecord({type:'event',id});
  }
  function goY(y){scroller.scrollTo({top:Math.max(0,y*zoom-90),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function goYear(t){goY(mode==='canon'?yearY(t):legendY(t));}
  function closeInspector(){selected=null;history=[];$('inspector').classList.remove('open');overview();applySelection();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
  function updateViewport(){
    if(mode!=='canon'){updateLegendViewport();return;}
    const y=(scroller.scrollTop+125)/zoom;
    const current=[...D.eras].reverse().find(e=>y>=e.y)||D.eras[0];
    $('current-era').textContent=current.name;
    $('mobile-era').value=current.id;
    $('era-nav').querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.era===current.id);if(b.dataset.era===current.id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
    const total=renderedHeight,indicator=$('viewport-indicator');
    const height=Math.min(1,scroller.clientHeight/total),top=Math.min(1-height,scroller.scrollTop/total);
    indicator.style.top=`${Math.max(0,top)*100}%`;indicator.style.height=`${height*100}%`;
  }
  function changeZoom(delta,anchor=scroller.clientHeight/2){
    const old=zoom,next=Math.round(Math.min(1.8,Math.max(.6,zoom+delta))*10)/10;
    if(next===old)return;const at=(scroller.scrollTop+anchor)/old;zoom=next;
    $('zoom-value').textContent=`${Math.round(zoom*100)}%`;
    $('zoom-out').disabled=zoom<=.6;$('zoom-in').disabled=zoom>=1.8;
    render();scroller.scrollTop=at*zoom-anchor;updateViewport();
  }
  function showInfo(){if(!$('info-dialog').open)$('info-dialog').showModal();}
  function render(){
    const landscape=matchMedia('(orientation: landscape) and (max-height: 600px) and (max-width: 1200px)').matches;
    screenWidth=landscape?300:360;
    chartWidth=Math.max(landscape?500:600,scroller.clientWidth-(showScreen&&mode==='canon'?screenWidth:0));
    $('map-content').style.width=`${chartWidth+(showScreen&&mode==='canon'?screenWidth:0)}px`;
    map.style.width=`${chartWidth}px`;
    $('screen-map').style.display=showScreen&&mode==='canon'?'block':'none';
    $('detail-level').disabled=mode!=='canon';
    renderedHeight=(mode==='canon'?D.height:D.legends[mode].height)*zoom;
    if(mode==='canon')renderCanon();else renderLegend();
  }
  function screenDate(m){
    if(m.id==='mando-film')return 'New Republic era · approximate';
    const span=m.start===m.end?formatYear(m.start):`${formatYear(m.start)} – ${formatYear(m.end)}`;
    return `${m.approx?'c. ':''}${span}`;
  }
  function renderScreen(){
    const pane=$('screen-map'),W=screenWidth;pane.replaceChildren();pane.style.width=`${W}px`;
    pane.append(svg('text',{x:18,y:31,class:'era-title'},'FILMS & TV'));
    pane.append(svg('text',{x:18,y:54,class:'column-title'},'SAME YEARS · SAME VERTICAL SCALE'));
    const colors={film:'#e3c17c',series:'#91bade',animation:'#86c7ad',anthology:'#b798d0'};
    const rows=[...D.screen].sort((a,b)=>(yearY(a.start)+yearY(a.end))-(yearY(b.start)+yearY(b.end)));
    let bottom=75;const occupied=[];
    rows.forEach(m=>{
      const start=yearY(m.start)*zoom,end=yearY(m.end)*zoom,mid=(start+end)/2;
      let lane=occupied.findIndex(v=>v<start-8);if(lane<0)lane=occupied.length;occupied[lane]=end+8;
      const x=16+lane*10,labelX=108,labelY=Math.max(mid,bottom+25),color=colors[m.kind];
      const g=svg('g',{class:`screen-story ${selected?.type==='screen'&&selected.id===m.id?'active':''}`,tabindex:0,role:'button','aria-label':`${m.name}, ${screenDate(m)}`});g.dataset.screen=m.id;
      g.append(svg('title',{},`${m.name} · ${screenDate(m)}`));
      if(start!==end){
        g.append(svg('line',{x1:x,x2:x,y1:start,y2:end,stroke:color,'stroke-width':4,'stroke-dasharray':m.discontinuous?'4 5':m.approx?'7 4':'none',class:'screen-span'}));
        [start,end].forEach(y=>g.append(svg('line',{x1:x-4,x2:x+4,y1:y,y2:y,stroke:color,'stroke-width':1.5})));
      }else g.append(svg('circle',{cx:x,cy:start,r:4,fill:m.approx?'#152024':color,stroke:color,'stroke-width':1.5,'stroke-dasharray':m.approx?'2 2':'none'}));
      g.append(svg('path',{d:`M ${x+5} ${mid} L 94 ${mid} L 101 ${labelY-4}`,fill:'none',stroke:color,'stroke-width':1,'stroke-opacity':.4}));
      const n=textLines(g,m.name,labelX,labelY,Math.max(20,Math.floor((W-labelX-12)/7.1)),'event-title',18);
      const infoY=labelY+n*18;
      textLines(g,screenDate(m),labelX,infoY,32,'event-date',14);
      g.append(svg('text',{x:labelX,y:infoY+30,class:'screen-type',fill:color},m.kind==='series'?'LIVE-ACTION SERIES':m.kind==='animation'?'ANIMATED SERIES':m.kind==='anthology'?'ANTHOLOGY · GAPS INCLUDED':'FILM'));
      g.prepend(svg('rect',{x:103,y:labelY-16,width:W-107,height:n*18+52,rx:3,fill:'#152024'}));
      g.addEventListener('click',()=>openRecord({type:'screen',id:m.id}));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRecord({type:'screen',id:m.id});}});
      pane.append(g);bottom=infoY+32;
    });
    renderedHeight=Math.max(renderedHeight,bottom+50);
    pane.setAttribute('viewBox',`0 0 ${W} ${renderedHeight}`);pane.style.height=`${renderedHeight}px`;
    map.style.height=`${renderedHeight}px`;map.setAttribute('viewBox',`0 0 ${chartWidth} ${renderedHeight}`);
  }
  function legendY(t){
    const points=D.legends[mode].anchors;
    if(t<=points[0][0])return points[0][1];
    for(let i=1;i<points.length;i++){const [a,ya]=points[i-1],[b,yb]=points[i];if(t<=b)return ya+(yb-ya)*(t-a)/(b-a);}
    return points.at(-1)[1];
  }
  function legendGeometry(i,xs=1,ys=1){
    const left=[],right=[];
    D.legends[mode].knots.forEach(([year,w])=>{const x=166+w.slice(0,i).reduce((a,b)=>a+b,0)*4.34;left.push([x,legendY(year)]);right.push([x+w[i]*4.34,legendY(year)]);});
    return ribbon(left,right,xs,ys);
  }
  function renderLegend(){
    const L=D.legends[mode],xs=chartWidth/820,H=L.height*zoom;
    map.replaceChildren();map.style.height=`${H}px`;map.setAttribute('viewBox',`0 0 ${chartWidth} ${H}`);
    const defs=svg('defs'),pattern=svg('pattern',{id:'legends-hatch',width:10,height:10,patternUnits:'userSpaceOnUse'});
    pattern.append(svg('path',{d:'M 0 10 L 10 0',stroke:'#e5c9fa','stroke-opacity':.12}));defs.append(pattern);map.append(defs);
    map.append(svg('text',{x:22,y:34,class:'era-title'},'LEGENDS · ALTERNATE CONTINUITY'));
    textLines(map,L.range+' · These stories are not Disney canon.',22,61,70,'minor-label',18);
    map.append(svg('text',{x:22,y:90,class:'minor-label'},'Separate history. No streams connect to the canon atlas.'));
    L.factions.forEach((f,i)=>{
      const g=svg('g',{tabindex:0,role:'button',class:'legend-stream','aria-label':`${f.name}, Legends`});
      g.append(svg('path',{d:legendGeometry(i,xs,zoom),fill:f.color,stroke:'#142025','stroke-width':1.5}));
      g.append(svg('path',{d:legendGeometry(i,xs,zoom),fill:'url(#legends-hatch)','pointer-events':'none'}));
      const at=L.knots[Math.floor(L.knots.length/2)],w=at[1],x=(166+(w.slice(0,i).reduce((a,b)=>a+b,0)+w[i]/2)*4.34)*xs,y=legendY(at[0])*zoom;
      g.append(svg('text',{x,y,transform:`rotate(90 ${x} ${y})`,'text-anchor':'middle',class:'ribbon-label light',style:'font-size:15px'},f.name.toUpperCase()));
      const action=()=>openRecord({type:'legend-faction',id:f.id});g.addEventListener('click',action);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});map.append(g);
    });
    let last=-50;
    L.anchors.forEach(([t,by])=>{const y=by*zoom;if(y-last<35)return;last=y;map.append(svg('line',{x1:72*xs,x2:615*xs,y1:y,y2:y,class:'grid-line'}));const n=svg('text',{x:70*xs,y:y-5,'text-anchor':'end',class:'axis-year'},Math.abs(t).toLocaleString());n.append(svg('tspan',{x:70*xs,dy:15,'font-size':10},t<0?'BBY':'ABY'));map.append(n);});
    let labelBottom=100;
    L.events.forEach(e=>{
      const y=legendY(e.year)*zoom,ly=Math.max(y,labelBottom+30),x=638*xs;
      const g=svg('g',{class:'event legend-event',tabindex:0,role:'button','aria-label':`${e.title}, ${formatYear(e.year)}, Legends`});
      g.append(svg('path',{d:`M ${603*xs} ${y} L ${625*xs} ${y} L ${633*xs} ${ly-4}`,class:'event-line',fill:'none'}));
      g.append(svg('circle',{cx:620*xs,cy:y,r:4,fill:'#b998d0'}));
      const n=textLines(g,e.title,x,ly,Math.max(15,Math.floor((chartWidth-x-10)/7.1)),'event-title');
      g.append(svg('text',{x,y:ly+n*18+5,class:'event-date'},`${formatYear(e.year)} · LEGENDS`));
      g.prepend(svg('rect',{x:620*xs,y:ly-16,width:chartWidth-620*xs,height:n*18+35,fill:'transparent'}));
      g.addEventListener('click',()=>openRecord({type:'legend',id:e.id}));g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openRecord({type:'legend',id:e.id});}});map.append(g);labelBottom=ly+n*18+15;
    });
    updateLegendViewport();
  }
  function renderLegendMini(){const L=D.legends[mode],m=$('mini-svg');m.replaceChildren();m.setAttribute('viewBox',`0 0 820 ${L.height}`);L.factions.forEach((f,i)=>m.append(svg('path',{d:legendGeometry(i),fill:f.color})));}
  function updateLegendViewport(){
    const L=D.legends[mode],y=(scroller.scrollTop+120)/zoom;
    $('current-era').textContent=L.name;
    const era=[...L.events].reverse().find(e=>legendY(e.year)<=y)||L.events[0];
    $('mobile-era').value=era.id;
    $('era-nav').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.era===era.id));
    const height=Math.min(1,scroller.clientHeight/(L.height*zoom)),top=Math.min(1-height,scroller.scrollTop/(L.height*zoom));
    $('viewport-indicator').style.top=`${Math.max(0,top)*100}%`;$('viewport-indicator').style.height=`${height*100}%`;
  }
  function buildNavigation(){
    const nav=$('era-nav');nav.replaceChildren();
    const picker=$('mobile-era');picker.replaceChildren();
    const choices=mode==='canon'?D.eras:D.legends[mode].events;
    choices.forEach(e=>{const o=el('option','',e.short||e.title);o.value=e.id;picker.append(o);});
    if(mode==='canon')D.eras.forEach((era,i)=>{const b=el('button','');b.dataset.era=era.id;b.append(document.createTextNode(`${String(i+1).padStart(2,'0')}  ${era.short}`),el('small','',era.range));b.addEventListener('click',()=>goY(era.y));nav.append(b);});
    else D.legends[mode].events.forEach(e=>{const b=el('button','');b.dataset.era=e.id;b.append(document.createTextNode(e.title),el('small','',formatYear(e.year)));b.addEventListener('click',()=>{goYear(e.year);openRecord({type:'legend',id:e.id});});nav.append(b);});
  }
  function changeContinuity(value){
    mode=value;selected=null;history=[];$('continuity').value=mode;$('inspector').classList.remove('open');
    document.body.classList.toggle('legends-mode',mode!=='canon');
    $('continuity-badge').textContent=mode==='canon'?'CANON':'LEGENDS · NON-CANON';
    $('continuity-note').textContent=mode==='canon'?'Canon history · Film and TV spans follow the same time scale as the map.':D.legends[mode].intro;
    $('show-screen').disabled=mode!=='canon';
    document.querySelector('.nav-intro .range').textContent=mode==='canon'?'500 BBY — 35 ABY':D.legends[mode].range;
    document.querySelector('.map-key').style.display=mode==='canon'?'flex':'none';
    const end=document.querySelector('.map-end');end.replaceChildren();end.append(el('span','eyebrow',mode==='canon'?'35 ABY · CANON':'END OF THIS LEGENDS SECTION'),el('p','',mode==='canon'?'The next chapter is unwritten here.':'An alternate history, kept separate.'),el('span','',mode==='canon'?'Explore other time periods with the continuity selector.':'Legends events do not become canon because a period has fewer screen stories.'));
    $('mini-svg').setAttribute('viewBox',`0 0 820 ${D.height}`);
    buildNavigation();overview();renderMini();render();scroller.scrollTo({top:0,left:0});
  }
  function legendOverview(){const L=D.legends[mode],box=$('inspector-content');box.replaceChildren();box.append(el('div','record-date','LEGENDS · NOT DISNEY CANON'),el('h2','',L.name.replace('Legends · ','')),el('p','',L.intro),el('div','record-divider'),el('p','','Hatching and purple labels identify this separate continuity. Stream widths are qualitative; this is a selective overview, not a comprehensive chronology.'),sourceLink('legendsPolicy'));}
  function openExtendedRecord(record,remember=true){
    lastFocus=document.activeElement;if(remember&&selected&&(selected.id!==record.id||selected.type!==record.type))history.push(selected);selected=record;
    const box=$('inspector-content');box.replaceChildren();
    if(history.length){const back=el('button','back-record','← Previous record');back.addEventListener('click',()=>openRecord(history.pop(),false));box.append(back);}
    let heading;
    if(record.type==='screen'){
      const m=D.screen.find(s=>s.id===record.id);heading=el('h2','',m.name);
      box.append(el('div','record-date',screenDate(m)),heading,el('div','record-label',`${m.kind} · canon`),el('p','',m.note||'The principal story takes place in this dated window. A point marks a year; it does not imply a year-long runtime.'));
      const others=D.screen.filter(s=>s.id!==m.id&&s.start<=m.end&&s.end>=m.start);
      box.append(el('div','record-divider'),el('div','record-label','Overlapping story windows'));
      if(!others.length)box.append(el('p','','No other mapped screen story overlaps this date window.'));
      others.forEach(o=>{const b=el('button','overlap-story',o.name);b.addEventListener('click',()=>openRecord({type:'screen',id:o.id}));box.append(b);});
      box.append(el('p','hint','Same-year and approximate-era placements do not prove that individual scenes happen simultaneously. Dashed anthology spans include time jumps.'));
      m.sources.forEach(s=>box.append(sourceLink(s)));
      const jump=el('button','start-event','Show this span on the map →');jump.addEventListener('click',()=>{goYear(m.start);scroller.scrollLeft=chartWidth;});box.append(jump);
      $('screen-map').querySelectorAll('.screen-story').forEach(g=>g.classList.toggle('active',g.dataset.screen===m.id));
      map.querySelector('.screen-highlight')?.remove();
      const y=yearY(m.start)*zoom,h=Math.max(2,(yearY(m.end)-yearY(m.start))*zoom);
      map.append(svg('rect',{x:0,y,width:chartWidth,height:h,fill:'#e3c17c','fill-opacity':.1,class:'screen-highlight','pointer-events':'none'}));
    }else if(record.type==='legend'){
      const e=D.legends[mode].events.find(e=>e.id===record.id);heading=el('h2','',e.title);
      box.append(el('div','record-date',`${formatYear(e.year)} · LEGENDS`),heading,el('p','',e.text),el('div','record-label','Reading the map'),el('p','',e.effect));
      const tags=el('div','record-tags');e.media.forEach(m=>tags.append(el('span','',m)));box.append(tags);e.sources.forEach(s=>box.append(sourceLink(s)));box.append(sourceLink('legendsPolicy'));
    }else{
      const f=D.legends[mode].factions.find(f=>f.id===record.id);heading=el('h2','',f.name);box.append(el('div','record-date','LEGENDS · INTERPRETIVE STREAM'),heading,el('p','','This stream groups related institutions or rival powers across selected Legends stories. Its width shows an editorial interpretation of influence, not measured territory. Jedi traditions and political institutions can overlap.'),el('p','',D.legends[mode].intro),sourceLink('legendsPolicy'));
    }
    $('inspector').classList.add('open');$('inspector').scrollTop=0;heading.tabIndex=-1;heading.focus({preventScroll:true});
  }
  ['eras','high','dates','chronology','republic','empire','newRepublic','firstOrder','jedi','sith'].forEach(k=>$('source-list').append(sourceLink(k)));
  $('zoom-in').addEventListener('click',()=>changeZoom(.2));$('zoom-out').addEventListener('click',()=>changeZoom(-.2));
  $('reset').addEventListener('click',()=>{zoom=1;$('zoom-value').textContent='100%';$('zoom-out').disabled=false;$('zoom-in').disabled=false;closeInspector();render();scroller.scrollTo({top:0,left:0});});
  $('detail-level').addEventListener('change',e=>{level=Number(e.target.value);if(selected?.type==='event'&&D.events.find(v=>v.id===selected.id).level>level)closeInspector();render();});
  $('about').addEventListener('click',showInfo);$('method').addEventListener('click',showInfo);$('close-info').addEventListener('click',()=>$('info-dialog').close());
  $('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('close-inspector').addEventListener('click',closeInspector);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('info-dialog').open&&selected)closeInspector();});
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();goY(0);});
  $('minimap').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();goY((e.clientY-r.top)/r.height*(mode==='canon'?D.height:D.legends[mode].height));});
  $('minimap').addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();scroller.scrollTop+=e.key==='ArrowDown'?300:-300;}});
  scroller.addEventListener('scroll',updateViewport,{passive:true});
  scroller.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();changeZoom(e.deltaY<0?.2:-.2,e.clientY-scroller.getBoundingClientRect().top);}},{passive:false});
  const observer=new ResizeObserver(()=>{const w=scroller.clientWidth;if(w!==resizeWidth){resizeWidth=w;render();}else updateViewport();});observer.observe(scroller);
  $('continuity').addEventListener('change',e=>changeContinuity(e.target.value));
  $('mobile-era').addEventListener('change',e=>{if(mode==='canon')goY(D.eras.find(x=>x.id===e.target.value).y);else goYear(D.legends[mode].events.find(x=>x.id===e.target.value).year);});
  $('show-screen').addEventListener('change',e=>{showScreen=e.target.checked;render();});
  $('find-screen').addEventListener('click',()=>{if(mode!=='canon')changeContinuity('canon');showScreen=true;$('show-screen').checked=true;render();scroller.scrollTo({left:chartWidth,behavior:'smooth'});});
  const notes=$('screen-notes');D.undatedScreen.forEach(n=>{const item=el('div','screen-notes-item');item.append(el('strong','',n.name),el('p','',n.note),sourceLink(n.source));notes.append(item);});
  ['viewing','tvDates','legendsPolicy','legendsBooks','legendsComics'].forEach(k=>$('source-list').append(sourceLink(k)));
  buildNavigation();overview();renderMini();render();
})();
