/* Expanded recurring-character tracks.
   These records qualify by appearing in at least three dated screen properties already
   mapped by the Histomap. When a canon birth/death year is not carried here, the track
   begins at the first mapped screen appearance and ends at the last mapped screen
   appearance; the UI labels those endpoints explicitly rather than inventing a lifespan. */
(() => {
  'use strict';
  const D=window.HISTOMAP;
  const screen=Object.fromEntries((D.screen||[]).map(s=>[s.id,s]));
  const palette={
    skywalker:'#d4bf8b','jedi-council':'#91c7ad','jedi-allies':'#8dbbd0','dark-side':'#bd899d',clones:'#8fb8d7',
    republic:'#d6bc78',separatists:'#b88b85','rebellion-leaders':'#83bda5','rebellion-heroes':'#7eafd0',empire:'#c38a88',
    mandalorians:'#a99acb',underworld:'#c29c78','new-republic':'#74bcbc',resistance:'#9db8df','first-order':'#bd91a5',droids:'#bfc4a1'
  };
  D.lifeGroups=[
    ['skywalker','Skywalker family'],
    ['jedi-council','Jedi Council'],
    ['jedi-allies','Jedi & Force allies'],
    ['dark-side','Sith & dark side'],
    ['clones','Clone troopers'],
    ['republic','Republic'],
    ['separatists','Separatists'],
    ['rebellion-leaders','Rebellion · leaders'],
    ['rebellion-heroes','Rebellion · field heroes'],
    ['empire','Empire'],
    ['mandalorians','Mandalorians'],
    ['underworld','Underworld'],
    ['new-republic','New Republic era'],
    ['resistance','Resistance'],
    ['first-order','First Order'],
    ['droids','Droids']
  ];

  // [id, name, short label, mapped screen property ids, filter groups, Wookieepedia page, one-sentence lead]
  const rows=[
    ['r2d2','R2-D2','R2-D2',['ep1','ep2','clone-film','clone-tv','ep3','rogue-one','ep4','ep5','ep6','mando-tv','boba-tv','ep7','ep8','ep9'],['droids','rebellion-heroes','resistance'],'R2-D2','Astromech droid who repeatedly carries plans, messages, and vital information between generations of heroes.'],
    ['c3po','C-3PO','C-3PO',['ep1','ep2','clone-tv','ep3','rebels-tv','rogue-one','ep4','ep5','ep6','ep7','ep8','ep9'],['droids','rebellion-heroes','resistance'],'C-3PO','Protocol droid built by Anakin Skywalker who survives regime changes while serving the Skywalker family and their allies.'],
    ['palpatine','Sheev Palpatine / Darth Sidious','Palpatine',['ep1','ep2','clone-tv','ep3','rebels-tv','ep5','ep6','ep9','tales-jedi'],['dark-side','empire','first-order'],'Darth_Sidious','Sith Lord who engineers the fall of the Republic, rules as Emperor, and later returns behind the Final Order.'],
    ['maul','Maul','Maul',['ep1','clone-tv','solo-film','rebels-tv','maul-tv'],['dark-side','underworld'],'Maul','Former Sith apprentice whose survival turns him into an underworld power broker and persistent rival to Obi-Wan Kenobi.'],
    ['mace','Mace Windu','Mace',['ep1','ep2','clone-film','clone-tv','ep3','tales-jedi'],['jedi-council','republic'],'Mace_Windu','Senior Jedi Master and Council member whose military leadership during the Clone Wars places him at the center of the Republic’s final crisis.'],
    ['dooku','Count Dooku / Darth Tyranus','Dooku',['ep2','clone-film','clone-tv','ep3','tales-jedi'],['dark-side','separatists','jedi-allies'],'Dooku','Former Jedi who becomes Darth Sidious’s apprentice and the public political leader of the Confederacy of Independent Systems.'],
    ['boba','Boba Fett','Boba Fett',['ep2','clone-tv','ep5','ep6','mando-tv','boba-tv'],['underworld','mandalorians'],'Boba_Fett','Clone of Jango Fett who becomes one of the galaxy’s most feared bounty hunters and later takes control of Jabba’s former territory.'],
    ['bail','Bail Organa','Bail',['ep2','clone-tv','ep3','obi-wan','rebels-tv','rogue-one'],['republic','rebellion-leaders'],'Bail_Organa','Alderaanian senator who opposes authoritarian rule, helps found the Rebellion, and raises Leia as his daughter.'],
    ['tarkin','Wilhuff Tarkin','Tarkin',['clone-tv','ep3','bad-batch','rebels-tv','rogue-one','ep4'],['empire','republic'],'Wilhuff_Tarkin','Republic officer turned Imperial Grand Moff whose career charts the militarization of the state and the rise of the Death Star.'],
    ['mon','Mon Mothma','Mon Mothma',['clone-tv','andor-tv','rebels-tv','rogue-one','ep6','ahsoka-tv'],['republic','rebellion-leaders','new-republic'],'Mon_Mothma','Senator who becomes a principal architect of the Rebel Alliance and later serves as the first chancellor of the restored New Republic.'],
    ['saw','Saw Gerrera','Saw',['clone-tv','bad-batch','andor-tv','rebels-tv','rogue-one'],['rebellion-leaders'],'Saw_Gerrera','Onderonian resistance fighter whose uncompromising insurgency places him both inside and at the edge of the wider Rebel movement.'],
    ['jabba','Jabba Desilijic Tiure','Jabba',['ep1','clone-film','clone-tv','ep4','ep6'],['underworld'],'Jabba_Desilijic_Tiure','Hutt crime lord whose syndicate power connects the Republic-era underworld to the Galactic Civil War.'],
    ['wedge','Wedge Antilles','Wedge',['rebels-tv','ep4','ep5','ep6','ep9'],['rebellion-heroes','resistance'],'Wedge_Antilles','Rebel starfighter pilot who survives both Death Star battles and remains part of the galaxy’s resistance tradition decades later.'],
    ['ackbar','Gial Ackbar','Ackbar',['clone-tv','ep6','ep7','ep8'],['rebellion-leaders','resistance'],'Gial_Ackbar','Mon Calamari commander who fights first for his homeworld, then the Rebel Alliance, and later the Resistance.'],
    ['nien','Nien Nunb','Nien Nunb',['ep6','ep7','ep8','ep9'],['rebellion-heroes','resistance'],'Nien_Nunb','Sullustan pilot who helps destroy the second Death Star and later returns to fly for the Resistance.'],
    ['bb8','BB-8','BB-8',['resistance-tv','ep7','ep8','ep9'],['droids','resistance'],'BB-8','Resistance astromech whose mission carrying the map to Luke Skywalker pulls him into the center of the sequel-era conflict.'],
    ['hux','Armitage Hux','Hux',['resistance-tv','ep7','ep8','ep9'],['first-order'],'Armitage_Hux','First Order general whose rivalry with Kylo Ren and eventual betrayal expose fractures within the regime’s leadership.'],
    ['maz','Maz Kanata','Maz',['ep7','ep8','ep9'],['resistance','underworld'],'Maz_Kanata','Ancient pirate and castle keeper whose connections to smugglers, rebels, and Jedi artifacts bridge several generations of galactic conflict.'],
    ['owen','Owen Lars','Owen',['ep2','ep3','obi-wan','ep4'],['skywalker'],'Owen_Lars','Tatooine moisture farmer who raises Luke Skywalker and tries to keep him insulated from the dangers surrounding his family history.'],
    ['beru','Beru Whitesun Lars','Beru',['ep2','ep3','obi-wan','ep4'],['skywalker'],'Beru_Whitesun_Lars','Luke Skywalker’s aunt and adoptive mother, whose quiet life on Tatooine masks a deliberate commitment to protecting him.'],

    ['kiadi','Ki-Adi-Mundi','Ki-Adi',['ep1','ep2','clone-film','clone-tv','ep3'],['jedi-council'],'Ki-Adi-Mundi','Cerean Jedi Master and Council member who serves as a general throughout the Clone Wars.'],
    ['plokoon','Plo Koon','Plo Koon',['ep1','ep2','clone-film','clone-tv','ep3','tales-jedi'],['jedi-council'],'Plo_Koon','Kel Dor Jedi Master known for his close bond with clone forces and his mentorship of younger Jedi including Ahsoka Tano.'],
    ['kitfisto','Kit Fisto','Kit Fisto',['ep2','clone-film','clone-tv','ep3'],['jedi-council'],'Kit_Fisto','Nautolan Jedi Master and Council member who fights across major Clone Wars campaigns before confronting Darth Sidious.'],
    ['shaakti','Shaak Ti','Shaak Ti',['ep2','clone-tv','ep3'],['jedi-council'],'Shaak_Ti','Togruta Jedi Master who helps oversee the clone army and serves on the Jedi Council during the Republic’s final years.'],
    ['aayla','Aayla Secura','Aayla',['ep2','clone-tv','ep3'],['jedi-council'],'Aayla_Secura','Twi’lek Jedi Master and Clone Wars general whose service ends during Order 66.'],
    ['luminara','Luminara Unduli','Luminara',['ep2','clone-tv','ep3','rebels-tv'],['jedi-allies'],'Luminara_Unduli','Mirialan Jedi Master who commands Republic forces and whose death is later exploited by the Empire as a trap.'],
    ['barriss','Barriss Offee','Barriss',['ep2','clone-tv','tales-empire'],['jedi-allies','empire'],'Barriss_Offee','Mirialan Jedi who becomes disillusioned during the Clone Wars and later re-emerges in the Imperial era on a very different path.'],
    ['adigallia','Adi Gallia','Adi Gallia',['ep1','ep2','clone-tv'],['jedi-council'],'Adi_Gallia','Tholothian Jedi Council member who serves as a Republic general during the Clone Wars.'],
    ['saesee','Saesee Tiin','Saesee',['ep1','ep2','clone-tv','ep3'],['jedi-council'],'Saesee_Tiin','Iktotchi Jedi Master and Council member who fights through the Clone Wars and joins the attempt to arrest Darth Sidious.'],
    ['agen','Agen Kolar','Agen Kolar',['ep2','clone-tv','ep3'],['jedi-council'],'Agen_Kolar','Zabrak Jedi Master and Council member who serves during the Clone Wars and joins Mace Windu’s final confrontation with Palpatine.'],
    ['jocasta','Jocasta Nu','Jocasta Nu',['ep2','clone-tv','tales-jedi'],['jedi-allies'],'Jocasta_Nu','Chief librarian of the Jedi Archives whose work preserves the Order’s institutional memory during the Republic’s decline.'],
    ['jarjar','Jar Jar Binks','Jar Jar',['ep1','ep2','clone-tv'],['republic'],'Jar_Jar_Binks','Gungan representative whose political career places him unexpectedly close to several pivotal decisions of the late Republic.'],
    ['nutegunray','Nute Gunray','Nute Gunray',['ep1','ep2','clone-tv','ep3'],['separatists'],'Nute_Gunray','Trade Federation viceroy whose repeated alliance with Darth Sidious helps turn commercial power into separatist war.'],
    ['wattambor','Wat Tambor','Wat Tambor',['ep2','clone-tv','ep3'],['separatists'],'Wat_Tambor','Techno Union foreman and Separatist Council member whose industrial resources support the Confederacy’s war effort.'],
    ['runehaako','Rune Haako','Rune Haako',['ep1','ep2','ep3'],['separatists'],'Rune_Haako','Trade Federation official who remains alongside Nute Gunray from the Naboo crisis through the end of the Separatist leadership.'],
    ['poggle','Poggle the Lesser','Poggle',['ep2','clone-tv','ep3'],['separatists'],'Poggle_the_Lesser','Geonosian archduke whose foundries and allegiance help launch the Clone Wars and the Death Star project.'],
    ['masamedda','Mas Amedda','Mas Amedda',['ep1','ep2','clone-tv','ep3','bad-batch'],['republic','empire'],'Mas_Amedda','Senior Republic official who remains at Palpatine’s side through the transition from chancellorship to Empire.'],
    ['ornfreetaa','Orn Free Taa','Orn Free Taa',['ep2','clone-tv','bad-batch'],['republic'],'Orn_Free_Taa','Twi’lek senator whose long political career spans both the Republic and the difficult first phase of Imperial rule.'],
    ['grievous','General Grievous','Grievous',['clone-film','clone-tv','ep3'],['separatists'],'Grievous','Cyborg Separatist general whose campaigns make him the most visible military face of the Confederacy late in the Clone Wars.'],
    ['grandinq','Grand Inquisitor','Grand Inquisitor',['obi-wan','rebels-tv','tales-empire'],['dark-side','empire'],'The_Grand_Inquisitor','Former Jedi Temple Guard who becomes the Empire’s senior Inquisitor and hunts surviving Jedi and Force-sensitive fugitives.'],
    ['dengar','Dengar','Dengar',['clone-tv','ep5','ep6'],['underworld'],'Dengar','Corellian bounty hunter whose career stretches from the Clone Wars into the criminal networks surrounding the Galactic Civil War.'],
    ['bibfortuna','Bib Fortuna','Bib Fortuna',['ep1','ep6','mando-tv'],['underworld'],'Bib_Fortuna','Twi’lek majordomo who serves Jabba the Hutt and later occupies his former palace before Boba Fett’s takeover.'],
    ['depa','Depa Billaba','Depa Billaba',['ep1','ep2','bad-batch'],['jedi-council'],'Depa_Billaba','Jedi Council member and master of Caleb Dume whose final stand during Order 66 shapes the future Kanan Jarrus.'],
    ['evenpiell','Even Piell','Even Piell',['ep1','ep2','clone-tv'],['jedi-council'],'Even_Piell','Lannik Jedi Master and Council member whose Clone Wars service culminates in a dangerous Citadel rescue mission.'],
    ['eethkoth','Eeth Koth','Eeth Koth',['ep1','ep2','clone-tv'],['jedi-council'],'Eeth_Koth','Zabrak Jedi Master who serves on the Council and survives a high-profile capture during the Clone Wars.'],
    ['bossk','Bossk','Bossk',['clone-tv','ep5','ep6'],['underworld'],'Bossk','Trandoshan bounty hunter whose long career repeatedly intersects with other hunters and the criminal underworld.'],
    ['r4p17','R4-P17','R4-P17',['ep2','clone-film','clone-tv','ep3'],['droids','jedi-allies'],'R4-P17','Astromech droid assigned to Obi-Wan Kenobi during the Clone Wars and several major Republic operations.'],
    ['typho','Gregar Typho','Typho',['ep2','clone-tv','ep3'],['republic'],'Gregar_Typho','Naboo security officer who protects Senator Padmé Amidala through the years leading into the Clone Wars.'],
    ['shmi','Shmi Skywalker Lars','Shmi',['ep1','ep2','clone-tv'],['skywalker'],'Shmi_Skywalker_Lars','Anakin Skywalker’s mother, whose life and death on Tatooine remain a defining emotional force in his fall.'],
    ['siobibble','Sio Bibble','Sio Bibble',['ep1','ep2','clone-tv'],['republic'],'Sio_Bibble','Naboo governor who serves Queen Amidala and remains part of the planet’s political establishment after the invasion.'],
    ['oppo','Oppo Rancisis','Oppo Rancisis',['ep1','ep2','clone-tv'],['jedi-council'],'Oppo_Rancisis','Thisspiasian Jedi Master and long-serving Council member active during the final decades of the Republic.'],
    ['lamasu','Lama Su','Lama Su',['ep2','clone-tv','bad-batch'],['republic'],'Lama_Su','Kaminoan prime minister who oversees the Republic’s clone army and later confronts the Empire’s changing plans for Kamino.'],
    ['taunwe','Taun We','Taun We',['ep2','clone-tv','bad-batch'],['republic'],'Taun_We','Kaminoan aide involved in the creation and administration of the clone army from its discovery through the early Empire.'],
    ['passel','Passel Argente','Passel Argente',['ep1','ep2','ep3'],['separatists'],'Passel_Argente','Corporate Alliance magistrate and Separatist Council member who helps finance and organize the Confederacy.'],
    ['ponudo','Po Nudo','Po Nudo',['ep1','ep2','ep3'],['separatists'],'Po_Nudo','Aqualish senator and Separatist Council member whose allegiance places him among the Confederacy’s political leadership.'],
    ['onaconda','Onaconda Farr','Onaconda Farr',['ep1','ep2','clone-tv'],['republic'],'Onaconda_Farr','Rodian senator whose career illustrates the pressures and compromises facing the Republic during the Clone Wars.'],

    ['bokatan','Bo-Katan Kryze','Bo-Katan',['clone-tv','rebels-tv','mando-tv','mando-film'],['mandalorians','new-republic'],'Bo-Katan_Kryze','Mandalorian warrior and leader whose long struggle over Mandalore stretches from the Clone Wars into the New Republic era.'],
    ['rex','Rex','Rex',['clone-film','clone-tv','bad-batch','rebels-tv','ahsoka-tv'],['clones','rebellion-heroes'],'Rex','Clone captain of the 501st who survives Order 66, resists Imperial control, and later fights with the Rebel Alliance.'],
    ['cody','Cody','Cody',['ep3','clone-film','clone-tv','bad-batch'],['clones','empire'],'Cody','Clone commander closely associated with Obi-Wan Kenobi whose service spans the height of the Clone Wars and the transition to Empire.'],
    ['gregor','Gregor','Gregor',['clone-tv','bad-batch','rebels-tv'],['clones','rebellion-heroes'],'Gregor','Clone commando who survives extraordinary wartime losses and later joins fellow veteran clones against the Empire.'],
    ['wolffe','Wolffe','Wolffe',['clone-tv','bad-batch','rebels-tv'],['clones','rebellion-heroes'],'Wolffe','Clone commander who serves Plo Koon before surviving into the Imperial era and eventually aiding the Rebellion.'],
    ['cham','Cham Syndulla','Cham Syndulla',['clone-tv','bad-batch','rebels-tv'],['republic','rebellion-leaders'],'Cham_Syndulla','Twi’lek resistance leader whose struggle for Ryloth continues from the Clone Wars into opposition to the Empire.'],
    ['gobi','Gobi Glie','Gobi Glie',['clone-tv','bad-batch','rebels-tv'],['rebellion-heroes'],'Gobi_Glie','Twi’lek freedom fighter and ally of Cham Syndulla whose resistance activity spans Republic, Imperial, and Rebel eras.'],
    ['hera','Hera Syndulla','Hera',['bad-batch','rebels-tv','ahsoka-tv'],['rebellion-leaders','new-republic'],'Hera_Syndulla','Pilot and Rebel leader who grows from a child on occupied Ryloth into one of the Alliance’s most important field commanders.'],
    ['chopper','C1-10P “Chopper”','Chopper',['bad-batch','rebels-tv','rogue-one','ahsoka-tv'],['droids','rebellion-heroes','new-republic'],'C1-10P','Astromech droid whose abrasive personality hides decades of service to Hera Syndulla, the Rebellion, and the New Republic.'],
    ['fennec','Fennec Shand','Fennec',['bad-batch','mando-tv','boba-tv'],['underworld','new-republic'],'Fennec_Shand','Elite assassin and mercenary who survives a near-fatal encounter with Din Djarin and becomes Boba Fett’s closest lieutenant.'],
    ['cadbane','Cad Bane','Cad Bane',['clone-tv','bad-batch','boba-tv'],['underworld'],'Cad_Bane','Duros bounty hunter whose reputation survives from the Clone Wars into the criminal struggles of the New Republic era.'],
    ['din','Din Djarin','Din Djarin',['mando-tv','boba-tv','mando-film'],['mandalorians','new-republic'],'Din_Djarin','Mandalorian bounty hunter whose protection of Grogu draws him into wider conflicts over Mandalore and the New Republic frontier.'],
    ['carson','Carson Teva','Carson Teva',['mando-tv','boba-tv','ahsoka-tv'],['new-republic'],'Carson_Teva','New Republic ranger whose patrol work repeatedly exposes threats that the young government is slow to recognize.'],
    ['zeb','Garazeb Orrelios','Zeb',['rebels-tv','mando-tv','mando-film'],['rebellion-heroes','new-republic'],'Garazeb_Orrelios','Lasat warrior who becomes a core member of the Ghost crew and survives into the New Republic period.'],
    ['huyang','Huyang','Huyang',['young-jedi','clone-tv','ahsoka-tv'],['jedi-allies','new-republic','droids'],'Huyang','Ancient droid professor who has instructed generations of Jedi and later accompanies Ahsoka Tano beyond the fall of the Order.',{start:-232,end:9,note:'Huyang’s Young Jedi Adventures appearance is dated to 232 BBY.'}],
    ['morgan','Morgan Elsbeth','Morgan Elsbeth',['mando-tv','ahsoka-tv','tales-empire'],['empire','new-republic'],'Morgan_Elsbeth','Nightsister survivor and Imperial-aligned industrialist whose search for Grand Admiral Thrawn drives key New Republic-era events.'],
    ['thrawn','Mitth’raw’nuruodo “Thrawn”','Thrawn',['rebels-tv','tales-empire','ahsoka-tv'],['empire','new-republic'],'Mitthrawnuruodo','Chiss Imperial grand admiral whose strategic brilliance makes him a major threat first to the Rebellion and later the New Republic.',{start:-9,end:9,note:'His Tales of the Empire appearance falls between 9 BBY and 2 BBY; the line therefore starts at the earliest edge of that documented window.'}],
    ['yularen','Wullf Yularen','Yularen',['clone-tv','andor-tv','rebels-tv','ep4'],['republic','empire'],'Wullf_Yularen','Republic admiral turned Imperial Security Bureau colonel whose career traces institutional continuity between the two regimes.'],
    ['dodonna','Jan Dodonna','Dodonna',['rebels-tv','rogue-one','ep4'],['rebellion-leaders'],'Jan_Dodonna','Veteran commander who becomes one of the Rebel Alliance’s senior military leaders and directs the assault on the first Death Star.'],

    ['connix','Kaydel Ko Connix','Connix',['ep7','ep8','ep9'],['resistance'],'Kaydel_Ko_Connix','Resistance officer who serves Leia Organa’s command through the escalating First Order war and the final campaign against the Sith Eternal.'],
    ['phasma','Phasma','Phasma',['resistance-tv','ep7','ep8'],['first-order'],'Phasma','First Order stormtrooper captain whose polished image embodies the regime’s militarized discipline and internal brutality.'],
    ['marrok','Marrok','Marrok',['maul-tv','tales-empire','ahsoka-tv'],['dark-side','empire','new-republic'],'Marrok','Inquisitorial warrior whose appearances connect the post-Order 66 hunt for Jedi to Morgan Elsbeth’s New Republic-era campaign.']
  ];

  const existing=new Set(D.lifelines.map(p=>p.id));
  rows.forEach(([id,name,short,appearances,groups,wiki,lead,range])=>{
    if(existing.has(id))throw new Error(`Duplicate lifeline id: ${id}`);
    if(appearances.length<3)throw new Error(`${name} has fewer than three mapped properties`);
    const media=appearances.map(key=>{
      if(!screen[key])throw new Error(`${name}: unknown screen property ${key}`);
      return screen[key];
    });
    const start=range?.start??Math.min(...media.map(m=>m.start)),end=range?.end??Math.max(...media.map(m=>m.end));
    const first=media.reduce((a,b)=>a.start<=b.start?a:b),last=media.reduce((a,b)=>a.end>=b.end?a:b);
    const url='https://starwars.fandom.com/wiki/'+encodeURIComponent(wiki).replace(/%20/g,'_');
    D.sources['life-'+id]=[name+' · canon reference (Wookieepedia)',url];
    D.lifelines.push({
      id,name,short,start,end,startKind:'appearance',endKind:'known',startApprox:true,endApprox:true,
      color:palette[groups[0]]||'#a9bcc4',groups,appearances,sources:['life-'+id],
      synopsis:`${lead} On this atlas, the character recurs across ${appearances.length} mapped screen properties, from ${first.name} through ${last.name}.`,
      note:'This expanded track begins at the first dated screen appearance included in this atlas, not at the character’s birth. Its open endpoint marks the last dated mapped screen appearance, not an asserted death or final canonical appearance.'+(range?.note?' '+range.note:'')
    });
    existing.add(id);
  });

  D.recurringLifelineCount=rows.length;
})();
