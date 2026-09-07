from pathlib import Path
SW=Path(__file__).resolve().parents[1]
app=SW/'app.js'
index=SW/'index.html'
js=app.read_text()
html=index.read_text()
old="    pane.append(svg('text',{x:12,y:49,class:'screen-meta'},'◇ Film · ┃ Series · • true anchor'));"
new="    pane.append(svg('text',{x:12,y:49,class:'screen-meta'},W<190?'◇ Film · ┃ TV · • date':'◇ Film · ┃ Series · • true anchor'));"
if old not in js: raise RuntimeError('screen key target not found')
js=js.replace(old,new,1)
style='''\n  <style id="mobile-final-refinements">\n    @media(max-width:700px){\n      body.life-mode .map-footer{justify-content:center}\n      body.life-mode .map-footer>span:first-child,body.life-mode .map-footer .creator-credit{display:none}\n      body.life-mode #layer-caption{display:block!important;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}\n    }\n  </style>'''
if 'id="mobile-final-refinements"' not in html:
    html=html.replace('</head>',style+'\n</head>',1)
app.write_text(js)
index.write_text(html)
print('Applied compact mobile legends refinement.')
