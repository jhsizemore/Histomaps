from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('/tmp/imperial-script-qa');out.mkdir(exist_ok=True)

def dismiss(page):
    page.evaluate("document.getElementById('launch-intro').hidden=true")

def click_svg(page,selector):
    loc=page.locator(selector).first
    loc.scroll_into_view_if_needed()
    loc.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    page.wait_for_timeout(140)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/google-chrome')

    intro=browser.new_page(viewport={'width':1440,'height':900})
    intro.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle')
    assert intro.evaluate("document.fonts.check(\"24px 'Imperial Script'\")")
    assert intro.locator('.launch-script-flourish').inner_text().strip()=='across the ages'
    intro.screenshot(path=str(out/'desktop-intro.png'))
    intro.close()

    page=browser.new_page(viewport={'width':1440,'height':900})
    page.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle');dismiss(page)
    click_svg(page,'.stream')
    assert page.locator('.imperial-archive-mark').is_visible()
    assert page.locator('.imperial-active-mark').is_visible()
    assert page.locator('.imperial-active-mark').inner_text().strip()=='active record'
    family=page.locator('.imperial-active-mark').evaluate("e=>getComputedStyle(e).fontFamily")
    assert 'Imperial Script' in family,family
    page.screenshot(path=str(out/'desktop-selected.png'))
    page.close()

    mobile=browser.new_page(viewport={'width':390,'height':844})
    mobile.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle');dismiss(mobile)
    mobile.locator('button[data-layer="screen"]').click();mobile.wait_for_timeout(120)
    click_svg(mobile,'#screen-map [data-screen]')
    assert mobile.locator('.imperial-archive-mark').is_visible()
    assert mobile.locator('.imperial-active-mark').is_visible()
    box=mobile.locator('#inspector').bounding_box();assert box and box['width']<=390.5,box
    mobile.screenshot(path=str(out/'mobile-selected.png'))
    mobile.close()
    browser.close()

print('Imperial Script accent QA passed')
