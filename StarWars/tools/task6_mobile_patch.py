from pathlib import Path

SW=Path(__file__).resolve().parents[1]
index=SW/'index.html'
app=SW/'app.js'

html=index.read_text()
js=app.read_text()

html=html.replace('styles.css?v=landing-20260907','styles.css?v=mobile-20260907')
html=html.replace('app.js?v=landing-20260907','app.js?v=mobile-20260907')
html=html.replace('Star-Wars-Histomap-Poster.png?v=landing-20260907','Star-Wars-Histomap-Poster.png?v=mobile-20260907')

style='''\n  <style id="mobile-final-pass">\n    @media(max-width:700px){\n      :root{--header-height:46px}\n      .masthead{padding:0 max(10px,env(safe-area-inset-left)) 0 max(10px,env(safe-area-inset-right));gap:8px}\n      .brand{gap:0}.brand>span:not(.brand-mark){display:none}.brand-mark{font-size:31px}\n      h1{gap:8px}.star-wars-mark{width:80px;height:auto;max-height:38px}.canon{font-size:10px;letter-spacing:.8px}\n      .header-actions{gap:1px}.quiet{font-size:12px;min-height:34px;padding:3px 6px}.poster-link{gap:4px}.poster-link svg{width:15px;height:15px}\n      .atlas-controls{min-height:44px;padding:4px max(8px,env(safe-area-inset-left)) 4px max(8px,env(safe-area-inset-right));gap:6px}\n      select{min-height:34px;font-size:12px;padding:4px 22px 4px 7px}.era-picker select{width:min(40vw,150px)}\n      .period-controls{gap:5px}.view-controls{gap:2px}.view-controls>button,#view-options>summary{min-height:34px;font-size:12px;padding:6px}\n      .layer-tabs{padding:2px}.layer-tabs button{min-height:32px;font-size:12px;padding:3px 8px}\n      .track-headings{min-height:24px;font-size:10px}.stream-heading{padding:3px 8px}.scale-note{font-size:9px}\n      #companion-heading{padding:0 5px}#companion-title{font-size:10px}#companion-heading select{font-size:11px;min-height:24px}#companion-help{min-height:24px;min-width:22px}\n      .map-footer{position:absolute;left:0;right:0;bottom:0;z-index:12;min-height:20px;padding:2px 8px;font-size:10px;background:#0b1417e8;backdrop-filter:blur(4px)}\n      #map-scroll{padding-bottom:20px}\n      .inspector{width:min(360px,94vw);padding:0 20px}.inspector h2{font-size:34px}.inspector p{font-size:15px}\n      dialog{width:calc(100% - 18px);padding:30px 22px}dialog h2{font-size:38px}\n    }\n    @media(max-height:500px) and (orientation:landscape){\n      :root{--header-height:34px}\n      .masthead{padding:0 8px;gap:6px}.masthead .brand{display:none}.masthead h1{gap:6px;margin-left:4px}.star-wars-mark{width:72px;max-height:28px}.canon{font-size:9px}\n      .header-actions{gap:0}.quiet{min-height:30px;font-size:11px;padding:2px 6px}\n      .atlas-controls{min-height:38px;padding:2px 8px;gap:5px}.atlas-controls select{min-height:32px}.era-picker select{width:150px}\n      .layer-tabs button{min-height:30px;padding:2px 9px}.view-controls>button,#view-options>summary{min-height:30px;padding:4px 6px}\n      .track-headings{display:none}.map-footer{display:none}#map-scroll{padding-bottom:0}\n      .continuity-note{max-height:44px;padding:5px 10px;font-size:11px}\n      .inspector{width:min(360px,72vw)}\n    }\n  </style>'''
if 'id="mobile-final-pass"' not in html:
    html=html.replace('</head>',style+'\n</head>',1)

old="    screenWidth=hasCompanion?Math.round(width<620?Math.max(128,width*.34):Math.min(310,Math.max(220,width*.27))):0;"
new="""    if(!hasCompanion)screenWidth=0;\n    else if(width<620){\n      const share=layer==='screen'?.39:.34,min=layer==='screen'?148:128,max=layer==='screen'?166:148;\n      screenWidth=Math.round(Math.min(max,Math.max(min,width*share)));\n    }else screenWidth=Math.round(Math.min(310,Math.max(220,width*.27)));"""
if old not in js:
    raise RuntimeError('mobile companion sizing target not found')
js=js.replace(old,new,1)

index.write_text(html)
app.write_text(js)
print('Applied final mobile interface pass.')
