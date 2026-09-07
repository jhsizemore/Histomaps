from pathlib import Path
import json
import re
import urllib.parse
import urllib.request
from playwright.sync_api import sync_playwright

out=Path('/tmp/synopsis-qa');out.mkdir(exist_ok=True)
api_url='https://starwars.fandom.com/api.php?'+urllib.parse.urlencode({
    'action':'query','prop':'extracts','exintro':'1','explaintext':'1','redirects':'1',
    'titles':'Luke Skywalker','format':'json','formatversion':'2','origin':'*'
})

probe={'url':api_url}
try:
    req=urllib.request.Request(api_url,headers={'User-Agent':'Histomaps-StarWars-QA/1.0 (https://histomaps.org/starwars/)'})
    with urllib.request.urlopen(req,timeout=20) as r:
        body=r.read().decode('utf-8')
        data=json.loads(body)
        pg=(data.get('query',{}).get('pages') or [{}])[0]
        probe['server']={'ok':True,'status':r.status,'cors':r.headers.get('Access-Control-Allow-Origin'),'title':pg.get('title'),'extract_chars':len(pg.get('extract','')),'extract_preview':pg.get('extract','')[:240]}
except Exception as e:
    probe['server']={'ok':False,'error':repr(e)}

def sentence_count(text):
    return len(re.findall(r'[^.!?]+(?:[.!?]+|$)',text or ''))

def assert_synopsis(locator,label,visible=True):
    if visible:locator.wait_for(state='visible')
    else:locator.wait_for(state='attached')
    text=locator.inner_text().strip()
    count=sentence_count(text)
    assert 2<=count<=3,(label,count,text)
    return text

def save_probe():
    (out/'wookieepedia-api-probe.json').write_text(json.dumps(probe,indent=2,ensure_ascii=False))

def dismiss_intro(page):
    page.evaluate("document.getElementById('launch-intro').hidden=true")

def activate(page,selector,index=0):
    loc=page.locator(selector).nth(index)
    loc.scroll_into_view_if_needed()
    loc.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    page.wait_for_timeout(100)
    return loc

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/google-chrome')
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle')
    dismiss_intro(page)

    inventory=page.evaluate("""() => {
      const D=window.HISTOMAP;
      const rows=[];
      D.factions.forEach(x=>rows.push(['faction',x.id,x.synopsis]));
      D.events.forEach(x=>rows.push(['event',x.id,x.synopsis]));
      D.screen.forEach(x=>rows.push(['screen',x.id,x.synopsis]));
      D.lifelines.forEach(x=>rows.push(['life',x.id,x.synopsis]));
      Object.entries(D.legends).forEach(([section,L])=>{
        rows.push(['legend-overview',section,L.synopsis]);
        L.events.forEach(x=>rows.push(['legend-event',section+':'+x.id,x.synopsis]));
        L.factions.forEach(x=>rows.push(['legend-faction',section+':'+x.id,x.synopsis]));
      });
      return rows;
    }""")
    problems=[]
    for kind,id_,text in inventory:
        n=sentence_count(text)
        if not text or not 2<=n<=3:problems.append({'kind':kind,'id':id_,'sentences':n,'text':text})
    assert not problems,problems
    probe['synopsis_records_checked']=len(inventory)

    # Test the exact cross-origin browser call Histomaps could make at runtime.
    try:
        cors=page.evaluate("""async url => {
          try {
            const r=await fetch(url,{mode:'cors'});
            const text=await r.text();
            let data=null;try{data=JSON.parse(text)}catch(e){}
            const pg=data?.query?.pages?.[0];
            return {ok:r.ok,status:r.status,cors:r.headers.get('access-control-allow-origin'),title:pg?.title||null,extract_chars:(pg?.extract||'').length,extract_preview:(pg?.extract||'').slice(0,240),body_preview:text.slice(0,240)};
          } catch(e) { return {ok:false,error:String(e)}; }
        }""",api_url)
    except Exception as e:
        cors={'ok':False,'error':repr(e)}
    probe['browser_cors']=cors
    save_probe()

    activate(page,'.stream',0)
    assert_synopsis(page.locator('.record-synopsis'),'canon faction')
    page.locator('#close-inspector').click()

    activate(page,'.event',0)
    assert_synopsis(page.locator('.record-synopsis'),'canon event')
    page.locator('#close-inspector').click()

    page.locator('button[data-layer="screen"]').click();page.wait_for_timeout(120)
    activate(page,'#screen-map [data-screen]',0)
    assert_synopsis(page.locator('.record-synopsis'),'screen title')
    page.screenshot(path=str(out/'desktop-screen-synopsis.png'))
    page.locator('#close-inspector').click()

    group=page.locator('#screen-map [data-screen-group]').first
    assert group.count()==1
    group.scroll_into_view_if_needed();group.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");page.wait_for_timeout(100)
    assert_synopsis(page.locator('.record-synopsis'),'screen group')
    page.locator('#close-inspector').click()

    page.locator('button[data-layer="life"]').click();page.wait_for_timeout(120)
    activate(page,'#screen-map [data-life]',0)
    assert_synopsis(page.locator('.record-synopsis'),'lifeline')
    page.screenshot(path=str(out/'desktop-life-synopsis.png'))
    page.locator('#close-inspector').click()

    page.select_option('#continuity','ancient');page.wait_for_timeout(120)
    assert_synopsis(page.locator('.record-synopsis'),'legends overview',visible=False)
    activate(page,'.event',0)
    assert_synopsis(page.locator('.record-synopsis'),'legends event')
    page.locator('#close-inspector').click()
    activate(page,'.legend-stream',0)
    assert_synopsis(page.locator('.record-synopsis'),'legends faction')
    page.screenshot(path=str(out/'desktop-legends-synopsis.png'))
    page.close()

    mobile=browser.new_page(viewport={'width':390,'height':844})
    mobile.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle');dismiss_intro(mobile)
    mobile.locator('button[data-layer="screen"]').click();mobile.wait_for_timeout(120)
    activate(mobile,'#screen-map [data-screen]',0)
    assert_synopsis(mobile.locator('.record-synopsis'),'mobile screen title')
    box=mobile.locator('#inspector').bounding_box();assert box and box['width']<=390.5,box
    mobile.screenshot(path=str(out/'mobile-screen-synopsis.png'))
    mobile.close();browser.close()

save_probe()
print(json.dumps(probe,indent=2,ensure_ascii=False))
print('synopsis records checked',len(inventory))
