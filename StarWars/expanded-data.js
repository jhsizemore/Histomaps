/* Dates describe story time, never release years. Point markers do not invent durations.
   Legends is displayed as separate sections; its streams never join canon streams. */
Object.assign(window.HISTOMAP.sources,{
  viewing:['Official film and series viewing guide','https://www.starwars.com/news/star-wars-movies-and-series-guide'],
  tvDates:['Canon TV chronology · Wookieepedia','https://starwars.fandom.com/wiki/Timeline_of_canon_television_series'],
  legendsPolicy:['Lucasfilm: the Expanded Universe becomes Legends','https://www.starwars.com/news/the-legendary-star-wars-expanded-universe-turns-a-new-page'],
  dawn:['Dawn of the Jedi · original series overview','https://www.starwars.com/news/the-brilliance-of-star-wars-dawn-of-the-jedi'],
  kotor:['Knights of the Old Republic · Lucasfilm','https://www.starwars.com/games-apps/knights-of-the-old-republic'],
  swtor:['The Old Republic · Lucasfilm','https://www.starwars.com/games-apps/star-wars-the-old-republic'],
  hyperspace:['Great Hyperspace War · Legends','https://starwars.fandom.com/wiki/Great_Hyperspace_War/Legends'],
  greatSith:['Great Sith War · Legends','https://starwars.fandom.com/wiki/Great_Sith_War/Legends'],
  newSith:['New Sith Wars · Legends','https://starwars.fandom.com/wiki/New_Sith_Wars'],
  legendsGames:['Legends game chronology · Wookieepedia','https://starwars.fandom.com/wiki/Timeline_of_Legends_video_games'],
  legacyComic:['Star Wars: Legacy · chronology','https://starwars.fandom.com/wiki/Star_Wars%3A_Legacy'],
  legendsBooks:['Legends book chronology · Wookieepedia','https://starwars.fandom.com/wiki/Timeline_of_Legends_books'],
  legendsComics:['Legends comic chronology · Wookieepedia','https://starwars.fandom.com/wiki/Timeline_of_Legends_comics'],
  legacy:['Legacy era · Legends','https://starwars.fandom.com/wiki/Legacy_era'],
  maulShow:['Maul – Shadow Lord · Lucasfilm','https://www.starwars.com/series/star-wars-maul-shadow-lord'],
  mandoFilm:['The Mandalorian and Grogu · Lucasfilm','https://www.starwars.com/films/star-wars-the-mandalorian-and-grogu']
});
window.HISTOMAP.screen=[
  {id:'young-jedi',name:'Young Jedi Adventures',kind:'animation',start:-232,end:-232,approx:true,note:'High Republic placement, around 232 BBY. The marker does not claim every season occupies a single year.',sources:['tvDates','viewing']},
  {id:'acolyte-tv',name:'The Acolyte',kind:'series',start:-132,end:-132,note:'Main investigation. The Brendok flashback is earlier, around 148 BBY.',sources:['tvDates']},
  {id:'ep1',name:'I · The Phantom Menace',kind:'film',start:-32,end:-32,sources:['dates']},
  {id:'ep2',name:'II · Attack of the Clones',kind:'film',start:-22,end:-22,sources:['dates']},
  {id:'clone-film',name:'The Clone Wars · film',kind:'film',start:-22,end:-22,sources:['dates']},
  {id:'clone-tv',name:'The Clone Wars',kind:'animation',start:-22,end:-19,note:'The main wartime narrative. The final arc overlaps Revenge of the Sith; the closing Imperial-era coda is outside this span.',sources:['tvDates','viewing']},
  {id:'ep3',name:'III · Revenge of the Sith',kind:'film',start:-19,end:-19,sources:['dates']},
  {id:'bad-batch',name:'The Bad Batch',kind:'animation',start:-19,end:-18,approx:true,note:'Main story in the early Imperial period. The later Omega epilogue is not treated as continuous screen time.',sources:['tvDates']},
  {id:'maul-tv',name:'Maul – Shadow Lord',kind:'animation',start:-18,end:-18,approx:true,note:'Early Imperial era, approximately 18 BBY. Sources differ on the exact placement; this is an approximate marker, not a precise duration.',sources:['maulShow','tvDates']},
  {id:'solo-film',name:'Solo',kind:'film',start:-13,end:-10,note:'Includes the Corellia opening and the three-year jump to the principal adventure. The bracket includes the intervening gap.',discontinuous:true,sources:['dates']},
  {id:'obi-wan',name:'Obi-Wan Kenobi',kind:'series',start:-9,end:-9,note:'Main story, excluding the prequel-era opening and flashbacks.',sources:['tvDates']},
  {id:'andor-tv',name:'Andor · seasons 1–2',kind:'series',start:-5,end:0,note:'Main story across the two seasons. Season 2 advances in year-separated arcs and ends immediately before Rogue One. Childhood flashbacks sit outside this span.',sources:['viewing','tvDates']},
  {id:'rebels-tv',name:'Rebels',kind:'animation',start:-5,end:0,note:'The main rebellion narrative runs alongside Andor. Later epilogue scenes are not included in this continuous span.',sources:['viewing','tvDates']},
  {id:'rogue-one',name:'Rogue One',kind:'film',start:0,end:0,note:'Main mission, immediately before A New Hope. The childhood opening is earlier.',sources:['dates']},
  {id:'ep4',name:'IV · A New Hope',kind:'film',start:0,end:0,note:'Contains the Battle of Yavin, the BBY/ABY reference point.',sources:['dates']},
  {id:'ep5',name:'V · The Empire Strikes Back',kind:'film',start:3,end:3,sources:['dates']},
  {id:'ep6',name:'VI · Return of the Jedi',kind:'film',start:4,end:4,sources:['dates']},
  {id:'mando-tv',name:'The Mandalorian',kind:'series',start:9,end:9,approx:true,note:'Begins around 9 ABY. Later-season elapsed time is not securely fixed here. This marks the shared New Republic story period, not an assertion that all three seasons last one year.',sources:['tvDates','viewing']},
  {id:'boba-tv',name:'The Book of Boba Fett',kind:'series',start:9,end:9,approx:true,note:'Main present-day story in the Mandalorian period. Flashbacks begin after Return of the Jedi, around 4 ABY.',sources:['tvDates','viewing']},
  {id:'ahsoka-tv',name:'Ahsoka · season 1',kind:'series',start:9,end:9,approx:true,note:'Placed in the shared New Republic period, conventionally around 9 ABY. The precise ordering and elapsed time among related series are not implied by the stacked labels.',sources:['tvDates','viewing']},
  {id:'skeleton-tv',name:'Skeleton Crew',kind:'series',start:9,end:9,approx:true,note:'Around 9 ABY, in the same broad New Republic period as the Mandalorian stories. Same-year placement does not prove scene-by-scene simultaneity.',sources:['tvDates','viewing']},
  {id:'mando-film',name:'The Mandalorian and Grogu',kind:'film',start:9,end:9,approx:true,note:'After the Mandalorian series, within the New Republic era. This shared-era anchor is approximate; the exact in-universe year and duration are not asserted.',sources:['mandoFilm','viewing']},
  {id:'resistance-tv',name:'Resistance',kind:'animation',start:34,end:35,note:'Begins before The Force Awakens and continues beyond it. The show overlaps the sequel conflict.',sources:['viewing','tvDates']},
  {id:'ep7',name:'VII · The Force Awakens',kind:'film',start:34,end:34,sources:['dates']},
  {id:'ep8',name:'VIII · The Last Jedi',kind:'film',start:34,end:34,note:'Begins immediately after The Force Awakens.',sources:['dates']},
  {id:'ep9',name:'IX · The Rise of Skywalker',kind:'film',start:35,end:35,sources:['dates']},
  {id:'tales-jedi',name:'Tales of the Jedi',kind:'anthology',start:-68,end:-18,approx:true,discontinuous:true,note:'An approximate anthology envelope from Dooku’s earlier career to Ahsoka after the purge. Separate episodes and time jumps, not a continuously unfolding 50-year story.',sources:['tvDates','viewing']},
  {id:'tales-empire',name:'Tales of the Empire',kind:'anthology',start:-20,end:9,approx:true,discontinuous:true,note:'Disconnected Morgan Elsbeth and Barriss Offee stories, from the Clone Wars into the New Republic era. Exact endpoints and individual episode dates vary.',sources:['tvDates','viewing']}
];
window.HISTOMAP.undatedScreen=[
  {name:'Tales of the Underworld',note:'Cad Bane and Asajj Ventress stories occupy separate periods. The broad chronology is known, but no single reliable continuous span is drawn here.',source:'viewing'},
  {name:'Forces of Destiny',note:'Short stories scattered across several eras. They are not represented as one continuous range.',source:'viewing'},
  {name:'Visions & LEGO stories',note:'Separate storytelling continuities; not plotted as canonical history or silently substituted for Legends.',source:'viewing'}
];
window.HISTOMAP.legends={
 ancient:{name:'Legends · ancient past',range:'c. 25,793–1,000 BBY',start:-25793,end:-1000,height:2400,
  intro:'Expanded Universe versions of the distant past. Canon also names ancient eras and some events; these particular accounts remain Legends and are not missing chapters of Disney canon.',
  anchors:[[-25793,160],[-25792,320],[-25000,430],[-5000,760],[-3996,1010],[-3956,1250],[-3951,1410],[-3643,1640],[-3630,1800],[-2000,2010],[-1000,2260]],
  factions:[{id:'leg-republic',name:'Republic traditions',color:'#baa46e'},{id:'leg-jedi',name:'Je’daii → Jedi',color:'#94b396'},{id:'leg-sith',name:'Sith & rival empires',color:'#aa7394'},{id:'leg-other',name:'Other powers',color:'#708997'}],
  // Qualitative reach at selected narrative moments, not measured historical shares.
  knots:[[-25793,[0,35,15,50]],[-25792,[0,40,10,50]],[-25000,[35,25,0,40]],[-5000,[43,17,24,16]],[-3996,[36,18,32,14]],[-3956,[33,13,38,16]],[-3951,[49,7,20,24]],[-3643,[37,13,36,14]],[-3630,[27,10,45,18]],[-2000,[39,16,30,15]],[-1000,[62,21,2,15]]],
  events:[
   {id:'dawn',year:-25793,title:'Dawn of the Jedi',text:'On Tython, the Je’daii confront the Rakatan threat in the ancient Expanded Universe.',effect:'A distinct Legends account of Force traditions before the familiar Jedi Order.',media:['Dawn of the Jedi · comics','Into the Void · novel'],sources:['dawn','legendsComics']},
   {id:'force-war',year:-25792,title:'The Force War',text:'The Tython conflict reaches its culmination in the Dawn of the Jedi comics.',effect:'The chart follows the Legends tradition into the later Jedi; it does not claim canon’s Jedi origin is identical.',media:['Dawn of the Jedi: Force War'],sources:['legendsComics']},
   {id:'hyperspace',year:-5000,title:'The Great Hyperspace War',text:'Naga Sadow’s Sith Empire attacks the Republic in the Tales of the Jedi account.',effect:'A major collision between an established Republic and an external Sith empire.',media:['Tales of the Jedi · comics'],sources:['hyperspace']},
   {id:'kun',year:-3996,title:'The Great Sith War',text:'Exar Kun and Ulic Qel-Droma’s war reaches its climax, drawing Jedi, Sith, and Mandalorians into a galactic conflict.',effect:'The Sith threat grows through fallen Jedi as well as rival states.',media:['Tales of the Jedi · comics'],sources:['greatSith']},
   {id:'revan',year:-3956,title:'Revan & the Jedi Civil War',text:'The Republic and Jedi struggle against a Sith war machine in Knights of the Old Republic.',effect:'An alternate-continuity story of allegiance, identity, and competing galactic powers.',media:['Knights of the Old Republic · game'],sources:['kotor','legendsGames']},
   {id:'exile',year:-3951,title:'The Jedi Exile',text:'The Sith Lords follows the Jedi Exile through a galaxy where the Jedi have been driven close to extinction.',effect:'The Jedi tradition narrows while the conflict continues through hidden adversaries.',media:['Knights of the Old Republic II · game'],sources:['legendsGames']},
   {id:'old-republic',year:-3643,title:'The Old Republic',text:'A resurgent Sith Empire contests the Republic; later expansions bring additional powers into the struggle.',effect:'The wide Sith/rival-empires band aggregates changing antagonists rather than presenting them as one unchanging state.',media:['The Old Republic · game and expansions'],sources:['swtor','legendsGames']},
   {id:'new-sith',year:-2000,title:'The New Sith Wars',text:'A long sequence of Jedi–Sith conflicts begins in the Legends chronology.',effect:'The timeline compresses a millennium of changing factions and warfare.',media:['Legends histories','Darth Bane background'],sources:['newSith']},
   {id:'bane',year:-1000,title:'Ruusan & Darth Bane',text:'The New Sith Wars end near Ruusan. Bane’s Rule of Two replaces the massed Sith orders in the Legends account.',effect:'A broad Sith presence becomes a hidden lineage. The section stops here and does not splice itself into the canon Republic.',media:['Darth Bane trilogy'],sources:['newSith','legendsBooks']}
  ]},
 future:{name:'Legends · distant future',range:'36–140 ABY',start:36,end:140,height:1900,
  intro:'The later Expanded Universe continues its own post-Endor history. This is not what happens after Exegol: it follows a different timeline, including an earlier Yuuzhan Vong war and a different Skywalker family.',
  anchors:[[36,160],[40,390],[41,580],[43,740],[44,860],[45,1030],[127,1240],[130,1410],[138,1640],[140,1770]],
  factions:[{id:'leg-alliance',name:'Galactic Alliance',color:'#84b7b7'},{id:'leg-new-jedi',name:'New Jedi Order',color:'#a4bb93'},{id:'leg-fel',name:'Imperial / Fel powers',color:'#c28772'},{id:'leg-one-sith',name:'One Sith',color:'#a678a5'}],
  knots:[[36,[54,17,29,0]],[40,[49,15,34,2]],[41,[48,17,33,2]],[43,[49,18,31,2]],[45,[50,18,29,3]],[127,[43,17,32,8]],[130,[16,8,30,46]],[138,[20,12,26,42]],[140,[43,22,31,4]]],
  events:[
   {id:'dark-nest',year:36,title:'The Dark Nest aftermath',text:'The final phase of the Killik conflict reshapes the Jedi’s relationships and leadership.',effect:'This 36 ABY entry continues a Legends crisis that began in 35 ABY; it does not follow the canon sequel trilogy.',media:['Dark Nest trilogy · 35–36 ABY'],sources:['legendsBooks']},
   {id:'jacen',year:40,title:'Legacy of the Force',text:'Jacen Solo’s fall and a new civil war divide the Galactic Alliance and the Skywalker–Solo family.',effect:'A different family history and political order make the continuity break explicit.',media:['Legacy of the Force · 40–41 ABY'],sources:['legendsBooks']},
   {id:'jaina',year:41,title:'The war’s reckoning',text:'The conflict around Darth Caedus reaches its conclusion.',effect:'The end of one Sith ruler does not erase the institutional damage left by the civil war.',media:['Invincible'],sources:['legendsBooks']},
   {id:'fate',year:43,title:'Fate of the Jedi',text:'Luke and Ben Skywalker’s journey intersects with threats to the Jedi and the Galactic Alliance.',effect:'The Jedi remain an institution with a history distinct from Luke’s failed canon academy.',media:['Fate of the Jedi · 43–44 ABY'],sources:['legendsBooks']},
   {id:'crucible',year:45,title:'Crucible',text:'Luke, Han, and Leia face another crisis in the later Legends novel timeline.',effect:'The familiar heroes’ story extends well beyond their different canon trajectories.',media:['Crucible'],sources:['legendsBooks']},
   {id:'cade',year:137,title:'The Legacy era',text:'Cade Skywalker’s era finds an Imperial order contested by the One Sith, surviving Jedi, and other galactic forces.',effect:'This is the comic-book future of Legends, not a forecast of upcoming canon stories.',media:['Star Wars: Legacy · comics'],sources:['legacyComic','legendsComics']},
   {id:'legacy-end',year:138,title:'A new galactic balance',text:'Later Legacy stories follow the continuing struggle after Darth Krayt’s reign.',effect:'The chart extends toward 140 ABY as a schematic of the later comic era, without inventing detailed history for the intervening decades.',media:['Legacy · later comics'],sources:['legacy','legendsComics']}
  ]}
};
