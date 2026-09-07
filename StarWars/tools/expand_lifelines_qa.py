from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('/tmp/lifeline-qa');out.mkdir(exist_ok=True)

def dismiss(page):
    page.evaluate("document.getElementById('launch-intro').hidden=true")

def setup_lives(page,group):
    page.locator('button[data-layer="life"]').click()
    page.select_option('#life-group',group)
    page.wait_for_timeout(160)

def click_life(page,life_id):
    loc=page.locator(f'#screen-map [data-life="{life_id}"]')
    loc.scroll_into_view_if_needed()
    loc.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    page.wait_for_timeout(150)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/google-chrome')
    for width,height,label in [(1440,900,'desktop'),(390,844,'mobile')]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle');dismiss(page)
        assert page.evaluate('window.HISTOMAP.lifelines.length')==94
        assert page.evaluate('window.HISTOMAP.recurringLifelineCount')==78
        assert page.locator('#life-group option').count()>=18

        setup_lives(page,'droids')
        assert page.locator('#screen-map .lifeline').count()==6
        click_life(page,'r2d2')
        content=page.locator('#inspector-content').inner_text()
        assert 'First mapped appearance' in content
        assert 'R2-D2' in content
        assert page.evaluate("window.HISTOMAP.lifelines.find(p=>p.id==='r2d2').startKind")=='appearance'
        assert page.evaluate("window.HISTOMAP.lifelines.find(p=>p.id==='r2d2').appearances.length")==14
        chips=page.locator('#inspector-content .record-tags span')
        assert chips.count()==14,chips.count()
        assert 'The Phantom Menace' in chips.all_inner_texts()[0]
        page.screenshot(path=str(out/f'{label}-r2d2.png'))

        page.locator('#close-inspector').click();page.wait_for_timeout(80)
        page.select_option('#life-group','jedi-council');page.wait_for_timeout(120)
        count=page.locator('#screen-map .lifeline').count()
        assert 10<=count<=16,count
        page.screenshot(path=str(out/f'{label}-jedi-council.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')
        page.close()
    browser.close()
print('Expanded lifeline QA passed')
