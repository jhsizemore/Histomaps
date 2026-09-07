from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('/tmp/selection-qa'); out.mkdir(exist_ok=True)

def dismiss_intro(page):
    page.evaluate("document.getElementById('launch-intro').hidden=true")

def activate(page, selector, index=0):
    loc=page.locator(selector).nth(index)
    loc.scroll_into_view_if_needed()
    loc.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    page.wait_for_timeout(120)
    return loc

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/google-chrome')

    page=browser.new_page(viewport={'width':1440,'height':900})
    page.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle')
    dismiss_intro(page)

    activate(page,'.stream',0)
    assert page.locator('.stream.selected').count()>=1
    assert page.locator('.stream.dim').count()>=1
    sf=page.locator('.stream.selected').first.evaluate("e=>getComputedStyle(e).filter")
    assert 'drop-shadow' in sf, sf
    page.screenshot(path=str(out/'desktop-faction.png'))

    page.locator('#close-inspector').click()
    activate(page,'.event',0)
    assert page.locator('.event.active').count()==1
    assert page.locator('.event.dim').count()>=1
    assert page.locator('.stream.selected').count()>=1, 'selected event should light its associated stream'
    ef=page.locator('.event.active .event-dot').evaluate("e=>getComputedStyle(e).filter")
    assert 'drop-shadow' in ef, ef
    page.screenshot(path=str(out/'desktop-event.png'))

    page.locator('#close-inspector').click()
    screen=page.locator('#screen-map [data-screen]').first
    screen.scroll_into_view_if_needed()
    screen.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    page.wait_for_timeout(120)
    assert page.locator('#screen-map .screen-story.active').count()==1
    assert page.locator('#screen-map .screen-story.dim, #screen-map .screen-cluster.dim').count()>=1
    assert page.locator('#map .screen-highlight').count()==1
    page.screenshot(path=str(out/'desktop-screen.png'))

    page.locator('#close-inspector').click()
    group=page.locator('#screen-map [data-screen-group]').first
    if group.count():
        group.scroll_into_view_if_needed()
        group.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
        page.wait_for_timeout(120)
        assert page.locator('#screen-map .screen-cluster.active').count()==1
        assert page.locator('#map .screen-highlight').count()==1
        page.screenshot(path=str(out/'desktop-screen-group.png'))
        page.locator('#close-inspector').click()

    page.locator('button[data-layer="life"]').click()
    page.wait_for_timeout(180)
    life=page.locator('#screen-map [data-life]').first
    life.scroll_into_view_if_needed()
    life.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    page.wait_for_timeout(120)
    assert page.locator('#screen-map .lifeline.active').count()==1
    assert page.locator('#screen-map .lifeline.dim').count()>=1
    lf=page.locator('#screen-map .lifeline.active .life-stroke').evaluate("e=>getComputedStyle(e).filter")
    assert 'drop-shadow' in lf, lf
    page.screenshot(path=str(out/'desktop-lifeline.png'))
    page.close()

    mobile=browser.new_page(viewport={'width':390,'height':844})
    mobile.goto('http://127.0.0.1:8000/StarWars/',wait_until='networkidle')
    dismiss_intro(mobile)
    activate(mobile,'.stream',0)
    assert mobile.locator('.stream.selected').count()>=1
    assert mobile.locator('.stream.dim').count()>=1
    mobile.screenshot(path=str(out/'mobile-faction.png'))
    mobile.locator('#close-inspector').click()
    activate(mobile,'.event',0)
    assert mobile.locator('.event.active').count()==1
    mobile.screenshot(path=str(out/'mobile-event.png'))
    mobile.close()

    browser.close()
