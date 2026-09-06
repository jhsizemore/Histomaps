from PIL import Image, ImageDraw, ImageFont, PngImagePlugin
from pathlib import Path
from functools import lru_cache
import argparse, json, math
ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT.parent.parent
if (PUBLIC/'dist').is_dir():PUBLIC=PUBLIC/'dist'
parser=argparse.ArgumentParser(description='Render the exact Star Wars Histomap poster from its retained data and artwork.')
parser.add_argument('--output',type=Path,default=PUBLIC/'downloads/Star-Wars-Histomap-Poster.png')
parser.add_argument('--preview-dir',type=Path)
args=parser.parse_args()
D=json.loads((ROOT/'star-wars-poster-data.json').read_text())
S=2; W=2600; H=9110
BG='#000000'; PANEL='#050c10'; INK='#eeeae0'; MUTED='#a5b8ba'; GOLD='#dfc17f'; RULE='#33484c'; PURPLE='#ceb0e3'
# Lay the generated background down before drawing any chart marks or typography.
# All dates, coordinates, labels, symbols and title artwork retain their native source.
im=Image.new('RGB',(W*S,H*S),BG)
starfield=Image.open(PUBLIC/'assets/starfield.webp').convert('RGB')
starfield=starfield.resize((1536*S,1024*S),Image.Resampling.LANCZOS)
starfield=Image.blend(starfield,Image.new('RGB',starfield.size,BG),.20)
for sy in range(0,H*S,starfield.height):
    for sx in range(0,W*S,starfield.width):im.paste(starfield,(sx,sy))
dr=ImageDraw.Draw(im)
def space_panel(x,y,w,h,tint=(3,7,11),opacity=.42,outline=None,r=0):
    box=(round(x*S),round(y*S),round((x+w)*S),round((y+h)*S))
    overlay=Image.new('RGBA',im.size,(0,0,0,0));od=ImageDraw.Draw(overlay)
    od.rounded_rectangle(box,radius=round(r*S),fill=(*tint,round(opacity*255)),outline=outline,width=S)
    im.paste(overlay,(0,0),overlay)
TYPE=ROOT/'star-wars-type'
FONTS={'body':str(TYPE/'NewsCycle-Regular.ttf'),'bold':str(TYPE/'NewsCycle-Bold.ttf'),'cond':str(TYPE/'PathwayGothicOne-Regular.ttf'),'serif':str(TYPE/'PathwayGothicOne-Regular.ttf'),'display':str(TYPE/'starjedi.ttf')}
ART=json.loads((ROOT/'title-art/manifest.json').read_text())
@lru_cache(None)
def title_image(key):return Image.open(ROOT/'title-art'/(key+'.png')).convert('RGBA')
title_placements=[]
def lockup(key,x,y,w,h,center=False):
    if key not in ART:return False
    logo=title_image(key).copy();logo.thumbnail((round(w*S),round(h*S)),Image.Resampling.LANCZOS)
    px=round(x*S+(w*S-logo.width)/2) if center else round(x*S)
    im.paste(logo,(px,round(y*S+(h*S-logo.height)/2)),logo)
    title_placements.append(key);return True
@lru_cache(None)
def font(size,kind='body'):return ImageFont.truetype(FONTS[kind],round(size*S))
def measure(s,size=22,kind='body'):return dr.textlength(s.lower() if kind=='display' else s,font=font(size,kind))/S
def text(s,x,y,size=22,fill=INK,kind='body',align='left'):
    if kind=='display':s=s.lower()
    if align=='center':x-=measure(s,size,kind)/2
    elif align=='right':x-=measure(s,size,kind)
    dr.text((round(x*S),round(y*S)),s,font=font(size,kind),fill=fill,anchor='lt')
def line(points,fill=RULE,width=1,dash=None):
    if dash:
      for a,b in zip(points,points[1:]):
        dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
        if not length:continue
        pos=0
        while pos<length:
          end=min(length,pos+dash[0]);line([(a[0]+dx*pos/length,a[1]+dy*pos/length),(a[0]+dx*end/length,a[1]+dy*end/length)],fill,width)
          pos+=sum(dash)
    else:dr.line([(round(x*S),round(y*S)) for x,y in points],fill=fill,width=max(1,round(width*S)))
def rect(x,y,w,h,fill,outline=None,r=0,width=1):
    box=(round(x*S),round(y*S),round((x+w)*S),round((y+h)*S))
    if r:dr.rounded_rectangle(box,radius=round(r*S),fill=fill,outline=outline,width=round(width*S))
    else:dr.rectangle(box,fill=fill,outline=outline,width=round(width*S))
