from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.html'
t=p.read_text()
t=t.replace('<button id="launch-close" class="launch-close" aria-label="Skip introduction">×</button>', '<button id="launch-close" class="launch-close" aria-label="Skip introduction" onclick="document.getElementById(\'launch-intro\').hidden=true">×</button>')
t=t.replace('<button id="launch-explore" class="launch-primary">Explore interactive map <span aria-hidden="true">↓</span></button>', '<button id="launch-explore" class="launch-primary" onclick="document.getElementById(\'launch-intro\').hidden=true;document.getElementById(\'map-scroll\').focus({preventScroll:true})">Explore interactive map <span aria-hidden="true">↓</span></button>')
p.write_text(t)
print('Added direct launch dismissal fallback.')
