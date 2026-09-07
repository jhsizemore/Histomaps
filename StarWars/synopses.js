/* Concise editorial leads for every inspector record. These are intentionally stored
   with the atlas data rather than fetched at runtime, so panels remain fast, stable,
   and reviewable even when third-party reference sites are unavailable. */
(() => {
  'use strict';
  const D=window.HISTOMAP;

  function sentences(text){
    return String(text||'').match(/[^.!?]+(?:[.!?]+|$)/g)?.map(s=>s.trim()).filter(Boolean)||[];
  }
  function lead(text,fallback){
    const parts=sentences(text).slice(0,3);
    if(parts.length<2&&fallback)parts.push(fallback);
    return parts.slice(0,3).join(' ');
  }

  D.factions.forEach(f=>{
    const kind=['jedi','sith'].includes(f.id)?'Force tradition':'galactic power';
    f.synopsis=lead(f.text,`The atlas follows this ${kind} across changing eras rather than treating it as a fixed quantity.`);
  });

  D.events.forEach(e=>{
    const faction=D.factions.find(f=>f.id===e.faction);
    e.synopsis=lead(e.text,`In the atlas, this is a turning point in the history of ${faction?.name||'the surrounding powers'}.`);
  });

  const screen={
    'young-jedi':'During the High Republic, Jedi younglings Kai Brightstar, Lys Solay, and Nubs train on Tenoo while helping people across the galaxy. The series presents the Jedi at their most public-facing and optimistic, long before the political crises of the prequel era.',
    'acolyte-tv':'A series of crimes draws Jedi into an investigation involving former Padawan Osha Aniseya, her twin Mae, and a hidden dark-side threat. Set about a century before the prequel films, the story explores fractures inside the Jedi Order while the Sith remain largely concealed.',
    'ep1':'A Trade Federation blockade of Naboo pulls Qui-Gon Jinn and Obi-Wan Kenobi into a crisis that introduces the young Anakin Skywalker. Their victory exposes the return of the Sith even as Palpatine advances within the Republic.',
    'ep2':'An assassination attempt on Senator Padmé Amidala leads Obi-Wan Kenobi to the secret clone army while Anakin Skywalker grows closer to Padmé. The confrontation on Geonosis ignites the Clone Wars and gives Palpatine new emergency powers.',
    'clone-film':'Early in the Clone Wars, Anakin Skywalker and his new Padawan Ahsoka Tano are sent to rescue Jabba the Hutt’s kidnapped son. The mission establishes their partnership and introduces the wartime status quo developed by the animated series.',
    'clone-tv':'Across the Clone Wars, Jedi, clone troopers, senators, and civilians confront a conflict engineered by Darth Sidious. The anthology deepens Ahsoka Tano’s story, the individuality of the clones, and the political and moral collapse that leads toward Revenge of the Sith.',
    'ep3':'Palpatine reveals himself as Darth Sidious and turns Anakin Skywalker against the Jedi as the Clone Wars reach their end. Order 66 destroys the Jedi Order, the Republic becomes the Galactic Empire, and Anakin becomes Darth Vader.',
    'bad-batch':'Clone Force 99 survives Order 66 and tries to find a place in a galaxy being rapidly reshaped by the Empire. Their journey with Omega follows the replacement of the clone army, Imperial experimentation, and the tightening machinery of authoritarian rule.',
    'maul-tv':'After the Clone Wars, Maul plots to rebuild his criminal syndicate on the planet Janix, outside the Empire’s immediate control. His plans intersect with a disillusioned young Jedi Padawan as he searches for power, an apprentice, and revenge.',
    'solo-film':'A young Han Solo escapes Corellia, meets Chewbacca, and enters the criminal underworld through a dangerous train of betrayals and heists. Along the way he encounters Lando Calrissian and acquires the Millennium Falcon, shaping the smuggler seen in the original trilogy.',
    'obi-wan':'Years after the Jedi purge, Obi-Wan Kenobi is drawn out of hiding when young Leia Organa is kidnapped. The rescue forces him to confront Imperial Inquisitors, his own trauma, and the terrifying reality that Anakin Skywalker survived as Darth Vader.',
    'andor-tv':'Cassian Andor evolves from a self-interested survivor into a committed revolutionary as scattered resistance begins to cohere against the Empire. Parallel stories inside the ISB, the Senate, prisons, and rebel networks show the human cost and organizational difficulty of building the Rebellion.',
    'rebels-tv':'The crew of the Ghost begins as a local resistance cell and gradually becomes part of the wider Rebel Alliance. Ezra Bridger, Kanan Jarrus, Hera Syndulla, Sabine Wren, and their allies fight Imperial rule while confronting the survival and transformation of Jedi traditions.',
    'rogue-one':'A small rebel team led by Jyn Erso and Cassian Andor undertakes a desperate mission to steal the plans for the Death Star. Their sacrifice delivers the weapon’s vulnerability to the Rebel Alliance and leads directly into A New Hope.',
    'ep4':'Luke Skywalker leaves Tatooine and joins Leia Organa, Han Solo, Obi-Wan Kenobi, and the Rebel Alliance against the Galactic Empire. The Rebels destroy the first Death Star at Yavin, creating the zero point used by the atlas’s BBY/ABY chronology.',
    'ep5':'The Empire drives the Rebel Alliance from Hoth while Luke Skywalker trains with Yoda and Han Solo’s group flees Darth Vader. The pursuit culminates at Cloud City, where Vader reveals his connection to Luke and the heroes suffer a major defeat.',
    'ep6':'The Rebels rescue Han Solo and launch a final assault on the second Death Star while Luke Skywalker confronts Darth Vader and Emperor Palpatine. Vader turns against Sidious, the Emperor falls, and the Imperial center is shattered at Endor.',
    'mando-tv':'Bounty hunter Din Djarin becomes protector and adoptive father to Grogu, a Force-sensitive child pursued by Imperial remnants. Their travels connect the lawless postwar frontier to Mandalorian identity, the fledgling New Republic, and the persistence of Imperial power.',
    'boba-tv':'Boba Fett returns to Tatooine and attempts to rule the territory once controlled by Jabba the Hutt through a different kind of criminal authority. Flashbacks trace his survival and transformation among the Tusken Raiders while the present-day story reconnects with Din Djarin and Grogu.',
    'ahsoka-tv':'Ahsoka Tano and Sabine Wren pursue a threat tied to Grand Admiral Thrawn and the missing Ezra Bridger. Their search expands the New Republic story beyond the familiar galaxy and continues unresolved relationships from Rebels.',
    'skeleton-tv':'Four children from the sheltered world of At Attin become lost in the wider galaxy and struggle to find their way home. Their journey with the mysterious Jod Na Nawood turns a coming-of-age adventure into an encounter with pirates, hidden history, and the dangers beyond their protected society.',
    'mando-film':'With the Empire fallen but warlords still active, the New Republic recruits Din Djarin and his apprentice Grogu for a new mission. The film continues their partnership as the young government tries to secure the gains of the Rebellion in a galaxy where Imperial power has not fully disappeared.',
    'resistance-tv':'Young pilot Kazuda Xiono joins the Resistance as a spy on the Colossus platform shortly before the sequel trilogy. The series follows ordinary people through the First Order’s rise and continues beyond the destruction of Hosnian Prime and the events of The Force Awakens.',
    'ep7':'Decades after Endor, the First Order rises from the Imperial legacy while the Resistance searches for the missing Luke Skywalker. Rey, Finn, Han Solo, and their allies destroy Starkiller Base, but the New Republic’s capital system is annihilated in the attack.',
    'ep8':'The Resistance fights for survival immediately after The Force Awakens while Rey seeks Luke Skywalker’s help on Ahch-To. Kylo Ren consolidates control of the First Order as Luke’s final intervention allows the remaining Resistance to escape and endure.',
    'ep9':'The return of Emperor Palpatine draws Rey, Finn, Poe Dameron, and the Resistance into a final confrontation with the Sith Eternal on Exegol. A vast civilian fleet joins the battle, Ben Solo returns to the light, and Palpatine is defeated.',
    'tales-jedi':'This anthology tells separate stories centered on Ahsoka Tano and Count Dooku across widely separated moments in their lives. Together the episodes contrast Ahsoka’s growth with Dooku’s disillusionment and fall, rather than forming one continuous narrative.',
    'tales-empire':'This anthology follows Morgan Elsbeth and Barriss Offee through different moments spanning the Clone Wars, Imperial era, and New Republic period. Their paired arcs explore survival, compromise, and changing relationships to Imperial power across discontinuous episodes.'
  };
  D.screen.forEach(m=>{m.synopsis=screen[m.id]||lead(m.note,'This screen story is placed here according to its principal canon story window.');});

  const lives={
    anakin:'Anakin Skywalker rises from an enslaved child on Tatooine to a celebrated Jedi Knight and Clone Wars general before fear and manipulation drive him to the dark side. As Darth Vader he becomes one of the Empire’s chief enforcers, then ultimately turns against Emperor Palpatine to save Luke.',
    padme:'Padmé Amidala serves Naboo first as queen and later as senator, becoming a prominent advocate for diplomacy and constitutional government during the Republic’s decline. Her secret marriage to Anakin Skywalker ties her personal story to the political collapse that creates the Empire and to the birth of Luke and Leia.',
    'luke-life':'Luke Skywalker grows from a farm boy on Tatooine into a Rebel hero and Jedi who helps defeat the Empire and redeem Darth Vader. Decades later, the failure of his attempted Jedi revival drives him into exile before he returns to protect the Resistance and inspire the galaxy.',
    leia:'Leia Organa is an Alderaanian princess, senator, Rebel leader, and later general whose political life spans the struggle against both the Empire and the First Order. A child of Anakin Skywalker raised by Bail and Breha Organa, she combines diplomacy, military leadership, and a latent connection to the Force.',
    ben:'Ben Solo, the son of Leia Organa and Han Solo, trains with Luke Skywalker before falling under Snoke’s influence and becoming Kylo Ren. As leader of the Knights of Ren and later Supreme Leader of the First Order, he is eventually drawn back to the light through his bonds with his family and Rey.',
    'rey-life':'Rey begins as a scavenger on Jakku and is drawn into the Resistance while discovering an extraordinary connection to the Force. She confronts her connection to Palpatine, helps defeat the Sith Eternal, and ultimately claims the Skywalker name as an expression of chosen family and identity.',
    yoda:'Yoda is one of the Jedi Order’s longest-serving and most influential Masters, teaching generations of Jedi and leading the Order during the Clone Wars. After the fall of the Republic he lives in exile on Dagobah, where he later trains Luke Skywalker and helps carry the Jedi tradition into a new era.',
    'qui-gon':'Qui-Gon Jinn is an independent-minded Jedi Master whose trust in the Living Force often puts him at odds with the Jedi Council. His discovery of Anakin Skywalker and belief that the boy is the Chosen One profoundly shape the fate of the Jedi, the Sith, and the Republic.',
    kenobi:'Obi-Wan Kenobi serves as a Jedi Knight and Master through the Clone Wars, training Anakin Skywalker and fighting at the center of the Republic’s final crises. After Anakin’s fall and the Jedi purge, he protects Luke from afar on Tatooine before re-entering the struggle against the Empire.',
    ahsoka:'Ahsoka Tano begins as Anakin Skywalker’s Padawan during the Clone Wars but leaves the Jedi Order after losing faith in its institutions. She survives the purge, aids the early Rebellion, and later continues an independent Force tradition while confronting the legacies of Anakin, Thrawn, and the fallen Order.',
    grogu:'Grogu is a Force-sensitive child who survived the destruction of the Jedi Order and spent decades hidden before meeting the Mandalorian Din Djarin. Their bond becomes a found-family relationship, and Grogu ultimately chooses life with Din while continuing to develop both Mandalorian and Force-related skills.',
    han:'Han Solo begins as a Corellian smuggler and reluctant mercenary whose partnership with Chewbacca brings him into the Rebel cause. He becomes a general and central figure in the defeat of the Empire, later returning to a more itinerant life before the First Order crisis draws him back to his family and old allies.',
    chewie:'Chewbacca is a Wookiee warrior, mechanic, and pilot whose long life spans the final centuries of the Republic through the wars against the First Order. Closely bonded with Han Solo and the wider Rebel family, he serves aboard the Millennium Falcon through several generations of galactic conflict.',
    lando:'Lando Calrissian is a gambler, entrepreneur, and former owner of the Millennium Falcon who becomes administrator of Cloud City before joining the Rebel Alliance. His talent for improvisation and leadership culminates in commanding the fighter assault on the second Death Star and later rallying allies against the Sith Eternal.',
    finn:'Finn is raised from childhood as a First Order stormtrooper but rejects the regime during his first combat deployment and escapes with Poe Dameron. His friendship with Rey and growing commitment to the Resistance transform him into a leader who helps inspire other former stormtroopers to rebel.',
    poe:'Poe Dameron is a gifted pilot and Resistance officer raised in a family shaped by the Rebel victory over the Empire. His arc moves from daring individual action toward broader command responsibility as he helps lead the Resistance through the war with the First Order.'
  };
  D.lifelines.forEach(p=>{
    p.synopsis=p.synopsis||lives[p.id]||lead(p.note,`The atlas follows ${p.name} across the political changes surrounding them.`);
  });

  Object.values(D.legends).forEach(L=>{
    L.synopsis=lead(L.intro,'This section is deliberately kept separate from the current canon chronology.');
    L.events.forEach(e=>{
      e.synopsis=lead(e.text,'In this Legends section, the event marks a major shift among the powers represented on the map.');
    });
    L.factions.forEach(f=>{
      f.synopsis=`This stream represents ${f.name} across ${L.name.replace('Legends · ','the Legends ')} section. It groups changing institutions, traditions, or rival forces for cartographic clarity rather than treating them as one permanent organization.`;
    });
  });
})();