def circle(x,y,r,fill,outline=None,width=1):dr.ellipse(((x-r)*S,(y-r)*S,(x+r)*S,(y+r)*S),fill=fill,outline=outline,width=max(1,round(width*S)))
def poly(pts,fill,outline=None,width=1):
    dr.polygon([(round(x*S),round(y*S)) for x,y in pts],fill=fill)
    if outline:line(pts+[pts[0]],outline,width)
def wrap(s,width,size=22,kind='body'):
    rows=[];row=''
    for word in s.split():
      test=(row+' '+word).strip()
      if row and measure(test,size,kind)>width:rows.append(row);row=word
      else:row=test
    if row:rows.append(row)
    return rows
def paragraph(s,x,y,width,size=22,fill=MUTED,kind='body',leading=None):
    leading=leading or size*1.42
    for row in wrap(s,width,size,kind):text(row,x,y,size,fill,kind);y+=leading
    return y

def vertical(s,x,y,size=22,fill=INK,kind='cond',center=True,bg=None):
    f=font(size,kind);tw=math.ceil(measure(s,size,kind)*S)+12;th=math.ceil(size*S*1.5)+8
    layer=Image.new('RGBA',(tw,th),(0,0,0,0));ld=ImageDraw.Draw(layer)
    ld.text((6,4),s,font=f,fill=fill,anchor='lt',stroke_width=2 if bg else 0,stroke_fill=bg)
    layer=layer.rotate(-90,expand=True)
    px=round(x*S-layer.width/2);py=round(y*S-(layer.height/2 if center else 0));im.paste(layer,(px,py),layer)

# Sourced insignia remain exact silhouettes, recolored to match the atlas.
@lru_cache(None)
def symbol_mask(key):
    return Image.open(ROOT/'faction-symbols'/(key+'-mask.png')).convert('L')
symbol_placements=[]
def symbol(key,x,y,size=74,fill=INK):
    mask=symbol_mask(key).copy();mask.thumbnail((round(size*S),round(size*S)),Image.Resampling.LANCZOS)
    im.paste(Image.new('RGB',mask.size,fill),(round(x*S-mask.width/2),round(y*S-mask.height/2)),mask)
    symbol_placements.append({'symbol':key,'x':round(x,1),'y':round(y,1),'size':size})

def interp(points,t):
    if t<=points[0][0]:return points[0][1]
    for (a,ya),(b,yb) in zip(points,points[1:]):
      if t<=b:return ya+(yb-ya)*(t-a)/(b-a)
    return points[-1][1]
def edge(points):
    out=[points[0]]
    for (x0,y0),(x1,y1) in zip(points,points[1:]):
      mid=(y0+y1)/2
      for j in range(1,25):
        t=j/24;u=1-t
        out.append((u**3*x0+3*u*u*t*x0+3*u*t*t*x1+t**3*x1,u**3*y0+3*u*u*t*mid+3*u*t*t*mid+t**3*y1))
    return out

def ribbon(left,right,fill):poly(edge(left)+list(reversed(edge(right))),fill,BG,1)
def positions(targets,heights,lo,hi,gap=14):
    # Isotonic regression: preserve order and avoid overlap with minimum displacement.
    offsets=[heights[0]/2]
    for i in range(1,len(targets)):offsets.append(offsets[-1]+(heights[i-1]+heights[i])/2+gap)
    blocks=[]
    for i,t in enumerate(targets):
      blocks.append([i,i,t-offsets[i],1])
      while len(blocks)>1 and blocks[-2][2]>blocks[-1][2]:
        b=blocks.pop();a=blocks.pop();n=a[3]+b[3];blocks.append([a[0],b[1],(a[2]*a[3]+b[2]*b[3])/n,n])
    result=[0]*len(targets);lastlimit=hi-offsets[-1]-heights[-1]/2
    assert lastlimit>=lo,'Too many labels for panel'
    for a,b,v,n in blocks:
      v=max(lo,min(lastlimit,v))
      for i in range(a,b+1):result[i]=v+offsets[i]
    for i in range(1,len(result)):assert result[i]-heights[i]/2>=result[i-1]+heights[i-1]/2+gap-0.01
    return result

def yr(t):
    if t==0:return '0 · Yavin'
    return f'{abs(t):,} '+('BBY' if t<0 else 'ABY')

