from pathlib import Path

app_path=Path('StarWars/app.js')
app=app_path.read_text()
old="map.querySelector('.selected-year')?.remove();map.querySelector('.screen-highlight')?.remove();"
new=old+"map.querySelectorAll('.selection-saber,.selection-saber-core').forEach(n=>n.remove());"
assert old in app and 'selection-saber-core' not in app, 'selection cleanup target not found or already patched'
app=app.replace(old,new,1)
old_span="if(span){const y=yearY(span.start)*zoom,h=Math.max(2,(yearY(span.end)-yearY(span.start))*zoom);map.append(svg('rect',{x:mapX(84),y,width:chartWidth-mapX(84)-34,height:h,fill:span.color||'#e3c17c','fill-opacity':.075,class:'screen-highlight','pointer-events':'none'}));}"
new_span="""if(span){
      const y=yearY(span.start)*zoom,h=Math.max(2,(yearY(span.end)-yearY(span.start))*zoom),color=span.color||'#e3c17c';
      map.append(svg('rect',{x:mapX(84),y,width:chartWidth-mapX(84)-34,height:h,fill:color,'fill-opacity':.075,class:'screen-highlight','pointer-events':'none'}));
      const minBlade=12,y1=h<minBlade?y-(minBlade-h)/2:y,y2=h<minBlade?y+(minBlade+h)/2:y+h,sx=Math.max(mapX(84)+8,chartWidth-(chartWidth<700?52:72));
      map.append(svg('line',{x1:sx,x2:sx,y1,y2,stroke:color,class:'selection-saber','pointer-events':'none'}));
      map.append(svg('line',{x1:sx,x2:sx,y1:y1+1,y2:y2-1,stroke:'#fffef1',class:'selection-saber-core','pointer-events':'none'}));
    }"""
assert old_span in app, 'span highlight target not found'
app=app.replace(old_span,new_span,1)
app_path.write_text(app)

styles_path=Path('StarWars/styles.css')
styles=styles_path.read_text()
marker='/* selection-saber-20260907 */'
assert marker not in styles, 'selection saber styles already present'
styles += r'''

/* selection-saber-20260907 */
.selection-saber{stroke-width:4;stroke-linecap:round;opacity:.82;filter:drop-shadow(0 0 2px rgba(255,255,255,.64)) drop-shadow(0 0 7px rgba(255,232,31,.26))}
.selection-saber-core{stroke-width:1.15;stroke-linecap:round;opacity:.92;filter:drop-shadow(0 0 2px rgba(255,255,255,.72))}
'''
styles_path.write_text(styles)
