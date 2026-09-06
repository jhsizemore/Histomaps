from pathlib import Path

SW = Path(__file__).resolve().parents[1]
path = SW / 'tools' / 'poster' / 'render.py'
text = path.read_text()
start = '# Screen stories: actual spans, individual titles, and uncertainty that remains visible.\n'
end = '# All 16 lives at once, each in its own constant-width lane.\n'
a = text.find(start)
b = text.find(end, a + len(start))
if a < 0 or b < 0:
    raise RuntimeError('Films & TV poster block markers not found')

replacement = r'''# Screen stories: actual spans, individual titles, and uncertainty that remains visible.
# Shared-date point stories use one card so their leaders cannot collapse into one another.
# Every individual lockup remains present; film lockups retain their established size.
colors={'film':GOLD,'series':'#91bade','animation':'#86c7ad','anthology':'#b798d0'}
raw_media=sorted(D['screen'],key=lambda m:(Y(m['start'])+Y(m['end']))/2)
labelX=MX+87; labelW=MW-102

def media_logo_height(m):
    base=min(85,labelW*ART[m['id']]['height']/ART[m['id']]['width'])
    return base if m['kind']=='film' else max(38,base*.82)

def group_media(rows):
    points={}; groups=[]
    for m in rows:
      if m['start']==m['end']:points.setdefault(m['start'],[]).append(m)
      else:groups.append({'start':m['start'],'end':m['end'],'items':[m],'approx':m.get('approx',False),'kind':m['kind']})
    for year,items in points.items():
      groups.append({'start':year,'end':year,'items':items,'approx':any(i.get('approx') for i in items),'kind':'film' if all(i['kind']=='film' for i in items) else 'series'})
    return sorted(groups,key=lambda g:(Y(g['start'])+Y(g['end']))/2)

def group_height(g):
    logos=sum(media_logo_height(m) for m in g['items'])
    return logos+max(0,len(g['items'])-1)*8+58

def group_type(g):
    items=g['items']
    if len(items)==1:
      m=items[0]
      typ={'film':'FILM','series':'LIVE ACTION','animation':'ANIMATION','anthology':'ANTHOLOGY · GAPS'}[m['kind']]
      if m.get('discontinuous') and m['kind']!='anthology':typ+=' · TIME JUMP'
      return typ
    kinds=[]
    for m in items:
      name={'film':'FILM','series':'TV','animation':'ANIMATION','anthology':'ANTHOLOGY'}[m['kind']]
      if name not in kinds:kinds.append(name)
    if len(kinds)==1 and kinds[0]=='FILM':return f'{len(items)} FILMS'
    return f'{len(items)} TITLES · '+ ' + '.join(kinds)

media=group_media(raw_media)
mheights=[group_height(g) for g in media]
mcenters=positions([(Y(g['start'])+Y(g['end']))/2 for g in media],mheights,TOP+90,END-5,12)
occupied=[]
anchorX=labelX-18
for g,h,cy in zip(media,mheights,mcenters):
    items=g['items'];m=items[0];a,b=Y(g['start']),Y(g['end']);mid=(a+b)/2;col=colors[g['kind']];grouped=len(items)>1
    lane=next((i for i,v in enumerate(occupied) if v<a-10),len(occupied))
    if lane==len(occupied):occupied.append(b+10)
    else:occupied[lane]=b+10
    x=MX+8+lane*11
    if a!=b:
      line([(x,a),(x,b)],col,4,(4,5) if m.get('discontinuous') else (8,5) if m.get('approx') else None)
      line([(x-5,a),(x+5,a)],col,2);line([(x-5,b),(x+5,b)],col,2)
    elif grouped:
      circle(x,a,6,PANEL,col,2);circle(x,a,2,col)
    elif m['kind']=='film':poly([(x,a-6),(x+6,a),(x,a+6),(x-6,a)],PANEL if m.get('approx') else col,col)
    else:circle(x,a,5,PANEL if m.get('approx') else col,col,2)
    # One immutable temporal anchor per card. Same-year titles now share that card and that anchor.
    line([(x+6,mid),(anchorX-6,mid)],col,1.2)
    circle(anchorX,mid,3.3,PANEL,col,1.6)
    if grouped:circle(anchorX,mid,1.4,col)
    ty=cy-h/2
    attach=ty+10 if mid<ty else ty+h-10 if mid>ty+h else mid
    line([(anchorX+4,mid),(anchorX+10,mid),(labelX-8,attach),(labelX-2,attach)],'#667b82',1)
    rect(labelX-4,ty-5,labelW+8,h+5,PANEL)
    cursor=ty
    for item in items:
      logoH=media_logo_height(item)
      lockup(item['id'],labelX,cursor,labelW,logoH)
      cursor+=logoH+8
    cursor+=4
    if grouped:
      date=('c. ' if g.get('approx') else '')+yr(g['start'])
    else:
      date=('c. ' if m.get('approx') else '')+(yr(m['start']) if m['start']==m['end'] else yr(m['start'])+' – '+yr(m['end']))
      if m['id']=='mando-film':date='New Republic era · approximate'
    text(date,labelX,cursor+2,16,col)
    text(group_type(g),labelX,cursor+24,13,MUTED)
assert len(occupied)<=7

'''
text = text[:a] + replacement + text[b:]
old = 'Film and TV markers show principal story windows, not release dates or runtimes. Fine leaders link shifted labels to their true dates. Same-year placements do not prove scene-by-scene simultaneity.'
new = 'Film and TV markers show principal story windows, not release dates or runtimes. Shared-date titles use one grouped card with every individual lockup retained; its anchor stays fixed at the shared date. Fine leaders link shifted labels to their true dates.'
if text.count(old) != 1:
    raise RuntimeError(f'poster reading note: expected one match, found {text.count(old)}')
text = text.replace(old, new, 1)
path.write_text(text)
print('Grouped shared-date screen titles in the static poster.')