# Masthead: a permanent, self-contained edition, with no interactive chrome.
text('H / HISTOMAPS',60,52,25,GOLD,'bold')
text('AN UNOFFICIAL FAN ATLAS  /  STORY SPOILERS',2540,56,18,MUTED,align='right')
lockup('main',60,99,330,143)
text('HISTOMAP',435,131,66,GOLD,'display')
text('Created by J. Hunter Sizemore / kliawota.design',2540,119,25,INK,align='right')
text('Explore: histomaps.org/StarWars',2540,164,42,GOLD,'cond',align='right')
line([(60,246),(2540,246)],GOLD,2)
text('CANON  /  500 BBY — 35 ABY',60,275,31,GOLD,'bold')
text('Power, stories, and lives on one timeline.',2540,277,31,INK,'serif',align='right')
# Reading notes use actual symbols so the graphic survives separation from the post.
text('FOLLOW TIME DOWNWARD',60,344,19,GOLD,'bold')
paragraph('BBY: before the Battle of Yavin. ABY: after it. Crowded eras expand; equal distances do not mean equal years.',60,377,740,22)
text('WIDTHS ARE INTERPRETIVE',895,344,19,GOLD,'bold')
paragraph('Bands suggest political and military reach. They are not measured territory, population, or percentages.',895,377,740,22)
text('LIVES, NOT POLITICAL SHARES',1730,344,19,GOLD,'bold')
paragraph('A separate line for each person. Filled circle: birth. Cross: death. Open circle: last mapped appearance.',1730,377,810,22)
line([(60,478),(2540,478)],RULE,1.5)

TOP=560; Q=4500/3460; END=TOP+4500
Y=lambda t:TOP+interp(D['anchors'],t)*Q
E=lambda e:TOP+(e.get('y',interp(D['anchors'],e['year'])))*Q
PX=240; PR=1260; PW=PR-PX; EX=1300; EW=320; MX=1655; MW=450; LX=2140; LW=400
space_panel(1628,494,480,END-494)
space_panel(2120,494,420,END-494)
for x in [143,222,1278,1628,2120]:line([(x,505),(x,END)],RULE,1)
text('YEAR',60,511,19,MUTED,'bold');text('FORCE',157,511,17,MUTED,'bold')
symbol('jedi',166,549,25,'#a9c59b');symbol('sith',202,549,25,'#d28489')
text('GALACTIC POWERS',PX,511,22,GOLD,'bold')
text('TURNING POINTS',EX,511,20,GOLD,'bold')
text('FILMS & TELEVISION',MX,511,20,GOLD,'bold')
text('CANON LIFELINES',LX,511,20,GOLD,'bold')
lockup('high-republic',EX,TOP+95,EW,75)

# Political bands are the exact same editorial state model as the site.
def bounds(weights,i):
    a=PX+sum(weights[:i])/100*PW
    return a,a+weights[i]/100*PW
for i,f in enumerate(D['factions'][:11]):
    active=[j for j,r in enumerate(D['states']) if r[1][i]>0]
    if not active:continue
    rows=D['states'][max(0,active[0]-1):min(len(D['states']),active[-1]+2)]
    left=[];right=[]
    for y,w in rows:
      a,b=bounds(w,i);left.append((a,TOP+y*Q));right.append((b,TOP+y*Q))
    ribbon(left,right,f['color'])
forceNodes={
'jedi':[[110,25],[660,23],[1080,25],[1309,22],[1335,3],[2130,3],[2420,5],[2690,13],[2850,16],[2910,2],[3180,4],[3370,9],[3460,9]],
'sith':[[110,3],[660,3],[880,6],[1190,8],[1310,19],[2419,19],[2460,3],[3060,4],[3305,15],[3370,17],[3400,0],[3460,0]]}
for key,x,color in [('jedi',166,'#a9c59b'),('sith',202,'#d28489')]:
    ribbon([(x-w*.6,TOP+y*Q) for y,w in forceNodes[key]],[(x+w*.6,TOP+y*Q) for y,w in forceNodes[key]],color)

# Light guides bridge all four columns, making concurrency directly readable.
ticks=[-500,-382,-232,-230,-228,-132,-100,-32,-24,-22,-20,-19,-18,-10,-9,-5,-2,-1,0,3,4,5,9,28,34,35]
last=-999
for t in ticks:
    y=Y(t)
    if y-last<35:continue
    last=y
    line([(137,y),(2540,y)],'#536368' if t==0 else '#2b3c41',1.4 if t==0 else .65,dash=None if t==0 else (3,8))
    text(str(abs(t)),126,y-21,26,GOLD if t==0 else INK,'cond',align='right')
    text('YAVIN' if t==0 else 'BBY' if t<0 else 'ABY',126,y+9,15,GOLD if t==0 else MUTED,align='right')

def weights(y):
    for (a,wa),(b,wb) in zip(D['states'],D['states'][1:]):
      if y<=b:
        t=max(0,(y-a)/(b-a));return [x+(z-x)*t for x,z in zip(wa,wb)]
    return D['states'][-1][1]
