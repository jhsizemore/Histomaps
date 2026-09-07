from pathlib import Path

app_path=Path('StarWars/app.js')
app=app_path.read_text()

# Shared renderer for the concise editorial lead at the top of every record.
needle="  function sourceLink(key){\n    const [label,url]=D.sources[key];const a=el('a','source-link',`${label} ↗`);\n    a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;\n  }\n"
replacement=needle+"  function appendSynopsis(target,data){if(data?.synopsis)target.append(el('p','record-synopsis',data.synopsis));}\n"
assert needle in app and 'function appendSynopsis' not in app
app=app.replace(needle,replacement,1)

# Canon faction and event records: synopsis replaces the old first paragraph;
# map interpretation/effect remains its own section below.
old="    const heading=el('h2','',isEvent?data.title:data.name);heading.tabIndex=-1;box.append(heading,el('p','',data.text));\n"
new="    const heading=el('h2','',isEvent?data.title:data.name);heading.tabIndex=-1;box.append(heading);appendSynopsis(box,data);\n"
assert old in app
app=app.replace(old,new,1)

# Legends overview.
old="  function legendOverview(){const L=D.legends[mode],box=$('inspector-content');box.replaceChildren();box.append(el('div','record-date','LEGENDS · NOT DISNEY CANON'),el('h2','',L.name.replace('Legends · ','')),el('p','',L.intro),el('div','record-divider'),el('p','','Hatching and purple labels identify this separate continuity. Stream widths are qualitative; this is a selective overview, not a comprehensive chronology.'),sourceLink('legendsPolicy'));}\n"
new="  function legendOverview(){const L=D.legends[mode],box=$('inspector-content');box.replaceChildren();box.append(el('div','record-date','LEGENDS · NOT DISNEY CANON'),el('h2','',L.name.replace('Legends · ','')));appendSynopsis(box,L);box.append(el('div','record-divider'),el('p','','Hatching and purple labels identify this separate continuity. Stream widths are qualitative; this is a selective overview, not a comprehensive chronology.'),sourceLink('legendsPolicy'));}\n"
assert old in app
app=app.replace(old,new,1)

# Lifelines.
old="      box.append(el('div','record-date','CANON · CHARACTER LIFELINE'),heading);\n"
new="      box.append(el('div','record-date','CANON · CHARACTER LIFELINE'),heading);appendSynopsis(box,p);\n"
assert old in app
app=app.replace(old,new,1)

# Grouped film/TV record.
old="      box.append(el('div','record-date',screenDate(group)),heading,el('p','','Select a title to see its full story window, overlaps, and dating notes.'));\n"
new="      box.append(el('div','record-date',screenDate(group)),heading);appendSynopsis(box,group);box.append(el('p','hint','Select a title to see its full story window, overlaps, and dating notes.'));\n"
assert old in app
app=app.replace(old,new,1)

# Individual film/TV record: keep dating note below the synopsis.
old="      box.append(el('div','record-date',screenDate(m)),heading,el('div','record-label',`${m.kind} · canon`),el('p','',m.note||'The principal story takes place in this dated window. A point marks a year; it does not imply a year-long runtime.'));\n"
new="      box.append(el('div','record-date',screenDate(m)),heading);appendSynopsis(box,m);box.append(el('div','record-label',`${m.kind} · canon`),el('p','',m.note||'The principal story takes place in this dated window. A point marks a year; it does not imply a year-long runtime.'));\n"
assert old in app
app=app.replace(old,new,1)

# Legends event record.
old="      box.append(el('div','record-date',`${formatYear(e.year)} · LEGENDS`),heading,el('p','',e.text),el('div','record-label','Reading the map'),el('p','',e.effect));\n"
new="      box.append(el('div','record-date',`${formatYear(e.year)} · LEGENDS`),heading);appendSynopsis(box,e);box.append(el('div','record-label','Reading the map'),el('p','',e.effect));\n"
assert old in app
app=app.replace(old,new,1)

# Legends faction record.
old="      const f=D.legends[mode].factions.find(f=>f.id===record.id);heading=el('h2','',f.name);box.append(el('div','record-date','LEGENDS · INTERPRETIVE STREAM'));recordSymbols(box,f.id);box.append(heading,el('p','','This stream groups related institutions or rival powers across selected Legends stories. Its width shows an editorial interpretation of influence, not measured territory. Jedi traditions and political institutions can overlap.'));\n"
new="      const f=D.legends[mode].factions.find(f=>f.id===record.id);heading=el('h2','',f.name);box.append(el('div','record-date','LEGENDS · INTERPRETIVE STREAM'));recordSymbols(box,f.id);box.append(heading);appendSynopsis(box,f);box.append(el('p','hint','This stream groups related institutions or rival powers across selected Legends stories. Its width shows an editorial interpretation of influence, not measured territory. Jedi traditions and political institutions can overlap.'));\n"
assert old in app
app=app.replace(old,new,1)

# Grouped screen cards are generated at runtime; give the generated record its own
# two-sentence synopsis so even that inspector panel follows the same rule.
old="      rows.push({id:`year-${t}`,start:t,end:t,items,approx:items.some(m=>m.approx),kind:items.every(m=>m.kind==='film')?'film':'series',name:t===9?'New Republic stories':t===0?'Rogue One / IV':t===34?'Episodes VII / VIII':t===-22?'Attack of the Clones / The Clone Wars':`${items.length} screen stories`});\n"
new="      const group={id:`year-${t}`,start:t,end:t,items,approx:items.some(m=>m.approx),kind:items.every(m=>m.kind==='film')?'film':'series',name:t===9?'New Republic stories':t===0?'Rogue One / IV':t===34?'Episodes VII / VIII':t===-22?'Attack of the Clones / The Clone Wars':`${items.length} screen stories`};\n      const names=items.map(m=>m.name).join(', ');group.synopsis=`This shared-date record groups ${names} at ${formatYear(t)} on the atlas. Each title remains a separate story with its own chronology; the combined card simply prevents same-date labels from colliding.`;rows.push(group);\n"
assert old in app
app=app.replace(old,new,1)

app_path.write_text(app)

# Load synopsis data after all timeline record arrays exist, before the app renders.
index_path=Path('StarWars/index.html')
index=index_path.read_text()
old='  <script src="lifelines.js?v=qa-20260907" defer></script>\n  <script src="insignia.js" defer></script>'
new='  <script src="lifelines.js?v=qa-20260907" defer></script>\n  <script src="synopses.js?v=synopsis-20260907" defer></script>\n  <script src="insignia.js" defer></script>'
assert old in index and 'synopses.js' not in index
index=index.replace(old,new,1)
index=index.replace('styles.css?v=selection-20260907','styles.css?v=synopsis-20260907',1)
index=index.replace('app.js?v=selection-20260907','app.js?v=synopsis-20260907',1)
index_path.write_text(index)

styles_path=Path('StarWars/styles.css')
styles=styles_path.read_text()
marker='/* record-synopsis-20260907 */'
assert marker not in styles
styles += r'''

/* record-synopsis-20260907 */
.inspector .record-synopsis{margin:2px 0 24px;padding:1px 0 1px 14px;border-left:2px solid #d9c07d99;color:#e4ece8;font-size:17px;line-height:1.62;font-weight:500;text-wrap:pretty}
.legends-mode .inspector .record-synopsis{border-left-color:#d8b4eb99}
@media(max-width:620px){.inspector .record-synopsis{font-size:16px;line-height:1.56;margin-bottom:20px;padding-left:12px}}
'''
styles_path.write_text(styles)
