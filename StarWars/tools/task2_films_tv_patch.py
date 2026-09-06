from pathlib import Path

SW = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise RuntimeError(f"{label}: start marker not found")
    b = text.find(end, a + len(start))
    if b < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:a] + replacement + text[b:]


app_path = SW / 'app.js'
app = app_path.read_text()
new_screen = r'''  function wrapLineCount(text,maxChars){
    const words=text.split(' ');let count=0,row='';
    words.forEach(word=>{if(row&&(row+' '+word).length>maxChars){count++;row=word;}else row+=(row?' ':'')+word;});
    return count+(row?1:0);
  }
  function packScreenPositions(targets,heights,lo,hi,gap=10){
    if(!targets.length)return [];
    const required=heights.reduce((a,b)=>a+b,0)+gap*Math.max(0,heights.length-1);
    if(required>hi-lo){let top=lo;return heights.map(h=>{const c=top+h/2;top+=h+gap;return c;});}
    const offsets=[heights[0]/2];
    for(let i=1;i<targets.length;i++)offsets.push(offsets.at(-1)+(heights[i-1]+heights[i])/2+gap);
    const blocks=[];
    targets.forEach((target,i)=>{
      blocks.push({a:i,b:i,v:target-offsets[i],n:1});
      while(blocks.length>1&&blocks.at(-2).v>blocks.at(-1).v){
        const b=blocks.pop(),a=blocks.pop(),n=a.n+b.n;
        blocks.push({a:a.a,b:b.b,v:(a.v*a.n+b.v*b.n)/n,n});
      }
    });
    const result=Array(targets.length).fill(0),lastLimit=hi-offsets.at(-1)-heights.at(-1)/2;
    blocks.forEach(block=>{
      const v=Math.max(lo,Math.min(lastLimit,block.v));
      for(let i=block.a;i<=block.b;i++)result[i]=v+offsets[i];
    });
    return result;
  }
  function screenLogoHeight(item,grouped){return item.kind==='film'?(grouped?48:64):(grouped?38:50);}
  function screenTypeLabel(m,grouped){
    if(grouped){
      const kinds=[...new Set(m.items.map(item=>item.kind))];
      const names=kinds.map(kind=>kind==='film'?'film':kind==='series'?'TV':kind==='animation'?'animation':'anthology');
      return `${m.items.length} titles · ${names.join(' + ')}`;
    }
    if(m.kind==='anthology')return 'Anthology · gaps';
    if(m.discontinuous)return 'Story with time jump';
    if(m.kind==='film')return 'Film';
    if(m.kind==='animation')return 'Animation';
    return 'TV series';
  }
  function screenCardMetrics(m,cardW,grouped){
    const artItems=m.items.filter(item=>titleArt?.assets[item.id]),maxChars=Math.max(10,Math.floor((cardW-20)/6.3));
    const cols=grouped&&cardW>=205?2:1;
    let rowHeights=[],titleH;
    if(artItems.length===m.items.length){
      const rows=Math.ceil(artItems.length/cols);rowHeights=Array(rows).fill(0);
      artItems.forEach((item,i)=>{const row=Math.floor(i/cols);rowHeights[row]=Math.max(rowHeights[row],screenLogoHeight(item,grouped));});
      titleH=rowHeights.reduce((a,b)=>a+b,0)+Math.max(0,rowHeights.length-1)*8+6;
    }else{
      const title=shortTitles[m.id]||m.name;titleH=wrapLineCount(title,Math.max(12,Math.floor((cardW-20)/7.3)))*18+4;
    }
    const dateText=screenDate(m),typeText=screenTypeLabel(m,grouped);
    const dateLines=wrapLineCount(dateText,maxChars),typeLines=wrapLineCount(typeText,maxChars);
    return {artItems,cols,rowHeights,titleH,dateText,typeText,maxChars,dateLines,typeLines,cardH:14+titleH+dateLines*15+typeLines*15+17};
  }
  function renderScreen(){
    const pane=$('screen-map'),W=screenWidth;pane.replaceChildren();
    screenGroups=makeScreenGroups();
    pane.append(svg('text',{x:12,y:30,class:'column-title'},'STORY TIME'));
    pane.append(svg('text',{x:12,y:49,class:'screen-meta'},'◇ Film · ┃ Series · • true anchor'));
    const cardX=W<190?40:58,cardW=Math.max(70,W-cardX-8),occupied=[];
    const entries=screenGroups.map(m=>{
      const start=yearY(m.start)*zoom,end=yearY(m.end)*zoom,mid=(start+end)/2,color=mediaColors[m.kind],grouped=m.items.length>1;
      let lane=occupied.findIndex(v=>v<start-10);if(lane<0)lane=occupied.length;occupied[lane]=end+10;
      return {m,start,end,mid,color,grouped,lane,metrics:screenCardMetrics(m,cardW,grouped)};
    });
    const centers=packScreenPositions(entries.map(e=>e.mid),entries.map(e=>e.metrics.cardH),64,Math.max(120,renderedHeight-18),10);
    const laneCount=Math.max(1,...entries.map(e=>e.lane+1)),railLeft=8,railRight=Math.max(railLeft,cardX-19),anchorX=cardX-8;
    entries.forEach((entry,index)=>{
      const {m,start,end,mid,color,grouped,lane,metrics}=entry,top=centers[index]-metrics.cardH/2;
      const x=laneCount===1?(railLeft+railRight)/2:railLeft+lane*(railRight-railLeft)/(laneCount-1);
      const g=svg('g',{class:grouped?'screen-cluster':'screen-story',tabindex:0,role:'button','aria-label':`${m.name}, ${screenDate(m)}${grouped?`, ${m.items.length} titles, expand`:''}`});if(!grouped)g.dataset.screen=m.id;
      g.append(svg('title',{},`${m.name} · ${screenDate(m)}`));
      if(start!==end){
        g.append(svg('line',{x1:x,x2:x,y1:start,y2:end,stroke:color,'stroke-width':3,'stroke-dasharray':m.discontinuous?'3 5':m.approx?'6 4':'none',class:'screen-rail'}));
        [start,end].forEach(y=>g.append(svg('path',{d:`M ${x-4} ${y} h 8`,stroke:color,'stroke-width':1.5})));
      }else if(m.kind==='film')g.append(svg('path',{d:`M ${x} ${start-5} l 5 5 -5 5 -5 -5 Z`,fill:m.approx?'#071014':color,stroke:color}));
      else g.append(svg('circle',{cx:x,cy:start,r:4,fill:m.approx?'#071014':color,stroke:color,'stroke-width':1.5}));
      // Every card gets one explicit marker at its true timeline position. Cards may move; this dot never does.
      g.append(svg('path',{d:`M ${x+5} ${mid} H ${anchorX-4}`,fill:'none',stroke:color,'stroke-width':1.2,'stroke-opacity':.78}));
      g.append(svg('circle',{cx:anchorX,cy:mid,r:grouped?4:3,fill:'#071014',stroke:color,'stroke-width':1.6}));
      if(grouped)g.append(svg('circle',{cx:anchorX,cy:mid,r:1.5,fill:color}));
      const bottom=top+metrics.cardH,targetY=mid<top?top+11:mid>bottom?bottom-11:mid;
      g.append(svg('path',{d:`M ${anchorX+3} ${mid} C ${anchorX+8} ${mid},${cardX-7} ${targetY},${cardX} ${targetY}`,fill:'none',stroke:color,'stroke-width':1.15,'stroke-opacity':.66}));
      const card=svg('g');
      card.append(svg('rect',{x:cardX,y:top,width:cardW,height:metrics.cardH,rx:6,class:'screen-card'}));
      card.append(svg('line',{x1:cardX,y1:top+7,x2:cardX,y2:top+metrics.cardH-7,stroke:color,'stroke-width':2}));
      if(metrics.artItems.length===m.items.length){
        const cellW=(cardW-20-(metrics.cols-1)*8)/metrics.cols,contentY=top+10;
        const rowTops=[];let cursor=contentY;
        metrics.rowHeights.forEach(h=>{rowTops.push(cursor);cursor+=h+8;});
        metrics.artItems.forEach((item,i)=>{
          const row=Math.floor(i/metrics.cols),h=screenLogoHeight(item,grouped),y=rowTops[row]+(metrics.rowHeights[row]-h)/2;
          mapTitleArt(card,item.id,cardX+10+(i%metrics.cols)*(cellW+8),y,cellW,h);
        });
      }else{
        const title=shortTitles[m.id]||m.name;textLines(card,title,cardX+10,top+21,Math.max(12,Math.floor((cardW-20)/7.3)),'screen-name',18);
      }
      const metaY=top+14+metrics.titleH;
      const dateN=textLines(card,metrics.dateText,cardX+10,metaY,metrics.maxChars,'screen-meta',15);
      const dateNode=card.lastChild;dateNode.setAttribute('style',`fill:${color};font-weight:600`);
      textLines(card,metrics.typeText,cardX+10,metaY+dateN*15+3,metrics.maxChars,'screen-meta',15);
      g.append(card);activate(g,{type:grouped?'screen-group':'screen',id:m.id});pane.append(g);
      renderedHeight=Math.max(renderedHeight,bottom+24);
    });
  }
'''
app = replace_between(app, "  function renderScreen(){\n", "  function lifeDate(p,start){", new_screen, 'app renderScreen')
app = replace_once(app, "'◇ Film · Bracket = series · Dashed = approximate / gaps'", "'◇ Film · span = series · • true anchor · dashed ≈ / gaps'", 'layer caption')
app_path.write_text(app)