# Full stream labels retain identity throughout the continuous chart.
faction_symbols={'republic':'republic','rebels':'rebel','newRepublic':'new-republic','resistance':'rebel','empire':'empire','remnant':'empire','firstOrder':'first-order','separatists':'separatists','nihil':'nihil'}
vertical_symbols=[]
label_boxes=[]
for i,f in enumerate(D['factions'][:11]):
  for t,orient in f.get('labels',[]):
    a,b=bounds(weights(interp(D['anchors'],t)),i);wide=b-a;cx=(a+b)/2;y=Y(t)
    if f['id']=='republic' and t==-21:y+=23
    if wide<18:continue
    fill=INK if f['id'] in ['empire','remnant','nihil'] else '#16262a'
    if orient==1 or wide<190 or f['id']=='independent':
      fs=28 if wide>30 else 21
      vertical(f['label'],cx,y,fs,fill)
      th=measure(f['label'],fs,'cond')+10
      label_boxes.append((cx-fs,y-th/2,cx+fs,y+th/2))
      if f['id'] in faction_symbols:vertical_symbols.append((i,f['id'],cx,y,th,fill))
    else:
      words=f['label'].split(' ');fs=min(45,(wide-20)/max(measure(w,1,'cond') for w in words))
      tw=max(measure(w,fs,'cond') for w in words);mark=76 if wide>450 else 60
      group=tw+mark+28;start=cx-group/2
      symbol(faction_symbols[f['id']],start+mark/2,y-7,mark,fill)
      tx=start+mark+28+tw/2
      for j,w in enumerate(words):text(w,tx,y+(j-len(words)/2)*fs*1.02,fs,fill,'cond','center')
      label_boxes.append((start,y-len(words)*fs/2-5,start+group,y+len(words)*fs/2+5))
# Narrow streams receive upright symbols beside their vertical names. Candidate
# positions are checked against every label and against the actual stream width.
banner_years=[-232,-22,-19,4,34]
marked_vertical_factions=set()
for i,fid,cx,y,th,fill in vertical_symbols:
    if fid=='rebels' and fid in marked_vertical_factions:continue
    placed=False
    for size in [62,48,36]:
      for offset in [th/2+size/2+22,-th/2-size/2-22,th/2+size/2+70,-th/2-size/2-70]:
        sy=y+offset
        if sy-size/2<TOP+130 or sy+size/2>END-10:continue
        a,b=bounds(weights((sy-TOP)/Q),i);sx=(a+b)/2
        if b-a<size+14:continue
        if any(abs(sy-Y(t))<size/2+25 for t in banner_years):continue
        box=(sx-size/2-8,sy-size/2-8,sx+size/2+8,sy+size/2+8)
        if any(box[0]<r and box[2]>l and box[1]<bt and box[3]>tp for l,tp,r,bt in label_boxes):continue
        symbol(faction_symbols[fid],sx,sy,size,fill);label_boxes.append(box);placed=True;break
      if placed:break
    assert placed, 'No clear insignia position for '+fid
    marked_vertical_factions.add(fid)
# The brief Sith fleet and three transitions need explicit labels on a static map.
for t,label in [(-232,'THE NIHIL CRISIS'),(-22,'THE CLONE WARS'),(-19,'THE REPUBLIC BECOMES THE EMPIRE'),(4,'ENDOR: IMPERIAL POWER FRACTURES'),(34,'THE FIRST ORDER WAR')]:
    y=Y(t)
    line([(PX,y),(PR,y)],'#dfcc99',1.5)
    labelw=measure(label,18,'bold')+22
    rect(PX+12,y-14,labelw,33,'#142328',r=3)
    text(label,PX+23,y-6,18,GOLD,'bold')
for label,x,y in [('JEDI ORDER',166,290),('HIDDEN SITH',202,540),('SURVIVORS',166,1770),('SIDIOUS & VADER',202,1790),('LUKE’S STUDENTS',166,2770)]:vertical(label,x,TOP+y*Q,18,INK,bg=BG)
# Top-edge continuation and end labels carry their semantics into the poster.
text('Earlier histories continue above this map.',PX,578,18,MUTED)
fleetY=Y(35)-78
fleetA,fleetB=bounds(weights((fleetY-TOP)/Q),7)
line([((fleetA+fleetB)/2,fleetY),(931,fleetY)],INK,1.5)
circle((fleetA+fleetB)/2,fleetY,3,INK)
symbol('sith-eternal',959,fleetY,38,INK)
text('SITH ETERNAL FLEET',991,fleetY-10,18,INK,'bold')

