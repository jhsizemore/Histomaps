from pathlib import Path

SW = Path(__file__).resolve().parents[1]
path = SW / 'tools' / 'poster' / 'render.py'
text = path.read_text()

replacements = [
("text('AN UNOFFICIAL FAN ATLAS  /  STORY SPOILERS',2540,56,18,MUTED,align='right')",
 "text('UNOFFICIAL FAN ATLAS  /  STATIC EDITION  /  STORY SPOILERS',2540,56,18,MUTED,align='right')"),
("text('Explore: histomaps.org/StarWars',2540,164,42,GOLD,'cond',align='right')",
 "text('INTERACTIVE: histomaps.org/StarWars',2540,164,42,GOLD,'cond',align='right')"),
("text('CANON  /  500 BBY — 35 ABY',60,275,31,GOLD,'bold')\ntext('Power, stories, and lives on one timeline.',2540,277,31,INK,'serif',align='right')",
 "text('CANON  /  500 BBY — 35 ABY',60,275,31,GOLD,'bold')\ntext('THE HISTORY OF THE STAR WARS GALAXY',2540,270,30,GOLD,'bold',align='right')\ntext('Power · stories · lives · one timeline',2540,310,21,INK,'bold',align='right')"),
("text('FOLLOW TIME DOWNWARD',60,344,19,GOLD,'bold')\nparagraph('BBY: before the Battle of Yavin. ABY: after it. Crowded eras expand; equal distances do not mean equal years.',60,377,740,22)\ntext('WIDTHS ARE INTERPRETIVE',895,344,19,GOLD,'bold')\nparagraph('Bands suggest political and military reach. They are not measured territory, population, or percentages.',895,377,740,22)\ntext('LIVES, NOT POLITICAL SHARES',1730,344,19,GOLD,'bold')\nparagraph('A separate line for each person. Filled circle: birth. Cross: death. Open circle: last mapped appearance.',1730,377,810,22)",
 "text('FOLLOW TIME DOWNWARD',60,350,19,GOLD,'bold')\nparagraph('BBY: before the Battle of Yavin. ABY: after it. Crowded eras expand; equal distances do not mean equal years.',60,383,740,22)\ntext('WIDTHS ARE INTERPRETIVE',895,350,19,GOLD,'bold')\nparagraph('Bands suggest political and military reach. They are not measured territory, population, or percentages.',895,383,740,22)\ntext('LIVES, NOT POLITICAL SHARES',1730,350,19,GOLD,'bold')\nparagraph('A separate line for each person. Filled circle: birth. Cross: death. Open circle: last mapped appearance.',1730,383,810,22)"),
("paragraph('Explore the streams, stories, and sources. Find more maps at histomaps.org.',60,PROMO+169,1000,23)",
 "paragraph('Interactive timeline, source notes, and high-resolution download. Find more maps at histomaps.org.',60,PROMO+169,1000,23)"),
("text('Star Wars belongs to Lucasfilm. Unofficial fan project. Insignia retain the credits and licenses above.',60,H-48,17,MUTED)",
 "text('Unofficial fan atlas. Star Wars and related marks belong to Lucasfilm Ltd. No affiliation or endorsement implied.',60,H-48,17,MUTED)"),
("text('STATIC EDITION / 06 SEPTEMBER 2026',2540,H-80,19,MUTED,align='right')",
 "text('STATIC EDITION / 07 SEPTEMBER 2026',2540,H-80,19,MUTED,align='right')"),
("meta=PngImagePlugin.PngInfo();meta.add_text('Title','Star Wars Histomap — canon, screen stories, lifelines and Legends');meta.add_text('Description','Static fan atlas by J. Hunter Sizemore / kliawota.design. Editorial stream widths; elastic chronology. Explore and find sources: https://histomaps.org/StarWars/. Support: https://patreon.com/histomaps. Edition 2026-09-06.')",
 "meta=PngImagePlugin.PngInfo();meta.add_text('Title','Star Wars Histomap — canon, screen stories, lifelines and Legends');meta.add_text('Description','Static fan atlas by J. Hunter Sizemore / kliawota.design. Editorial stream widths; elastic chronology. Explore and find sources: https://histomaps.org/StarWars/. Support: https://patreon.com/histomaps. Edition 2026-09-07.')"),
("meta.add_text('Background','Original AI-generated cinematic starfield; integrated beneath the native chart, labels and artwork. Starfield edition 2026-09-06.')",
 "meta.add_text('Background','Original AI-generated cinematic starfield; integrated beneath the native chart, labels and artwork. Starfield edition 2026-09-07.')"),
("'screen_titles':len(media)", "'screen_titles':len(raw_media)"),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected one match, found {count}: {old[:100]}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('Applied final Star Wars poster launch polish.')
