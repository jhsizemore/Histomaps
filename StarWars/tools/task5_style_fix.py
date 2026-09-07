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
p.write_text(t)
print('Fixed landing CSS/script newline serialization.')