poster_path = SW / 'tools' / 'poster' / 'render.py'
poster = poster_path.read_text()
new_poster_screen = r'''# Screen stories: actual spans, individual titles, and uncertainty that remains visible.
# Film lockups retain their established size; series, animation, and anthologies step down slightly.
colors={'film':GOLD,'series':'#91bade','animation':'#86c7ad','anthology':'#b798d0'}
media=sorted(D['screen'],key=lambda m:(Y(m['start'])+Y(m['end']))/2)
labelX=MX+87; labelW=MW-102

def media_logo_height(m):
    base=min(85,labelW*ART[m['id']]['height']/ART[m['id']]['width'])
    return base if m['kind']=='film' else max(38,base*.82)

mheights=[media_logo_height(m)+58 for m in media]
mcenters=positions([(Y(m['start'])+Y(m['end']))/2 for m in media],mheights,TOP+90,END-5,12)
occupied=[]
anchorX=labelX-18
for m,h,cy in zip(media,mheights,mcenters):
    a,b=Y(m['start']),Y(m['end']);mid=(a+b)/2;col=colors[m['kind']]
    lane=next((i for i,v in enumerate(occupied) if v<a-10),len(occupied))
    if lane==len(occupied):occupied.append(b+10)
    else:occupied[lane]=b+10
    x=MX+8+lane*11
    if a!=b:
      line([(x,a),(x,b)],col,4,(4,5) if m.get('discontinuous') else (8,5) if m.get('approx') else None)
      line([(x-5,a),(x+5,a)],col,2);line([(x-5,b),(x+5,b)],col,2)
    elif m['kind']=='film':poly([(x,a-6),(x+6,a),(x,a+6),(x-6,a)],PANEL if m.get('approx') else col,col)
    else:circle(x,a,5,PANEL if m.get('approx') else col,col,2)
    # A fixed dot marks the exact temporal anchor. The short connector then fans to the displaced label.
    line([(x+6,mid),(anchorX-6,mid)],col,1.2)
    circle(anchorX,mid,3.3,PANEL,col,1.6)
    ty=cy-h/2
    attach=ty+10 if mid<ty else ty+h-10 if mid>ty+h else mid
    line([(anchorX+4,mid),(anchorX+10,mid),(labelX-8,attach),(labelX-2,attach)],'#667b82',1)
    # Solid label backing prevents leaders from passing through title artwork.
    rect(labelX-4,ty-5,labelW+8,h+5,PANEL)
    logoH=media_logo_height(m)
    lockup(m['id'],labelX,ty,labelW,logoH)
    ty+=logoH+12
    date=('c. ' if m.get('approx') else '')+(yr(m['start']) if m['start']==m['end'] else yr(m['start'])+' – '+yr(m['end']))
    if m['id']=='mando-film':date='New Republic era · approximate'
    text(date,labelX,ty+2,16,col)
    typ={'film':'FILM','series':'LIVE ACTION','animation':'ANIMATION','anthology':'ANTHOLOGY · GAPS'}[m['kind']]
    if m.get('discontinuous') and m['kind']!='anthology':typ+=' · TIME JUMP'
    text(typ,labelX,ty+24,13,MUTED)
assert len(occupied)<=7

'''
poster = replace_between(poster, '# Screen stories: actual spans, individual titles, and uncertainty that remains visible.\n', '# All 16 lives at once, each in its own constant-width lane.\n', new_poster_screen, 'poster Films & TV block')
poster_path.write_text(poster)

