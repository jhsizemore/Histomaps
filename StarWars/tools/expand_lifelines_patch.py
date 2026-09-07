from pathlib import Path

# INDEX: load recurring data, expose finer batches, document endpoint semantics.
p=Path('StarWars/index.html'); s=p.read_text()
s=s.replace('<script src="lifelines.js?v=qa-20260907" defer></script>\n  <script src="synopses.js?v=synopsis-20260907" defer></script>',
'''<script src="lifelines.js?v=qa-20260907" defer></script>\n  <script src="recurring-lifelines.js?v=lifelines-20260908" defer></script>\n  <script src="synopses.js?v=lifelines-20260908" defer></script>''')
s=s.replace('app.js?v=aurebesh-20260907','app.js?v=lifelines-20260908')
old='<select id="life-group" aria-label="Character group" hidden><option value="skywalker">Skywalkers</option><option value="jedi">Jedi</option><option value="rebellion">Rebellion</option><option value="resistance">Resistance</option></select>'
new='''<select id="life-group" aria-label="Character group" hidden>
              <option value="skywalker">Skywalker family</option>
              <option value="jedi">Jedi · core lives</option>
              <option value="jedi-council">Jedi Council</option>
              <option value="jedi-allies">Jedi &amp; Force allies</option>
              <option value="dark-side">Sith &amp; dark side</option>
              <option value="clones">Clone troopers</option>
              <option value="republic">Republic</option>
              <option value="separatists">Separatists</option>
              <option value="rebellion">Rebellion · core lives</option>
              <option value="rebellion-leaders">Rebellion · leaders</option>
              <option value="rebellion-heroes">Rebellion · field heroes</option>
              <option value="empire">Empire</option>
              <option value="mandalorians">Mandalorians</option>
              <option value="underworld">Underworld</option>
              <option value="new-republic">New Republic era</option>
              <option value="resistance">Resistance</option>
              <option value="first-order">First Order</option>
              <option value="droids">Droids</option>
            </select>'''
assert old in s; s=s.replace(old,new)
oldguide='<h3>Canon lifelines</h3><p>Select Lifelines, then choose a character group. Each line follows one life, independently of political influence. A filled circle marks birth, a cross marks confirmed death, and an open circle marks the last dated appearance included here with a later fate left unknown. An upward chevron means a birth falls before the map. Dashed endpoints are approximate. Force-ghost appearances do not extend a biological lifespan; Ahsoka’s temporary death on Mortis is noted in her record.</p>'
newguide='<h3>Canon lifelines</h3><p>Select Lifelines, then choose a character batch. The 16 featured lives use known birth-to-death or last-known dates where available; the expanded recurring-character set covers named characters appearing in at least three mapped screen properties. A filled circle marks birth, a diamond marks the first mapped screen appearance when no birth date is asserted, a cross marks confirmed death, and an open circle marks the last mapped appearance with later fate uncharted. An upward chevron means a birth falls before the map. Dashed endpoints are approximate. Force-ghost appearances do not extend a biological lifespan.</p>'
assert oldguide in s; s=s.replace(oldguide,newguide)
p.write_text(s)

# SYNOPSES: preserve explicit leads baked into recurring-lifelines.js.
p=Path('StarWars/synopses.js'); s=p.read_text()
old="p.synopsis=lives[p.id]||lead(p.note,`The atlas follows ${p.name} as one physical life across the political changes surrounding them.`);"
new="p.synopsis=p.synopsis||lives[p.id]||lead(p.note,`The atlas follows ${p.name} across the political changes surrounding them.`);"
assert old in s; s=s.replace(old,new); p.write_text(s)

# APP: mixed biological and appearance-span semantics.
p=Path('StarWars/app.js'); s=p.read_text()
s=s.replace("$('layer-caption').textContent=layer==='life'&&hasCompanion?'● Born  × Died  ○ Last appearance'", "$('layer-caption').textContent=layer==='life'&&hasCompanion?'● Birth · ◇ First mapped · × Death · ○ Last mapped'")
old="""    pane.append(svg('text',{x:10,y:29,class:'screen-meta'},'● Birth   × Death'));
    pane.append(svg('text',{x:10,y:48,class:'screen-meta'},'○ Last seen here'));"""
