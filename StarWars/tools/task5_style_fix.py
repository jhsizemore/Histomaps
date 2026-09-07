from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.html'
t=p.read_text()
for start,end in [('<style id="launch-experience-styles">','</style>'),('<script id="launch-experience-script">','</script>')]:
    a=t.find(start); b=t.find(end,a)
    if a<0 or b<0: raise RuntimeError(f'missing {start}')
    b+=len(end)
    block=t[a:b].replace('\\n','\n')
    t=t[:a]+block+t[b:]
t=t.replace('\\n  <style id="launch-experience-styles">','\n  <style id="launch-experience-styles">')
t=t.replace('\\n  <script id="launch-experience-script">','\n  <script id="launch-experience-script">')
old="@media(max-height:700px) and (orientation:landscape){.launch-intro{padding:10px}.launch-card{padding:22px 28px}.launch-card h2{font-size:42px;margin:14px 0 10px}.launch-deck{font-size:15px}.launch-features{margin:14px 0}.launch-foot{margin-top:14px}.launch-lockup img{width:120px;max-height:52px}.launch-lockup span{font-size:27px}.launch-eyebrow{margin-bottom:10px}}"
new="@media(max-height:700px) and (orientation:landscape){.launch-intro{padding:8px;align-items:center}.launch-card{width:min(760px,calc(100% - 8px));padding:14px 22px}.launch-card h2{font-size:36px;line-height:.98;margin:8px 0 7px}.launch-deck{font-size:14px;line-height:1.35}.launch-features{display:none}.launch-foot{display:none}.launch-lockup{gap:10px}.launch-lockup img{width:105px;max-height:44px}.launch-lockup span{font-size:24px}.launch-eyebrow{margin-bottom:6px}.launch-actions{margin-top:12px}.launch-primary,.launch-secondary{min-height:40px;padding:8px 13px;font-size:14px}}"
if old not in t: raise RuntimeError('short-landscape rule not found')
t=t.replace(old,new,1)
p.write_text(t)
print('Fixed landing CSS/script serialization and compacted short landscape.')
