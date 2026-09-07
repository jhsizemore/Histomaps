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

  D.lifelines.forEach(p=>{
    p.synopsis=lead(p.note,`The atlas follows ${p.name} as one physical life across the political changes surrounding them.`);
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