new="""    pane.append(svg('text',{x:10,y:29,class:'screen-meta'},'● Birth · ◇ First mapped'));
    pane.append(svg('text',{x:10,y:48,class:'screen-meta'},'× Death · ○ Last mapped'));"""
assert old in s; s=s.replace(old,new)
old="""      const g=svg('g',{class:'lifeline',tabindex:0,role:'button','aria-label':`${p.name}, born ${lifeDate(p,true)}, ${p.endKind==='death'?'died':'alive at last mapped appearance'} ${lifeDate(p,false)}`});g.dataset.life=p.id;"""
new="""      const startLabel=p.startKind==='appearance'?'first mapped appearance':'born',endLabel=p.endKind==='death'?'died':'last mapped appearance';
      const g=svg('g',{class:'lifeline',tabindex:0,role:'button','aria-label':`${p.name}, ${startLabel} ${lifeDate(p,true)}, ${endLabel} ${lifeDate(p,false)}`});g.dataset.life=p.id;"""
assert old in s; s=s.replace(old,new)
old="""      if(p.start<-500)g.append(svg('path',{d:`M ${x-5} ${start+5} L ${x} ${start-2} L ${x+5} ${start+5}`,fill:'none',stroke:p.color,'stroke-width':2}));
      else g.append(svg('circle',{cx:x,cy:start,r:4,fill:p.startApprox?'#102025':p.color,stroke:p.color,'stroke-width':2,'stroke-dasharray':p.startApprox?'2 2':'none'}));"""
new="""      if(p.startKind==='appearance')g.append(svg('path',{d:`M ${x} ${start-5} l 5 5 -5 5 -5 -5 Z`,fill:'#102025',stroke:p.color,'stroke-width':1.8}));
      else if(p.start<-500)g.append(svg('path',{d:`M ${x-5} ${start+5} L ${x} ${start-2} L ${x+5} ${start+5}`,fill:'none',stroke:p.color,'stroke-width':2}));
      else g.append(svg('circle',{cx:x,cy:start,r:4,fill:p.startApprox?'#102025':p.color,stroke:p.color,'stroke-width':2,'stroke-dasharray':p.startApprox?'2 2':'none'}));"""
assert old in s; s=s.replace(old,new)
s=s.replace("if(p.startApprox)g.append(svg('line'", "if(p.startApprox&&p.startKind!=='appearance')g.append(svg('line'",1)
old="""      [[p.startApprox?'Born · approximate':'Born',lifeDate(p,true)],[p.endKind==='death'?'Died':'Alive · last mapped era',lifeDate(p,false)]].forEach(([label,value])=>{const item=el('div');item.append(el('small','',label),el('strong','',value));dates.append(item);});box.append(dates,el('p','',p.note));
      box.append(el('p','hint','The line follows physical life, independently of political affiliation. Spacing uses the same elastic dates as the streams. An open endpoint leaves later life uncharted.'));"""
new="""      [[p.startKind==='appearance'?'First mapped appearance':p.startApprox?'Born · approximate':'Born',lifeDate(p,true)],[p.endKind==='death'?'Died':'Last mapped appearance',lifeDate(p,false)]].forEach(([label,value])=>{const item=el('div');item.append(el('small','',label),el('strong','',value));dates.append(item);});box.append(dates,el('p','',p.note));
      if(p.appearances?.length){const tags=el('div','record-tags');p.appearances.forEach(id=>{const m=D.screen.find(v=>v.id===id);if(m)tags.append(el('span','',m.name));});box.append(el('div','record-label',`Mapped screen properties · ${p.appearances.length}`),tags);}
      box.append(el('p','hint',p.startKind==='appearance'?'This is an appearance-span track: it connects the first and last dated screen properties represented in this atlas and does not claim to show the character’s birth, death, or every off-screen year.':'The line follows physical life, independently of political affiliation. Spacing uses the same elastic dates as the streams. An open endpoint leaves later life uncharted.'));"""
assert old in s; s=s.replace(old,new)
p.write_text(s)