# Event typography is laid out independently, with fine leaders back to true anchors.
events=sorted(D['events'],key=E)
heights=[len(wrap(e['title'],EW,24,'cond'))*28+32 for e in events]
centers=positions([E(e) for e in events],heights,TOP+78,END-12,15)
for i,(e,h,cy) in enumerate(zip(events,heights,centers)):
    y=E(e);ty=cy-h/2
    line([(PR+4,y),(1285,y),(1293,cy)],'#718081',1)
    circle(PR+4,y,3.5,GOLD)
    for row in wrap(e['title'],EW,24,'cond'):text(row,EX,ty,24,INK,'cond');ty+=28
    date=e.get('date',('c. ' if e.get('approx') else '')+yr(e['year']))
    text(date,EX,ty+4,17,GOLD)

# Screen stories: actual spans, individual titles, and uncertainty that remains visible.
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

# All 16 lives at once, each in its own constant-width lane.
lives=sorted(D['lifelines'],key=lambda p:(p['start'],p['end']))
step=LW/len(lives)
for i,p in enumerate(lives):
    x=LX+step*(i+.5);a,b=Y(p['start']),Y(p['end']);col=p['color']
    line([(x,a),(x,b)],col,2.4)
    if p['start']<-500:line([(x-5,a+5),(x,a-3),(x+5,a+5)],col,2)
    else:circle(x,a,4.2,PANEL if p.get('startApprox') else col,col,1.5)
    if p['endKind']=='death':
      line([(x-4,b-4),(x+4,b+4)],col,2);line([(x+4,b-4),(x-4,b+4)],col,2)
    else:circle(x,b,5,PANEL,col,2)
    if p.get('startApprox'):line([(x,a+7),(x,a+35)],PANEL,3,(3,4))
    if p.get('endApprox'):line([(x,b-34),(x,b-8)],PANEL,3,(3,4))
    # Stable names are repeated only where a life spans a long stretch of the sheet.
    first=a+45+(i%3)*17
    name=p['short'];length=measure(name,19,'cond')+16
    y=first
    while y+length<b-14:
      vertical(name,x,y,19,INK,'cond',False,PANEL);y+=370
# A compact legend lives in the naturally empty early portion of the lifeline panel.
rect(LX+48,TOP+91,LW-53,390,PANEL,outline=RULE,r=6)
text('16 LIVES / ONE SCALE',LX+65,TOP+110,18,GOLD,'bold')
paragraph('Line positions separate people; their widths do not encode influence.',LX+65,TOP+150,LW-94,20)
paragraph('Yoda’s birth is around 896 BBY, before the top of this map.',LX+65,TOP+247,LW-94,20)
paragraph('Open ends leave later life uncharted. Dashed endpoints are approximate.',LX+65,TOP+344,LW-94,20)
line([(60,END+30),(2540,END+30)],GOLD,1.5)
text('35 ABY  /  THE CANON ATLAS ENDS HERE',60,END+58,25,GOLD,'bold')
paragraph('The next panels follow a different continuity. Their streams do not join the canon map.',2540-1240,END+60,1240,23,INK)

# Legends are separate inset maps, with independent elastic scales.
LEGTOP=5260
text('LEGENDS',60,LEGTOP,49,PURPLE,'display')
text('EXPANDED UNIVERSE / NON-CANON',480,LEGTOP+23,27,PURPLE,'bold')
paragraph('Alternate accounts of the ancient past and distant future, outside this atlas’s canon range. Canon also contains ancient history; these are not missing chapters of Disney canon.',60,LEGTOP+90,2480,23)

