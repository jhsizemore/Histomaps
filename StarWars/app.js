(() => {
  'use strict';
  const D=window.HISTOMAP, NS='http://www.w3.org/2000/svg';
  const $=id=>document.getElementById(id), map=$('map'), scroller=$('map-scroll');
  let zoom=1, level=2, selected=null, history=[], lastFocus=null, resizeWidth=0;
  let mode='canon', layer=matchMedia('(min-width: 1000px) and (min-height: 600px)').matches?'screen':'none', lifeGroup='skywalker', chartWidth=620, screenWidth=250, renderedHeight=D.height, screenGroups=[];
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
    const X=typeof xs==='function'?xs:x=>x*xs;
    let d=`M ${X(points[0][0])} ${points[0][1]*ys}`;
    for(let i=1;i<points.length;i++){
      const [a,ya]=points[i-1],[b,yb]=points[i],m=(ya+yb)/2;
      d+=` C ${X(a)} ${m*ys},${X(b)} ${m*ys},${X(b)} ${yb*ys}`;
    }
    return d;
  }
  function ribbon(left,right,xs=1,ys=1){
    const X=typeof xs==='function'?xs:x=>x*xs;
    const rev=[...right].reverse();let d=edges(left,xs,ys)+` L ${X(rev[0][0])} ${rev[0][1]*ys}`;
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
  function mapX(x){
    // Keep the date gutter and Force tracks readable; give every remaining pixel to powers.
    const axis=chartWidth<350?42:54,force=chartWidth<350?34:44,left=axis+force+6,right=chartWidth-34;
    if(x<=84)return x/84*axis;
    if(x<=157)return axis+(x-84)/73*force;
    if(x<=600)return left+(x-166)/434*(right-left);
    return right+(x-600)/220*34;
  }
  function activate(g,record){
    g.addEventListener('click',()=>openRecord(record));
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRecord(record);}});
  }
  function drawTicks(points){
    let prev=-100;
    points.forEach(([year,base])=>{
      const y=base*zoom;if(y-prev<34&&![0,-19,35].includes(year))return;prev=y;
      map.append(svg('line',{x1:mapX(71),x2:chartWidth-34,y1:y,y2:y,class:'grid-line'}));
      const n=svg('text',{x:mapX(70),y:y-6,'text-anchor':'end',class:`axis-year ${year===0?'axis-zero':''}`},Math.abs(year).toLocaleString());
      n.append(svg('tspan',{x:mapX(70),dy:15,'font-size':12},year<0?'BBY':'ABY'));map.append(n);
    });
  }
  function drawEvents(events,position,type){
    let bottom=50;
    events.forEach((e,index)=>{
      if(type==='event'&&e.level>level)return;
      const y=position(e)*zoom,cy=Math.max(y,bottom+40),x=chartWidth-17;
      const g=svg('g',{class:'event',tabindex:0,role:'button','aria-label':`${index+1}. ${e.title}, ${date(e)}`});g.dataset.event=e.id;
      g.append(svg('title',{},`${e.title} · ${date(e)}`));
      g.append(svg('path',{d:`M ${chartWidth-34} ${y} H ${x-13} V ${cy} H ${x}`,class:'event-line',fill:'none'}));
      g.append(svg('rect',{x:x-16,y:cy-19,width:32,height:38,rx:6,fill:'transparent'}));
      g.append(svg('circle',{cx:x,cy,r:12,class:'event-dot'}));
      g.append(svg('text',{x,y:cy+4,'text-anchor':'middle',class:'event-number'},String(index+1)));
      activate(g,{type,id:e.id});map.append(g);bottom=cy;
    });
    renderedHeight=Math.max(renderedHeight,bottom+35);
  }
  function renderCanon(){
    const H=D.height*zoom;
    map.replaceChildren();
    [84,119,157].forEach(x=>map.append(svg('line',{x1:mapX(x),x2:mapX(x),y1:64,y2:H,stroke:'#526c6938'})));
    const bands=svg('g');D.factions.slice(0,11).forEach((f,i)=>addStream(bands,f,politicalPath(i,mapX,zoom),true));
    ['jedi','sith'].forEach(id=>addStream(bands,factions[id],forcePath(id,mapX,zoom),true));map.append(bands);
    map.append(svg('text',{x:8,y:30,class:'column-title'},'DATE'));
    map.append(svg('text',{x:mapX(100),y:49,'text-anchor':'middle',class:'column-title'},'J'));
    map.append(svg('text',{x:mapX(139),y:49,'text-anchor':'middle',class:'column-title'},'S'));
    map.append(svg('text',{x:mapX(166),y:30,class:'column-title'},'POWERS'));
    map.append(svg('text',{x:chartWidth-17,y:30,'text-anchor':'middle',class:'column-title'},'#'));
    drawTicks([-500,-382,-232,-230,-132,-100,-32,-24,-22,-20,-19,-10,-9,-5,-2,0,3,4,5,9,28,34,35].map(t=>[t,yearY(t)]));
    D.eras.forEach(era=>map.append(svg('line',{x1:mapX(166),x2:mapX(600),y1:era.y*zoom,y2:era.y*zoom,class:'era-line'})));
    D.factions.slice(0,11).forEach((f,i)=>(f.labels||[]).forEach(([year,direction])=>{
      const y=yearY(year),[a,b]=limits(weightsAt(y),i),cx=(mapX(a)+mapX(b))/2,wide=mapX(b)-mapX(a);
      if(wide<14)return;
      const rotate=direction===1||wide<150||f.id==='independent',cls=`ribbon-label ${['empire','remnant','nihil'].includes(f.id)?'light':''}`;
      if(rotate)map.append(svg('text',{x:cx,y:y*zoom,'text-anchor':'middle',class:cls,transform:`rotate(90 ${cx} ${y*zoom})`,style:'font-size:14px;letter-spacing:.6px'},f.label));
      else{
        const n=svg('text',{x:cx,y:y*zoom,'text-anchor':'middle',class:cls});
        f.label.split(' ').forEach((word,j)=>n.append(svg('tspan',{x:cx,dy:j===0?0:22},word)));map.append(n);
      }
    }));
    [['JEDI',100,240],['SITH',139,540],['SURVIVORS',100,1620],['SIDIOUS & VADER',139,1680],['LUKE’S JEDI',100,2780]].forEach(([name,x,y])=>map.append(svg('text',{x:mapX(x),y:y*zoom,class:'force-caption','text-anchor':'middle',transform:`rotate(90 ${mapX(x)} ${y*zoom})`},name)));
    drawEvents(sortedEvents,eventY,'event');
  }
  function renderMini(){if(mode!=='canon'){renderLegendMini();return;}const m=$('mini-svg');m.replaceChildren();D.factions.slice(0,11).forEach((f,i)=>addStream(m,f,politicalPath(i),false));['jedi','sith'].forEach(id=>addStream(m,factions[id],forcePath(id,1,1),false));}
  function applySelection(){
    map.querySelector('.selected-year')?.remove();map.querySelector('.screen-highlight')?.remove();
    const activeFaction=selected?.type==='faction'?selected.id:null;
    map.querySelectorAll('.stream').forEach(p=>{p.classList.toggle('dim',!!activeFaction&&p.dataset.faction!==activeFaction);p.classList.toggle('selected',p.dataset.faction===activeFaction);p.setAttribute('aria-pressed',String(p.dataset.faction===activeFaction));});
    map.querySelectorAll('.event').forEach(p=>p.classList.toggle('active',['event','legend'].includes(selected?.type)&&p.dataset.event===selected.id));
    $('screen-map').querySelectorAll('[data-screen]').forEach(p=>p.classList.toggle('active',selected?.type==='screen'&&p.dataset.screen===selected.id));
    $('screen-map').querySelectorAll('[data-life]').forEach(p=>{p.classList.toggle('active',selected?.type==='life'&&p.dataset.life===selected.id);p.classList.toggle('dim',selected?.type==='life'&&p.dataset.life!==selected.id);});
    if(mode!=='canon')return;
    if(selected?.type==='event'){
      const e=D.events.find(v=>v.id===selected.id),y=eventY(e)*zoom;
      map.append(svg('line',{x1:mapX(84),x2:chartWidth-34,y1:y,y2:y,class:'selected-year'}));
    }
    const span=selected?.type==='screen'?D.screen.find(m=>m.id===selected.id):selected?.type==='life'?D.lifelines.find(m=>m.id===selected.id):null;
    if(span){const y=yearY(span.start)*zoom,h=Math.max(2,(yearY(span.end)-yearY(span.start))*zoom);map.append(svg('rect',{x:mapX(84),y,width:chartWidth-mapX(84)-34,height:h,fill:span.color||'#e3c17c','fill-opacity':.10,class:'screen-highlight','pointer-events':'none'}));}
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
    if(['screen','screen-group','life','legend','legend-faction'].includes(record.type)){openExtendedRecord(record,remember);return;}
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
    $('inspector').hidden=false;$('inspector').classList.add('open');$('inspector').scrollTop=0;applySelection();heading.focus({preventScroll:true});
  }
  function selectEvent(id,go=false){
    const e=D.events.find(e=>e.id===id);
    if(e.level>level){level=e.level;$('detail-level').value=String(level);render();}
    if(go)goY(eventY(e));openRecord({type:'event',id});
  }
  function goY(y){scroller.scrollTo({top:Math.max(0,y*zoom-90),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function goYear(t){goY(mode==='canon'?yearY(t):legendY(t));}
  function hideInspector(){ $('inspector').hidden=true;$('inspector').classList.remove('open'); }
  function closeInspector(){selected=null;history=[];$('inspector').hidden=true;$('inspector').classList.remove('open');overview();applySelection();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
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
    const width=scroller.clientWidth,hasCompanion=layer!=='none'&&mode==='canon';
    screenWidth=hasCompanion?Math.round(width<620?Math.max(128,width*.34):Math.min(310,Math.max(220,width*.27))):0;
    chartWidth=Math.max(1,width-screenWidth);
    document.documentElement.style.setProperty('--companion-width',`${screenWidth}px`);
    document.body.classList.toggle('has-companion',hasCompanion);document.body.classList.toggle('life-mode',hasCompanion&&layer==='life');
    $('map-content').style.width=`${width}px`;map.style.width=`${chartWidth}px`;
    $('screen-map').hidden=!hasCompanion;$('screen-map').style.width=`${screenWidth}px`;
    $('companion-heading').hidden=!hasCompanion;$('companion-title').hidden=layer==='life';
    $('life-group').hidden=layer!=='life';$('companion-title').textContent='Films & TV';
    $('detail-level').disabled=mode!=='canon';
    document.querySelectorAll('[data-layer]').forEach(b=>{b.disabled=mode!=='canon'&&b.dataset.layer!=='none';b.setAttribute('aria-pressed',String((mode==='canon'?layer:'none')===b.dataset.layer));});
    $('layer-caption').textContent=layer==='life'&&hasCompanion?'● Born  × Died  ○ Last appearance':layer==='screen'&&hasCompanion?'◇ Film · Bracket = series · Dashed = approximate / gaps':'Select a stream or numbered event';
    renderedHeight=(mode==='canon'?D.height:D.legends[mode].height)*zoom;
    if(mode==='canon'){renderCanon();if(layer==='screen')renderScreen();if(layer==='life')renderLives();}else renderLegend();
    [map,...(hasCompanion?[$('screen-map')]:[])].forEach((pane,i)=>{pane.style.height=`${renderedHeight}px`;pane.setAttribute('viewBox',`0 0 ${i?screenWidth:chartWidth} ${renderedHeight}`);});
    applySelection();updateViewport();
  }
  function screenDate(m){
    if(m.id==='mando-film')return 'New Republic era · approximate';
    const span=m.start===m.end?formatYear(m.start):`${formatYear(m.start)} – ${formatYear(m.end)}`;
    return `${m.approx?'c. ':''}${span}`;
  }
  const mediaColors={film:'#e3c17c',series:'#91bade',animation:'#86c7ad',anthology:'#b798d0'};
  const shortTitles={'ep1':'I · Phantom Menace','ep2':'II · Attack of the Clones','ep3':'III · Revenge of the Sith','ep4':'IV · A New Hope','ep5':'V · Empire Strikes Back','ep6':'VI · Return of the Jedi','ep7':'VII · Force Awakens','ep8':'VIII · The Last Jedi','ep9':'IX · Rise of Skywalker','andor-tv':'Andor','ahsoka-tv':'Ahsoka','mando-film':'Mandalorian & Grogu','maul-tv':'Maul: Shadow Lord'};
  function makeScreenGroups(){
    const points=new Map(),rows=[];
    D.screen.forEach(m=>{if(m.start!==m.end){rows.push({...m,items:[m]});return;}const key=m.start;if(!points.has(key))points.set(key,[]);points.get(key).push(m);});
    points.forEach((items,t)=>{
      if(items.length===1){rows.push({...items[0],items});return;}
      rows.push({id:`year-${t}`,start:t,end:t,items,approx:items.some(m=>m.approx),kind:items.every(m=>m.kind==='film')?'film':'series',name:t===9?'New Republic stories':t===0?'Rogue One / IV':t===34?'Episodes VII / VIII':t===-22?'Attack of the Clones / The Clone Wars':`${items.length} screen stories`});
    });
    return rows.sort((a,b)=>(yearY(a.start)+yearY(a.end))-(yearY(b.start)+yearY(b.end)));
  }
  function renderScreen(){
    const pane=$('screen-map'),W=screenWidth;pane.replaceChildren();
    screenGroups=makeScreenGroups();let bottom=57;const occupied=[];
    pane.append(svg('text',{x:12,y:30,class:'column-title'},'STORY TIME'));
    pane.append(svg('text',{x:12,y:49,class:'screen-meta'},'◇ Film · ┃ Series'));
    screenGroups.forEach(m=>{
      const start=yearY(m.start)*zoom,end=yearY(m.end)*zoom,mid=(start+end)/2,color=mediaColors[m.kind];
      let lane=occupied.findIndex(v=>v<start-10);if(lane<0)lane=occupied.length;occupied[lane]=end+10;
      const x=12+lane*8,cardX=W<190?12:56,cardW=W-cardX-10,labelY=Math.max(mid,bottom+12),grouped=m.items.length>1;
      const g=svg('g',{class:grouped?'screen-cluster':'screen-story',tabindex:0,role:'button','aria-label':`${m.name}, ${screenDate(m)}${grouped?`, ${m.items.length} titles, expand`:''}`});if(!grouped)g.dataset.screen=m.id;
      g.append(svg('title',{},`${m.name} · ${screenDate(m)}`));
      if(start!==end){
        g.append(svg('line',{x1:x,x2:x,y1:start,y2:end,stroke:color,'stroke-width':3,'stroke-dasharray':m.discontinuous?'3 5':m.approx?'6 4':'none',class:'screen-rail'}));
        [start,end].forEach(y=>g.append(svg('path',{d:`M ${x-4} ${y} h 8`,stroke:color,'stroke-width':1.5})));
      }else if(m.kind==='film')g.append(svg('path',{d:`M ${x} ${start-5} l 5 5 -5 5 -5 -5 Z`,fill:m.approx?'#102025':color,stroke:color}));
      else g.append(svg('circle',{cx:x,cy:start,r:4,fill:m.approx?'#102025':color,stroke:color,'stroke-width':1.5}));
      g.append(svg('path',{d:`M ${x} ${mid} H ${Math.max(x,cardX-5)} V ${labelY+12} H ${cardX}`,fill:'none',stroke:color,'stroke-opacity':.55}));
      const card=svg('g'),title=shortTitles[m.id]||m.name;
      const n=textLines(card,title,cardX+10,labelY+19,Math.max(12,Math.floor((cardW-20)/7.3)),'screen-name',18);
      const meta=grouped?`${m.approx?'c. ':''}${formatYear(m.start).replace(' · YAVIN','')} · ${m.items.length} titles`:`${m.approx?'≈ ':''}${m.kind==='anthology'?'Anthology · gaps':m.discontinuous?'Story with gaps':m.kind==='film'?'Film':m.kind==='animation'?'Animation':'TV series'}`;
      const metaN=textLines(card,meta,cardX+10,labelY+n*18+20,Math.max(14,Math.floor((cardW-20)/6.3)),'screen-meta',15);
      const cardH=n*18+metaN*15+20;
      card.prepend(svg('rect',{x:cardX,y:labelY,width:cardW,height:cardH,rx:6,class:'screen-card'}));
      card.append(svg('line',{x1:cardX,y1:labelY+7,x2:cardX,y2:labelY+cardH-7,stroke:color,'stroke-width':2}));g.append(card);
      activate(g,{type:grouped?'screen-group':'screen',id:m.id});pane.append(g);bottom=labelY+cardH;
    });
    renderedHeight=Math.max(renderedHeight,bottom+35);
  }
  function lifeDate(p,start){return `${(start?p.startApprox:p.endApprox)?'c. ':''}${formatYear(start?p.start:p.end)}`;}
  function renderLives(){
    const pane=$('screen-map'),W=screenWidth,people=D.lifelines.filter(p=>p.groups.includes(lifeGroup));pane.replaceChildren();
    pane.append(svg('text',{x:10,y:29,class:'screen-meta'},'● Birth   × Death'));
    pane.append(svg('text',{x:10,y:48,class:'screen-meta'},'○ Last seen here'));
    const step=(W-14)/people.length;
    people.forEach((p,i)=>{
      const x=7+step*(i+.5),start=yearY(p.start)*zoom,end=yearY(p.end)*zoom;
      const g=svg('g',{class:'lifeline',tabindex:0,role:'button','aria-label':`${p.name}, born ${lifeDate(p,true)}, ${p.endKind==='death'?'died':'alive at last mapped appearance'} ${lifeDate(p,false)}`});g.dataset.life=p.id;
      g.append(svg('title',{},`${p.name} · ${lifeDate(p,true)} — ${lifeDate(p,false)}${p.endKind==='known'?' (later fate uncharted)':''}`));
      g.append(svg('rect',{x:x-step/2+1,y:start-12,width:step-2,height:end-start+24,fill:'transparent'}));
      g.append(svg('line',{x1:x,x2:x,y1:start,y2:end,stroke:p.color,class:'life-stroke'}));
      if(p.start<-500)g.append(svg('path',{d:`M ${x-5} ${start+5} L ${x} ${start-2} L ${x+5} ${start+5}`,fill:'none',stroke:p.color,'stroke-width':2}));
      else g.append(svg('circle',{cx:x,cy:start,r:4,fill:p.startApprox?'#102025':p.color,stroke:p.color,'stroke-width':2,'stroke-dasharray':p.startApprox?'2 2':'none'}));
      if(p.endKind==='death')g.append(svg('path',{d:`M ${x-4} ${end-4} l 8 8 M ${x+4} ${end-4} l -8 8`,stroke:p.color,'stroke-width':2}));
      else g.append(svg('circle',{cx:x,cy:end,r:5,fill:'#102025',stroke:p.color,'stroke-width':2,'stroke-dasharray':p.endApprox?'2 2':'none'}));
      if(p.startApprox)g.append(svg('line',{x1:x,x2:x,y1:start+6,y2:Math.min(end,start+32),stroke:'#102025','stroke-width':4,'stroke-dasharray':'3 4'}));
      if(p.endApprox)g.append(svg('line',{x1:x,x2:x,y1:Math.max(start,end-32),y2:end-7,stroke:'#102025','stroke-width':4,'stroke-dasharray':'3 4'}));
      const textHeight=p.short.length*8,first=Math.min(start+42+(i%2)*30,end-textHeight-15);
      for(let y=Math.max(start+18,first);y+textHeight<end-12;y+=370){g.append(svg('text',{x,y,transform:`rotate(90 ${x} ${y})`,class:'life-label'},p.short));}
      activate(g,{type:'life',id:p.id});pane.append(g);
    });
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
    const L=D.legends[mode];map.replaceChildren();
    const defs=svg('defs'),pattern=svg('pattern',{id:'legends-hatch',width:10,height:10,patternUnits:'userSpaceOnUse'});
    pattern.append(svg('path',{d:'M 0 10 L 10 0',stroke:'#e5c9fa','stroke-opacity':.15}));defs.append(pattern);map.append(defs);
    map.append(svg('text',{x:12,y:32,class:'era-title'},'LEGENDS · NON-CANON'));
    textLines(map,L.range,12,59,50,'minor-label',18);
    L.factions.forEach((f,i)=>{
      const g=svg('g',{tabindex:0,role:'button',class:'legend-stream','aria-label':`${f.name}, Legends`});
      g.append(svg('path',{d:legendGeometry(i,mapX,zoom),fill:f.color,stroke:'#142025','stroke-width':1.5}));
      g.append(svg('path',{d:legendGeometry(i,mapX,zoom),fill:'url(#legends-hatch)','pointer-events':'none'}));
      const at=L.knots[Math.floor(L.knots.length/2)],w=at[1],x=mapX(166+(w.slice(0,i).reduce((a,b)=>a+b,0)+w[i]/2)*4.34),y=legendY(at[0])*zoom;
      g.append(svg('text',{x,y,transform:`rotate(90 ${x} ${y})`,'text-anchor':'middle',class:'ribbon-label light',style:'font-size:14px'},f.name.toUpperCase()));
      activate(g,{type:'legend-faction',id:f.id});map.append(g);
    });
    drawTicks(L.anchors);drawEvents(L.events,e=>legendY(e.year),'legend');
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
    mode=value;selected=null;history=[];$('continuity').value=mode;$('inspector').hidden=true;$('inspector').classList.remove('open');
    document.body.classList.toggle('legends-mode',mode!=='canon');
    $('continuity-badge').textContent=mode==='canon'?'CANON':'LEGENDS';
    $('continuity-note').hidden=mode==='canon';$('continuity-note').textContent=mode==='canon'?'':D.legends[mode].intro;
    document.querySelector('.nav-intro .range').textContent=mode==='canon'?'500 BBY — 35 ABY':D.legends[mode].range;
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
    if(record.type==='life'){
      const p=D.lifelines.find(p=>p.id===record.id);heading=el('h2','',p.name);
      box.append(el('div','record-date','CANON · CHARACTER LIFELINE'),heading);
      const dates=el('div','life-dates');
      [[p.startApprox?'Born · approximate':'Born',lifeDate(p,true)],[p.endKind==='death'?'Died':'Alive · last mapped era',lifeDate(p,false)]].forEach(([label,value])=>{const item=el('div');item.append(el('small','',label),el('strong','',value));dates.append(item);});box.append(dates,el('p','',p.note));
      box.append(el('p','hint','The line follows physical life, independently of political affiliation. Spacing uses the same elastic dates as the streams. An open endpoint leaves later life uncharted.'));
      p.sources.forEach(k=>box.append(sourceLink(k)));
      const jump=el('button','start-event','Follow this life on the map →');jump.addEventListener('click',()=>{if(!p.groups.includes(lifeGroup)){lifeGroup=p.groups[0];$('life-group').value=lifeGroup;}setLayer('life');scroller.focus({preventScroll:true});goYear(Math.max(-500,p.start));});box.append(jump);
    }else if(record.type==='screen-group'){
      const group=screenGroups.find(g=>g.id===record.id);heading=el('h2','',group.name);
      box.append(el('div','record-date',screenDate(group)),heading,el('p','','Select a title to see its full story window, overlaps, and dating notes.'));
      group.items.forEach(m=>{const button=el('button','overlap-story',m.name);button.append(el('small','',screenDate(m)));button.addEventListener('click',()=>openRecord({type:'screen',id:m.id}));box.append(button);});
      box.append(el('p','hint','Shared-year and approximate-era markers do not establish scene-by-scene simultaneity.'));
    }else if(record.type==='screen'){
      const m=D.screen.find(s=>s.id===record.id);heading=el('h2','',m.name);
      box.append(el('div','record-date',screenDate(m)),heading,el('div','record-label',`${m.kind} · canon`),el('p','',m.note||'The principal story takes place in this dated window. A point marks a year; it does not imply a year-long runtime.'));
      const others=D.screen.filter(s=>s.id!==m.id&&s.start<=m.end&&s.end>=m.start);
      box.append(el('div','record-divider'),el('div','record-label','Overlapping story windows'));
      if(!others.length)box.append(el('p','','No other mapped screen story overlaps this date window.'));
      others.forEach(o=>{const b=el('button','overlap-story',o.name);b.addEventListener('click',()=>openRecord({type:'screen',id:o.id}));box.append(b);});
      box.append(el('p','hint','Same-year and approximate-era placements do not prove that individual scenes happen simultaneously. Dashed anthology spans include time jumps.'));
      m.sources.forEach(s=>box.append(sourceLink(s)));
      const jump=el('button','start-event','Show this span on the map →');jump.addEventListener('click',()=>{setLayer('screen');scroller.focus({preventScroll:true});goYear(m.start);});box.append(jump);
    }else if(record.type==='legend'){
      const e=D.legends[mode].events.find(e=>e.id===record.id);heading=el('h2','',e.title);
      box.append(el('div','record-date',`${formatYear(e.year)} · LEGENDS`),heading,el('p','',e.text),el('div','record-label','Reading the map'),el('p','',e.effect));
      const tags=el('div','record-tags');e.media.forEach(m=>tags.append(el('span','',m)));box.append(tags);e.sources.forEach(s=>box.append(sourceLink(s)));box.append(sourceLink('legendsPolicy'));
    }else{
      const f=D.legends[mode].factions.find(f=>f.id===record.id);heading=el('h2','',f.name);box.append(el('div','record-date','LEGENDS · INTERPRETIVE STREAM'),heading,el('p','','This stream groups related institutions or rival powers across selected Legends stories. Its width shows an editorial interpretation of influence, not measured territory. Jedi traditions and political institutions can overlap.'),el('p','',D.legends[mode].intro),sourceLink('legendsPolicy'));
    }
    $('inspector').hidden=false;$('inspector').classList.add('open');$('inspector').scrollTop=0;heading.tabIndex=-1;applySelection();heading.focus({preventScroll:true});
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
  function ensureLivesVisible(){
    const people=D.lifelines.filter(p=>p.groups.includes(lifeGroup)),top=scroller.scrollTop/zoom,bottom=(scroller.scrollTop+scroller.clientHeight)/zoom;
    if(!people.some(p=>yearY(p.start)<=bottom&&yearY(p.end)>=top))goYear(Math.min(...people.map(p=>p.start)));
  }
  function setLayer(next){layer=next;hideInspector();$('view-options').open=false;render();if(next==='life')ensureLivesVisible();}
  document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>setLayer(b.dataset.layer)));
  $('life-group').addEventListener('change',e=>{lifeGroup=e.target.value;if(selected?.type==='life')closeInspector();render();ensureLivesVisible();});
  $('companion-help').addEventListener('click',showInfo);
  $('focus-mode').addEventListener('click',()=>{const active=document.body.classList.toggle('focus-mode');$('focus-mode').setAttribute('aria-pressed',String(active));$('focus-mode').textContent=active?'Exit':'Focus';$('focus-mode').setAttribute('aria-label',active?'Exit focus mode':'Maximize map space');$('view-options').open=false;render();});
  function toggleNav(open){$('navigation').hidden=!open;$('toggle-nav').setAttribute('aria-expanded',String(open));if(open)$('close-nav').focus();}
  $('toggle-nav').addEventListener('click',()=>toggleNav($('navigation').hidden));$('close-nav').addEventListener('click',()=>toggleNav(false));
  $('era-nav').addEventListener('click',e=>{if(e.target.closest('button'))toggleNav(false);});
  document.addEventListener('click',e=>{if(!$('view-options').contains(e.target))$('view-options').open=false;if(!$('navigation').hidden&&!$('navigation').contains(e.target)&&!$('toggle-nav').contains(e.target))toggleNav(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('navigation').hidden){toggleNav(false);$('toggle-nav').focus();}$('view-options').open=false;}});
  const notes=$('screen-notes');D.undatedScreen.forEach(n=>{const item=el('div','screen-notes-item');item.append(el('strong','',n.name),el('p','',n.note),sourceLink(n.source));notes.append(item);});
  ['viewing','tvDates','legendsPolicy','legendsBooks','legendsComics'].forEach(k=>$('source-list').append(sourceLink(k)));
  buildNavigation();overview();renderMini();render();
})();