index_path = SW / 'index.html'
index = index_path.read_text()
index = replace_once(index, '<script src="app.js" defer></script>', '<script src="app.js?v=films-20260907" defer></script>', 'app cache bust')
index = index.replace('v=starfield-20260906', 'v=films-20260907')
index = index.replace('6 September 2026', '7 September 2026')
old_guide = 'Select Films & TV to reveal a companion track on the same vertical time scale. Gold diamonds mark films; blue or green brackets mark series. A dot marks a year, not a year-long duration. Dashed lines indicate approximate dates or anthology gaps. Titles that share a date are grouped into a single expandable record. Labels may shift to avoid collisions; fine leaders preserve their true time positions. Same-year placements do not prove scene-by-scene simultaneity.'
new_guide = 'Select Films & TV to reveal a companion track on the same vertical time scale. Gold diamonds mark films; blue or green brackets mark series. Each title or grouped card has a colored anchor dot fixed at its true timeline position, and every card prints its date or span. Labels may shift to avoid collisions, but the anchor never moves. Dashed lines indicate approximate dates or anthology gaps. Titles sharing a date are grouped into a single expandable record. Same-year placements do not prove scene-by-scene simultaneity.'
index = replace_once(index, old_guide, new_guide, 'Films & TV guide')
index_path.write_text(index)

print('Patched Films & TV lane, poster renderer, and guide metadata.')
