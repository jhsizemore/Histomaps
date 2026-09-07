from pathlib import Path
SW=Path(__file__).resolve().parents[1]
app=SW/'app.js'
styles=SW/'styles.css'
js=app.read_text(); css=styles.read_text()
old="""      for(const size of [36,28,22,16]){"""
new="""      const symbolSizes=chartWidth>=2200?[50,40,30,22]:chartWidth>=1500?[44,34,26,18]:[36,28,22,16];
      for(const size of symbolSizes){"""
if old not in js: raise RuntimeError('stream symbol size target not found')
js=js.replace(old,new,1)
refine_css="""
@media(min-width:1800px){
  .ribbon-label{font-size:20px}.minor-label{font-size:13px}.axis-year{font-size:13px}.era-title{font-size:19px}
  .event .event-title{font-size:15px}.event .event-date{font-size:12px}.force-caption{font-size:12px}
}
@media(min-width:2800px){
  .ribbon-label{font-size:22px}.minor-label{font-size:14px}.axis-year{font-size:14px}.era-title{font-size:21px}
  .event .event-title{font-size:16px}.event .event-date{font-size:13px}.force-caption{font-size:13px}
}
"""
if '@media(min-width:2800px)' not in css: css += refine_css
app.write_text(js); styles.write_text(css)
print('Applied ultrawide map typography and symbol scaling.')