# AUDIT: website may intentionally contain more lifelines than the static poster.
p=Path('StarWars/tools/poster/audit-data-sync.js'); s=p.read_text()
s=s.replace("for (const file of ['data.js', 'expanded-data.js', 'lifelines.js', 'insignia.js', 'title-art.js'])", "for (const file of ['data.js', 'expanded-data.js', 'lifelines.js', 'recurring-lifelines.js', 'insignia.js', 'title-art.js'])")
s=s.replace("const syncKeys = ['height', 'anchors', 'eras', 'sources', 'factions', 'states', 'events', 'screen', 'undatedScreen', 'legends', 'lifelines'];", "const syncKeys = ['height', 'anchors', 'eras', 'sources', 'factions', 'states', 'events', 'screen', 'undatedScreen', 'legends'];")
needle="""for (const key of syncKeys) {
  if (!(key in web)) differences.push(`${key}: missing on web`);
  else if (!(key in poster)) differences.push(`${key}: missing on poster`);
  else diff(web[key], poster[key], key, differences);
}
"""
insert=needle+"""// The interactive atlas deliberately carries a much larger recurring-character layer.
// The static poster retains the original featured lives for legibility; each poster life
// must still exist unchanged in the website data.
const webLifeById = new Map((web.lifelines || []).map(x => [x.id, x]));
for (const life of poster.lifelines || []) {
  const live = webLifeById.get(life.id);
  if (!live) differences.push(`lifelines.${life.id}: featured poster life missing on web`);
  else diff(live, life, `lifelines.${life.id}`, differences);
}
"""
assert needle in s; s=s.replace(needle,insert)
s=s.replace("console.log(`Lifelines:  ${webLifeIds.size} web / ${posterLifeIds.size} poster`);", "console.log(`Lifelines:  ${webLifeIds.size} web / ${posterLifeIds.size} featured poster`);")
s=s.replace("console.log('\\nPASS: timeline data, title-art identity, and faction-symbol identity are synchronized.');", "console.log('\\nPASS: synchronized timeline/visual data; poster lifelines are a verified featured subset of the expanded interactive layer.');")
p.write_text(s)

# WORKFLOW: recurring data is a validated permanent input.
p=Path('.github/workflows/starwars-generated-assets.yml'); s=p.read_text()
s=s.replace("      - 'StarWars/lifelines.js'\n      - 'StarWars/synopses.js'", "      - 'StarWars/lifelines.js'\n      - 'StarWars/recurring-lifelines.js'\n      - 'StarWars/synopses.js'")
# replacement occurs in push and PR lists because replace is global
s=s.replace("          node --check StarWars/app.js\n          node --check StarWars/synopses.js", "          node --check StarWars/app.js\n          node --check StarWars/recurring-lifelines.js\n          node --check StarWars/synopses.js")
p.write_text(s)

# README: document expanded interactive vs curated poster model.
p=Path('StarWars/README.md'); s=p.read_text()
s=s.replace('`lifelines.js` contains 16 canon character lifelines, source links, uncertainty flags, and character groups.', '`lifelines.js` contains the 16 featured biological lifelines used by the website and static poster; `recurring-lifelines.js` adds 78 screen-recurring characters to the interactive layer, for 94 selectable characters total, with explicit qualifying property lists and filter groups.')
s=s.replace('Lifelines use the same time scale. Filled circles mean birth, crosses mean confirmed death, open circles mean the last mapped appearance with later fate uncharted, and upward chevrons mean the birth precedes the map. Approximate endpoints are marked independently. Force spirits do not extend physical lifespans. Skywalkers includes Rey’s adopted name, not biological descent. New Republic appearances remain approximate era anchors.', 'Lifelines use the same time scale and are shown in compact character batches. The 16 featured records use known birth/death or last-known dates where available. The 78 expanded recurring-character records qualify through at least three mapped screen properties and use a diamond for first mapped screen appearance rather than inventing a birth date. Filled circles mean birth, crosses confirmed death, open circles last mapped appearance, and upward chevrons a birth before the map. The static poster deliberately retains only the 16 featured lives for legibility.')
s=s.replace('Changes to the app shell (`index.html`, `app.js`), timeline data, lifelines, insignia, title art, the starfield, poster inputs, either renderer, or the workflow itself trigger the pipeline.', 'Changes to the app shell (`index.html`, `app.js`), timeline data, featured or recurring lifelines, insignia, title art, the starfield, poster inputs, either renderer, or the workflow itself trigger the pipeline.')
p.write_text(s)

print('Recurring lifeline UI/CI patch applied')