def legends(mode,x,top,width):
    L=D['legends'][mode]
    space_panel(x,top,width,1425,tint=(14,6,20),opacity=.58,outline='#5c4c65',r=7)
    text('ANCIENT PAST' if mode=='ancient' else 'DISTANT FUTURE',x+24,top+25,31,PURPLE,'cond')
    text(L['range'],x+width-24,top+30,21,INK,align='right')
    paragraph('Separate Legends scale · editorial widths',x+24,top+75,width-48,18,MUTED)
    plotTop=top+90;scale=1210/L['height'];YY=lambda t:plotTop+interp(L['anchors'],t)*scale
    left=x+121;pw=width-525;right=left+pw;labelX=right+33;labelW=width-(labelX-x)-22
    for i,f in enumerate(L['factions']):
      le=[];ri=[]
      for year,w in L['knots']:
        a=left+sum(w[:i])/100*pw;b=a+w[i]/100*pw;le.append((a,YY(year)));ri.append((b,YY(year)))
      ribbon(le,ri,f['color'])
    # Diagonal marks at the edges identify the non-canon panel without hiding its bands.
    for y in range(round(top+145),round(top+1330),24):line([(x+7,y+9),(x+18,y-2)],'#82668c',1)
    last=-999
    for year,_ in L['anchors']:
      y=YY(year)
      if y-last<34:continue
      last=y;line([(x+98,y),(right,y)],'#58606b',.65,(2,6))
      text(f'{abs(year):,}',x+103,y-19,22,INK,'cond',align='right');text('BBY' if year<0 else 'ABY',x+103,y+7,13,MUTED,align='right')
    legend_art={'revan':'kotor','exile':'kotor2','old-republic':'swtor'}
    eventHeights=[len(wrap(e['title'],labelW,24,'cond'))*28+29+(66 if legend_art.get(e['id']) in ART else 0) for e in L['events']]
    ys=positions([YY(e['year']) for e in L['events']],eventHeights,plotTop+55,top+1310,15)
    for e,h,cy in zip(L['events'],eventHeights,ys):
      real=YY(e['year']);line([(right,real),(right+13,real),(labelX-8,cy)],'#8b7695',1);circle(right,real,3,PURPLE)
      ty=cy-h/2
      if legend_art.get(e['id']) in ART:lockup(legend_art[e['id']],labelX,ty,labelW,56);ty+=66
      for row in wrap(e['title'],labelW,24,'cond'):text(row,labelX,ty,24,INK,'cond');ty+=28
      text(yr(e['year']),labelX,ty+3,16,PURPLE)
    for i,f in enumerate(L['factions']):
      at=L['knots'][len(L['knots'])//2]
      if at[1][i]/100*pw<35:at=max(L['knots'],key=lambda row:row[1][i])
      weights_=at[1];center=left+(sum(weights_[:i])+weights_[i]/2)/100*pw
      vertical(f['name'].upper(),center,YY(at[0]),22,'#142328')
    def band_symbol(i,year,key,size=61,dy=0):
      # Interpolate widths at the emblem's anchor; this does not date adoption.
      ws=[interp([[yr_,w[j]] for yr_,w in L['knots']],year) for j in range(4)]
      cx=left+(sum(ws[:i])+ws[i]/2)/100*pw
      symbol(key,cx,YY(year)+dy,min(size,ws[i]/100*pw-12),'#142328')
    if mode=='ancient':
      band_symbol(0,-3643,'old-republic',66)
      band_symbol(1,-5000,'jedi',63,-55)
      band_symbol(2,-3643,'old-sith-empire',67)
    else:
      band_symbol(0,40,'alliance',80)
      band_symbol(1,40,'jedi',64)
      band_symbol(2,40,'empire',65)
      band_symbol(2,130,'fel',65,25)
      band_symbol(3,138,'sith',65)
    paragraph('NOT A CANON PREQUEL' if mode=='ancient' else 'NOT WHAT FOLLOWS EXEGOL',x+24,top+1348,width-48,19,PURPLE,'bold')
legends('ancient',60,LEGTOP+170,1210)
legends('future',1330,LEGTOP+170,1210)

# Permanent notes and credits. No reliance on a Reddit caption or interactive record.
FOOT=LEGTOP+1625
line([(60,FOOT),(2540,FOOT)],RULE,2)
text('READING THE STATIC MAP',60,FOOT+30,22,GOLD,'bold')
paragraph('Film and TV markers show principal story windows, not release dates or runtimes. Fine leaders link shifted labels to their true dates. Same-year placements do not prove scene-by-scene simultaneity.',60,FOOT+73,750,21)
paragraph('Dashed spans mark approximate placement or anthology gaps. Flashbacks and later epilogues are generally outside the principal window. The New Republic screen cluster uses a shared approximate era anchor.',60,FOOT+213,750,21)
text('LIFELINE NOTES',900,FOOT+30,22,GOLD,'bold')
paragraph('Births and deaths use canon dates. Open endpoints for Ahsoka and Grogu mark the approximate New Republic era included here, not a predicted death. Rey, Finn, Poe, Lando, and Chewbacca remain alive at the map’s end.',900,FOOT+73,750,21)
paragraph('Force spirits do not extend physical lifespans. Temporary deaths and revivals, including Ahsoka at Mortis and Rey at Exegol, are condensed at this scale. Yavin is the zero point; some references label nearby pre-Yavin events 1 BBY.',900,FOOT+239,750,21)
text('SOURCES & SCOPE',1740,FOOT+30,22,GOLD,'bold')
paragraph('Drawn from the Histomaps canon and Legends models. Sources: Lucasfilm / StarWars.com Databank and viewing guide; Wookieepedia canon, character, and Legends chronologies.',1740,FOOT+73,800,21)
paragraph('Selective coverage: 30 canon turning points, 28 screen stories, 16 character lives, and 16 Legends events. Full source links and dating notes are available in the interactive atlas.',1740,FOOT+213,800,21)

# A permanent insignia key makes shared and continuity-specific symbols explicit.
OTHER=FOOT+430
line([(60,OTHER),(2540,OTHER)],RULE,1)
text('STORIES WITHOUT ONE CONTINUOUS CANON SPAN',60,OTHER+23,23,GOLD,'bold')
for key,x,note in [('tales-underworld',60,'Separate Cad Bane and Asajj Ventress story windows.'),('forces-destiny',900,'Short stories scattered across multiple eras.'),('visions',1740,'Visions and LEGO stories use separate storytelling continuities.')]:
    lockup(key,x,OTHER+76,500,95)
    paragraph(note,x,OTHER+191,760,23)
KEY=7650
line([(60,KEY),(2540,KEY)],RULE,2)
text('FACTION INSIGNIA',60,KEY+30,35,GOLD,'cond')
paragraph('Insignia identify factions and traditions; their placement is not an adoption date. Shared symbols do not merge separate organizations or continuities.',60,KEY+83,2480,22)
keys=[
 ('republic','Galactic Republic','Republic roundel · canon',GOLD),
 ('rebel','Rebel Alliance / Resistance','Shared starbird · separate movements','#85ceb1'),
 ('new-republic','New Republic','Canon · The Mandalorian-era seal','#82b7c7'),
 ('empire','Empire / Imperial remnants','Imperial crest · changing successor groups','#d88982'),
 ('first-order','First Order','A distinct Imperial successor','#d47869'),
 ('sith-eternal','Sith Eternal','Exegol cult and fleet','#cfa4bc'),
 ('separatists','Separatist Alliance','Confederacy of Independent Systems','#a2bbcb'),
 ('nihil','The Nihil','Eye of the Storm','#bfa3d7'),
 ('jedi','Jedi tradition','Also marks the Legends Jedi / New Jedi','#a9c59b'),
 ('sith','Sith tradition','Also marks the Legends One Sith','#d28489'),
 ('old-republic','Old Republic','LEGENDS · The Old Republic-era emblem',PURPLE),
 ('old-sith-empire','Sith Empire','LEGENDS · The Old Republic-era emblem',PURPLE),
 ('alliance','Galactic Alliance','LEGENDS · distinct from the Rebel Alliance',PURPLE),
 ('fel','Fel Empire','LEGENDS · later Imperial crest',PURPLE),
 (None,'Independent / other powers','Grouped societies; no single faction insignia',MUTED),
]
for j,(key,title,note,col) in enumerate(keys):
    x=60+(j%5)*496;y=KEY+167+(j//5)*146
    line([(x,y+115),(x+459,y+115)],RULE,1)
    if key:symbol(key,x+43,y+39,72,col)
    else:
      # A neutral typographic dash denotes an unmarked aggregate, not a logo.
      text('—',x+43,y+13,37,MUTED,align='center')
    tx=x+100;ty=y+2
    ty=paragraph(title,tx,ty,365,23,INK,'cond',28)
    paragraph(note,tx,ty+10,365,17,col,leading=23)

text('INSIGNIA SOURCES & IMAGE CREDITS',60,KEY+637,19,GOLD,'bold')
paragraph('Lucasfilm insignia; source reproductions via Wikimedia Commons, Star Wars reference galleries, and Font Awesome. Insignia have been cropped and recolored for this atlas.',60,KEY+676,2480,18)
paragraph('Commons CC BY-SA 4.0 reproductions: First Order — MesserWoland / JLanzer; starbird — Mariano Agustin Serrano; New Republic — Potassium asenate; Fel Empire — Dragovit; Sith Empire — Gameposo / Marnanel; Sith Eternal — Lucasfilm / Eclipse1012. Adapted insignia retain CC BY-SA 4.0: creativecommons.org/licenses/by-sa/4.0.',60,KEY+738,2480,17)
paragraph('Jedi and Old Republic icons: Font Awesome Free, CC BY 4.0 (fontawesome.com; creativecommons.org/licenses/by/4.0). Republic, Empire, Separatist, and Sith geometric assets: Commons public-domain reproductions. Full asset URLs are embedded in the PNG metadata.',60,KEY+822,2480,17)
text('TITLE ART & TYPOGRAPHY',60,KEY+899,19,GOLD,'bold')
paragraph('Official film and series title artwork: Lucasfilm / Disney, via StarWars.com. Game logos: Lucasfilm, BioWare, and Aspyr; source reproductions via the publishers and Wikimedia. Individual sources are linked in the website Guide and embedded in this image.',60,KEY+936,2480,18)
paragraph('Star Jedi by Boba Fonts / Davide Canavero (freeware). News Cycle by Nathan Willis and Pathway Gothic One by Eduardo Tunni (SIL Open Font License). Logos identify works; this atlas remains an unofficial fan project.',60,KEY+995,2480,18)
PROMO=KEY+1060
line([(60,PROMO),(2540,PROMO)],GOLD,2)
text('EXPLORE THE INTERACTIVE ATLAS',60,PROMO+38,21,GOLD,'bold')
text('histomaps.org/StarWars',60,PROMO+85,61,INK,'cond')
paragraph('Explore the streams, stories, and sources. Find more maps at histomaps.org.',60,PROMO+169,1000,23)
text('CREATED BY',1160,PROMO+38,21,GOLD,'bold')
text('J. Hunter Sizemore',1160,PROMO+92,43,INK,'cond')
text('kliawota.design',1160,PROMO+154,31,GOLD,'cond')
paragraph('Kliawota Disaen / Design & Communications',1160,PROMO+205,675,20)
text('HELP BUILD THE NEXT HISTOMAP',1940,PROMO+38,20,GOLD,'bold')
text('patreon.com/histomaps',1940,PROMO+94,36,INK,'cond')
paragraph('Support new maps, research, and design.',1940,PROMO+156,600,23)
line([(60,H-112),(2540,H-112)],RULE,1)
text('Original atlas design and editorial work © 2026 J. Hunter Sizemore. Please retain this credit when sharing.',60,H-84,19,INK)
text('Star Wars belongs to Lucasfilm. Unofficial fan project. Insignia retain the credits and licenses above.',60,H-48,17,MUTED)
text('STATIC EDITION / 06 SEPTEMBER 2026',2540,H-80,19,MUTED,align='right')
# Every source text item is accounted for before export.
assert len(events)==30 and len(media)==28 and len(lives)==16
meta=PngImagePlugin.PngInfo();meta.add_text('Title','Star Wars Histomap — canon, screen stories, lifelines and Legends');meta.add_text('Description','Static fan atlas by J. Hunter Sizemore / kliawota.design. Editorial stream widths; elastic chronology. Explore and find sources: https://histomaps.org/StarWars/. Support: https://patreon.com/histomaps. Edition 2026-09-06.');meta.add_text('Software','Deterministic chart rendering from the Histomaps data model')
meta.add_text('Author','J. Hunter Sizemore / Kliawota Disaen')
meta.add_text('Copyright','Original atlas design and editorial work © 2026 J. Hunter Sizemore. Star Wars belongs to Lucasfilm. Insignia retain their separate credits and licenses.')
meta.add_text('Website','https://histomaps.org/StarWars/')
meta.add_text('Creator website','https://kliawota.design')
meta.add_text('Support','https://patreon.com/histomaps')
meta.add_text('Background','Original AI-generated cinematic starfield; integrated beneath the native chart, labels and artwork. Starfield edition 2026-09-06.')
meta.add_text('Title artwork sources',json.dumps({key:{k:v for k,v in value.items() if k!='local_path'} for key,value in ART.items()}))
meta.add_text('Typography','Star Jedi — Boba Fonts / Davide Canavero (freeware); News Cycle — Nathan Willis (SIL OFL 1.1); Pathway Gothic One — Eduardo Tunni (SIL OFL 1.1).')
meta.add_text('Insignia sources',(ROOT/'faction-symbols'/'credits.json').read_text())
meta.add_text('Insignia placement notes','Shared Jedi and Sith emblems denote traditions across both continuities. The Imperial crest represents canon remnants and early Legends Imperial powers; the later Fel crest is confined to the Legends future. The Old Republic and Sith Empire emblems are confined to the SWTOR-era portion of Legends. Independent worlds and other powers are aggregate bands, not single factions.')
out=args.output
out.parent.mkdir(parents=True,exist_ok=True)
im.save(out,pnginfo=meta,compress_level=8)
if args.preview_dir:
    args.preview_dir.mkdir(parents=True,exist_ok=True)
    im.resize((1300,H//2),Image.Resampling.LANCZOS).save(args.preview_dir/'poster-preview.jpg',quality=93)
    # Separate closeups are only inspection intermediates.
    for name,box in [('header',(0,0,W,560)),('upper',(40,510,2540,1620)),('middle',(40,2200,2540,3500)),('end',(40,4000,2540,5160)),('legends',(40,LEGTOP,2560,FOOT)),('symbols',(40,KEY-10,2560,H))]:
        crop=im.crop(tuple(round(v*S) for v in box));crop.thumbnail((1800,1800));crop.save(args.preview_dir/('poster-'+name+'.jpg'),quality=95)
    (args.preview_dir/'symbol-placements.json').write_text(json.dumps(symbol_placements,indent=2))
    (args.preview_dir/'title-placements.json').write_text(json.dumps(title_placements))
print(json.dumps({'file':str(out),'pixels':im.size,'bytes':out.stat().st_size,'content':{'canon_events':len(events),'screen_titles':len(media),'lifelines':len(lives),'legends_events':sum(len(L['events']) for L in D['legends'].values())}}))
