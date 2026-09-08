/* First-party arrival tracking. No visitor identifiers or referrer URLs. */
(()=>{
  if(location.hostname!=='histomaps.org' || navigator.webdriver) return;
  const page=location.pathname.toLowerCase();
  if(!/^\/(?:$|world(?:\/|$)|starwars(?:\/|$)|about(?:\/|$)|journal(?:\/|$))/.test(page)) return;
  try { if(localStorage.getItem('histomaps-exclude-own')==='1') return; } catch {}
  const label=value=>(value||'').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(0,80).replace(/^-+|-+$/g,'')||'-';
  const params=new URLSearchParams(location.search);
  let ref='-', internal=false;
  try { const host=new URL(document.referrer).hostname.toLowerCase();internal=host==='histomaps.org'||host==='www.histomaps.org';if(!internal)ref=label(host); } catch {}
  const source=label(params.get('utm_source'));
  const campaign=label(params.get('utm_campaign'));
  const fields=[source==='-'?(ref==='-'?'direct':ref):source,label(params.get('utm_medium')),campaign,label(params.get('utm_content')),ref,page.startsWith('/world')?'world':page.startsWith('/starwars')?'starwars':page==='/'?'home':page.startsWith('/journal')?'journal':'about'];
  const signature=fields.slice(0,4).join('/');const now=Date.now();
  try {
    const previous=JSON.parse(sessionStorage.getItem('histomaps-arrival')||'null');
    if(previous&&now-previous.at<30*60*1000&&(internal&&source==='-'&&campaign==='-'||previous.signature===signature)){
      sessionStorage.setItem('histomaps-arrival',JSON.stringify({...previous,at:now}));return;
    }
    sessionStorage.setItem('histomaps-arrival',JSON.stringify({signature,at:now}));
  } catch {}
  fetch('/api/attribution/'+fields.join('/'),{method:'GET',credentials:'omit',cache:'no-store',keepalive:true,referrerPolicy:'no-referrer'}).catch(()=>{});
})();
