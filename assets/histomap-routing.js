(()=>{
  'use strict';
  const PREF_KEY='histomap:view-preference';
  const HANDOFF_KEY='histomap:view-handoff-v1';
  const DESKTOP_BOOT='__hmview';
  const currentView=location.pathname.startsWith('/world/mobile')?'mobile':'desktop';

  const safeStore={
    get(store,key){try{return store.getItem(key)}catch(_){return null}},
    set(store,key,value){try{store.setItem(key,value);return true}catch(_){return false}},
    remove(store,key){try{store.removeItem(key)}catch(_){} }
  };

  function autoView(){
    const coarse=matchMedia('(pointer: coarse)').matches;
    const compact=matchMedia('(max-width: 1100px)').matches || Math.min(screen.width||innerWidth,screen.height||innerHeight)<=820;
    return coarse&&compact?'mobile':'desktop';
  }

  function preference(){
    const value=safeStore.get(localStorage,PREF_KEY);
    return value==='mobile'||value==='desktop'?value:'auto';
  }

  function visible(el){
    if(!el||!el.getBoundingClientRect)return false;
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1||r.bottom<0||r.right<0||r.top>innerHeight||r.left>innerWidth)return false;
    const s=getComputedStyle(el);
    return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;
  }

  function shortText(el,max=90){
    const t=(el?.getAttribute?.('aria-label')||el?.textContent||'').replace(/\s+/g,' ').trim();
    return t&&t.length<=max?t:'';
  }

  function parseYear(text){
    if(!text)return null;
    const t=text.replace(/[−–—]/g,'-');
    let m=t.match(/\b(\d{1,4})\s*(BCE|BC)\b/i);
    if(m)return -Number(m[1]);
    m=t.match(/\b(\d{1,4})\s*(CE|AD)\b/i);
    if(m)return Number(m[1]);
    m=t.match(/(?:^|\s)(-?\d{1,4})(?:\s|$)/);
    if(m){const n=Number(m[1]);if(n>=-5000&&n<=3000)return n}
    return null;
  }

  function nearestYear(){
    const selectors='[id*="year" i],[class*="year" i],[id*="date" i],[class*="date" i],[data-year]';
    let best=null,bestScore=Infinity;
    for(const el of document.querySelectorAll(selectors)){
      if(!visible(el))continue;
      const text=shortText(el,32);
      const year=el.dataset?.year?Number(el.dataset.year):parseYear(text);
      if(!Number.isFinite(year))continue;
      const r=el.getBoundingClientRect();
      const score=Math.abs((r.top+r.bottom)/2-innerHeight/2)+(text.length*2);
      if(score<bestScore){bestScore=score;best=year}
    }
    return best;
  }

  function chosenText(kind){
    const hint=kind==='person'?'person|people|lifeline|card':kind==='civilization'?'stream|civil|polity|target|nation|culture':'zoom|scale|span';
    const re=new RegExp(hint,'i');
    const selectors='[aria-current="true"],[aria-selected="true"],[aria-pressed="true"],.selected,.active,[data-selected="true"],dialog[open] h1,dialog[open] h2';
    for(const el of document.querySelectorAll(selectors)){
      if(!visible(el))continue;
      const signature=[el.id,el.className,el.getAttribute?.('name'),el.getAttribute?.('data-type'),el.parentElement?.id,el.parentElement?.className].filter(Boolean).join(' ');
      if(!re.test(signature))continue;
      const text=shortText(el);
      if(text)return text;
    }
    return '';
  }

  function controlValue(kind){
    const re=new RegExp(kind==='zoom'?'zoom|scale':'span|range|window','i');
    for(const el of document.querySelectorAll('input[type="range"],select')){
      const sig=[el.id,el.name,el.className,el.getAttribute('aria-label')].filter(Boolean).join(' ');
      if(re.test(sig)&&el.value!==undefined){
        const value=Number(el.value),min=Number(el.min),max=Number(el.max);
        const fraction=Number.isFinite(value)&&Number.isFinite(min)&&Number.isFinite(max)&&max>min?(value-min)/(max-min):null;
        return {sig,value:el.value,fraction};
      }
    }
    return null;
  }

  function captureContext(){
    const root=document.scrollingElement||document.documentElement;
    const max=Math.max(0,root.scrollHeight-innerHeight);
    return {
      v:1,
      from:currentView,
      at:Date.now(),
      year:nearestYear(),
      civilization:chosenText('civilization'),
      person:chosenText('person'),
      scrollRatio:max?scrollY/max:0,
      viewportRatio:root.scrollHeight?innerHeight/root.scrollHeight:null,
      zoom:controlValue('zoom'),
      span:controlValue('span'),
      search:location.search,
      hash:location.hash
    };
  }

  function clickByText(text,kind){
    if(!text)return false;
    const needle=text.replace(/\s+/g,' ').trim().toLowerCase();
    const hint=kind==='person'?/person|people|lifeline|name|card/i:/stream|civil|polity|target|nation|culture/i;
    let fallback=null;
    for(const el of document.querySelectorAll('button,[role="button"],[data-person-id],[data-stream-id],[data-polity-id],a')){
      if(!visible(el))continue;
      const t=shortText(el,120).toLowerCase();
      if(!t||t!==needle)continue;
      const sig=[el.id,el.className,el.getAttribute('aria-label'),el.parentElement?.id,el.parentElement?.className].filter(Boolean).join(' ');
      if(hint.test(sig)){el.click();return true}
      fallback=fallback||el;
    }
    if(fallback){fallback.click();return true}
    return false;
  }

  function restoreControl(saved,kind){
    if(!saved)return false;
    const re=new RegExp(kind==='zoom'?'zoom|scale':'span|range|window','i');
    for(const el of document.querySelectorAll('input[type="range"],select')){
      const sig=[el.id,el.name,el.className,el.getAttribute('aria-label')].filter(Boolean).join(' ');
      if(!re.test(sig))continue;
      const min=Number(el.min),max=Number(el.max);
      el.value=Number.isFinite(saved.fraction)&&Number.isFinite(min)&&Number.isFinite(max)&&max>min?String(min+(max-min)*saved.fraction):saved.value;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
    return false;
  }

  function restoreYear(year){
    if(!Number.isFinite(year))return false;
    const candidates=document.querySelectorAll('[data-year],[id*="year" i],[class*="year" i],[id*="date" i],[class*="date" i]');
    let best=null,bestDiff=Infinity;
    for(const el of candidates){
      const y=el.dataset?.year?Number(el.dataset.year):parseYear(shortText(el,40));
      if(!Number.isFinite(y))continue;
      const diff=Math.abs(y-year);
      if(diff<bestDiff){bestDiff=diff;best=el}
    }
    if(best&&bestDiff<=5){best.scrollIntoView({block:'center',inline:'center'});return true}
    return false;
  }

  function restoreHandoff(){
    const raw=safeStore.get(sessionStorage,HANDOFF_KEY);
    if(!raw)return;
    let state;
    try{state=JSON.parse(raw)}catch(_){safeStore.remove(sessionStorage,HANDOFF_KEY);return}
    if(!state||state.v!==1||state.from===currentView||Date.now()-state.at>30000)return;
    let attempts=0;
    const apply=()=>{
      attempts++;
      restoreControl(state.zoom,'zoom');
      restoreControl(state.span,'span');
      if(state.civilization)clickByText(state.civilization,'civilization');
      if(Number.isFinite(state.year))restoreYear(state.year);
      if(state.person)clickByText(state.person,'person');
      if(attempts>=4){
        if(!Number.isFinite(state.year)){
          const root=document.scrollingElement||document.documentElement;
          const max=Math.max(0,root.scrollHeight-innerHeight);
          if(max&&Number.isFinite(state.scrollRatio))scrollTo({top:Math.max(0,Math.min(max,max*state.scrollRatio)),behavior:'auto'});
        }
        safeStore.remove(sessionStorage,HANDOFF_KEY);
      }
    };
    [80,350,900,1800].forEach(ms=>setTimeout(apply,ms));
  }

  function targetUrl(target){
    const url=new URL(location.href);
    url.searchParams.delete(DESKTOP_BOOT);
    url.pathname=target==='mobile'?'/world/mobile/':'/world/';
    if(target==='desktop')url.searchParams.set(DESKTOP_BOOT,'desktop');
    return url.pathname+(url.searchParams.size?'?'+url.searchParams.toString():'')+url.hash;
  }

  function switchTo(target){
    if(target===currentView)return;
    safeStore.set(sessionStorage,HANDOFF_KEY,JSON.stringify(captureContext()));
    location.assign(targetUrl(target));
  }

  function choose(value){
    if(value==='auto')safeStore.remove(localStorage,PREF_KEY);
    else safeStore.set(localStorage,PREF_KEY,value);
    const target=value==='auto'?autoView():value;
    switchTo(target);
  }

  function makeSwitcher(){
    const wrap=document.createElement('div');
    wrap.className='hm-view-switcher';
    wrap.setAttribute('data-histomap-view-switcher','');
    const label=document.createElement('label');
    label.textContent='View: ';
    const select=document.createElement('select');
    select.setAttribute('aria-label','Histomap view');
    for(const [value,text] of [['auto','Auto'],['mobile','Mobile'],['desktop','Desktop']]){
      const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);
    }
    select.value=preference();
    select.addEventListener('change',()=>choose(select.value));
    label.append(select);wrap.append(label);
    return wrap;
  }

  function installSwitcher(){
    if(document.querySelector('[data-histomap-view-switcher]'))return;
    const style=document.createElement('style');
    style.textContent='.hm-view-switcher{font:600 12px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:inherit}.hm-view-switcher label{display:flex;align-items:center;gap:6px;white-space:nowrap}.hm-view-switcher select{font:inherit;color:inherit;background:rgba(248,243,234,.92);border:1px solid rgba(40,34,29,.22);border-radius:8px;padding:6px 24px 6px 8px}.hm-view-switcher.hm-view-floating{position:fixed;z-index:2147483000;right:12px;bottom:12px;padding:7px 9px;border-radius:10px;background:rgba(242,234,220,.9);box-shadow:0 3px 18px rgba(0,0,0,.16);backdrop-filter:blur(8px)}';
    document.head.append(style);
    const candidates=[
      '[data-menu="settings"]','[data-panel="settings"]','#settings-panel','.settings-panel',
      '#controls-panel','.controls-panel','#controls','.controls','#menu-panel','.menu-panel','#menu','.menu',
      'nav[aria-label*="control" i]','nav[aria-label*="menu" i]','[role="menu"]'
    ];
    const findHost=()=>{for(const selector of candidates){const el=document.querySelector(selector);if(el)return el}return null};
    const switcher=makeSwitcher();
    const host=findHost();
    if(host)host.append(switcher);else{
      switcher.classList.add('hm-view-floating');document.body.append(switcher);
      const observer=new MutationObserver(()=>{const lateHost=findHost();if(lateHost){switcher.classList.remove('hm-view-floating');lateHost.append(switcher);observer.disconnect()}});
      observer.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),8000);
    }
  }

  function cleanDesktopBoot(){
    if(currentView!=='desktop')return;
    const url=new URL(location.href);
    if(url.searchParams.get(DESKTOP_BOOT)!=='desktop')return;
    url.searchParams.delete(DESKTOP_BOOT);
    history.replaceState(history.state,'',url.pathname+(url.searchParams.size?'?'+url.searchParams.toString():'')+url.hash);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{cleanDesktopBoot();installSwitcher();restoreHandoff()},{once:true});
  else{cleanDesktopBoot();installSwitcher();restoreHandoff()}
})();
