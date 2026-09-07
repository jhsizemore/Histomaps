from pathlib import Path
p=Path('StarWars/recurring-lifelines.js')
s=p.read_text()
replacements={
"['maz','Maz Kanata','Maz',['resistance-tv','ep7','ep8','ep9']":"['maz','Maz Kanata','Maz',['ep7','ep8','ep9']",
"['depa','Depa Billaba','Depa Billaba',['ep1','clone-tv','bad-batch']":"['depa','Depa Billaba','Depa Billaba',['ep1','ep2','bad-batch']",
"['passel','Passel Argente','Passel Argente',['ep2','clone-tv','ep3']":"['passel','Passel Argente','Passel Argente',['ep1','ep2','ep3']",
"['ponudo','Po Nudo','Po Nudo',['ep2','clone-tv','ep3']":"['ponudo','Po Nudo','Po Nudo',['ep1','ep2','ep3']",
"['hera','Hera Syndulla','Hera',['bad-batch','rebels-tv','rogue-one','ahsoka-tv']":"['hera','Hera Syndulla','Hera',['bad-batch','rebels-tv','ahsoka-tv']",
"['zeb','Garazeb Orrelios','Zeb',['rebels-tv','mando-tv','ahsoka-tv']":"['zeb','Garazeb Orrelios','Zeb',['rebels-tv','mando-tv','mando-film']",
"['huyang','Huyang','Huyang',['clone-tv','tales-jedi','ahsoka-tv']":"['huyang','Huyang','Huyang',['young-jedi','clone-tv','ahsoka-tv']",
"['thrawn','Mitth’raw’nuruodo “Thrawn”','Thrawn',['rebels-tv','mando-tv','ahsoka-tv']":"['thrawn','Mitth’raw’nuruodo “Thrawn”','Thrawn',['rebels-tv','tales-empire','ahsoka-tv']",
}
for old,new in replacements.items():
    assert old in s, old
    s=s.replace(old,new,1)
# Optional per-character range overrides prevent broad anthology envelopes from distorting
# the actual first mapped appearance window.
old="rows.forEach(([id,name,short,appearances,groups,wiki,lead])=>{"
new="rows.forEach(([id,name,short,appearances,groups,wiki,lead,range])=>{"
assert old in s;s=s.replace(old,new,1)
old="const start=Math.min(...media.map(m=>m.start)),end=Math.max(...media.map(m=>m.end));"
new="const start=range?.start??Math.min(...media.map(m=>m.start)),end=range?.end??Math.max(...media.map(m=>m.end));"
assert old in s;s=s.replace(old,new,1)
# Give Huyang and Thrawn defensible character-level windows within broad anthology/series envelopes.
s=s.replace("'Huyang','Ancient droid professor who has instructed generations of Jedi and later accompanies Ahsoka Tano beyond the fall of the Order.'],", "'Huyang','Ancient droid professor who has instructed generations of Jedi and later accompanies Ahsoka Tano beyond the fall of the Order.',{start:-232,end:9,note:'Huyang’s Young Jedi Adventures appearance is dated to 232 BBY.'}],",1)
s=s.replace("'Mitthrawnuruodo','Chiss Imperial grand admiral whose strategic brilliance makes him a major threat first to the Rebellion and later the New Republic.'],", "'Mitthrawnuruodo','Chiss Imperial grand admiral whose strategic brilliance makes him a major threat first to the Rebellion and later the New Republic.',{start:-9,end:9,note:'His Tales of the Empire appearance falls between 9 BBY and 2 BBY; the line therefore starts at the earliest edge of that documented window.'}],",1)
old="note:'This expanded track begins at the first dated screen appearance included in this atlas, not at the character’s birth. Its open endpoint marks the last dated mapped screen appearance, not an asserted death or final canonical appearance.'"
new="note:'This expanded track begins at the first dated screen appearance included in this atlas, not at the character’s birth. Its open endpoint marks the last dated mapped screen appearance, not an asserted death or final canonical appearance.'+(range?.note?' '+range.note:'')"
assert old in s;s=s.replace(old,new,1)
p.write_text(s)
print('Recurring lifeline property corrections applied')
