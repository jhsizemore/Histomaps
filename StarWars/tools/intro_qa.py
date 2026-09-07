from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('/tmp/intro-qa')
out.mkdir(exist_ok=True)
sizes=[('desktop',1440,900),('mobile',390,844),('landscape',844,390)]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/google-chrome')
    for name,w,h in sizes:
        page=browser.new_page(viewport={'width':w,'height':h})
        page.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle')
        page.evaluate('sessionStorage.clear()')
        page.reload(wait_until='networkidle')
        page.evaluate('document.getAnimations().forEach(a=>a.finish())')
        assert page.locator('#launch-intro').is_visible()
        assert page.locator('#launch-title').inner_text()=='A long time ago in a galaxy far, far away....'
        assert page.locator('.launch-histomap-word').inner_text()=='HISTOMAP'
        styles=page.locator('.launch-histomap-word').evaluate("e=>({font:getComputedStyle(e).fontFamily,color:getComputedStyle(e).color})")
        assert 'Star Jedi' not in styles['font'], styles
        assert page.locator('.launch-crawl').evaluate("e=>getComputedStyle(e).transform")!='none'
        box=page.locator('.launch-card').bounding_box()
        assert box and box['height'] <= h-8, (name,box,h)
        page.screenshot(path=str(out/f'{name}.png'),full_page=False)
    browser.close()
