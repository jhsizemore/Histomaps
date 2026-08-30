const BOOT_PARAM='__hmview';

function routerHtml(request){
  const url=new URL(request.url);
  url.searchParams.delete(BOOT_PARAM);
  const suffix=(url.searchParams.size?'?'+url.searchParams.toString():'');
  const desktop=new URL(url.origin+'/world/');
  for(const [k,v] of url.searchParams)desktop.searchParams.append(k,v);
  desktop.searchParams.set(BOOT_PARAM,'desktop');
  const desktopTarget=desktop.pathname+'?'+desktop.searchParams.toString();
  const mobileTarget='/world/mobile/'+suffix;
  const js=`(()=>{const P='histomap:view-preference';let p='auto';try{const v=localStorage.getItem(P);if(v==='mobile'||v==='desktop')p=v}catch(_){}const coarse=matchMedia('(pointer: coarse)').matches;const compact=matchMedia('(max-width: 1100px)').matches||Math.min(screen.width||innerWidth,screen.height||innerHeight)<=820;const auto=coarse&&compact?'mobile':'desktop';const target=(p==='auto'?auto:p)==='mobile'?${JSON.stringify(mobileTarget)}:${JSON.stringify(desktopTarget)};location.replace(target+location.hash)})()`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><link rel="canonical" href="/world/"><title>Opening Histomap…</title><style>html,body{height:100%;margin:0;background:#eee5d6;color:#2b251f;font:14px system-ui,sans-serif}body{display:grid;place-items:center}.s{opacity:.62}</style></head><body><div class="s">Opening Histomap…</div><script>${js}<\/script></body></html>`;
}

class InjectRouting{
  element(element){element.append('<script src="/assets/histomap-routing.js" defer></script><script type="module" src="/engine/browser/world-share-card.js"></script>',{html:true})}
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  if(url.searchParams.get(BOOT_PARAM)!=='desktop'){
    return new Response(routerHtml(request),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','x-robots-tag':'index, follow'}});
  }
  const assetUrl=new URL(request.url);
  assetUrl.pathname='/world/';
  assetUrl.search='';
  const response=await env.ASSETS.fetch(assetUrl);
  if(!(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);headers.set('cache-control','no-cache, must-revalidate');
  return new HTMLRewriter().on('body',new InjectRouting()).transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}

export function onRequestHead({request,env}){
  const url=new URL(request.url);url.pathname='/world/';url.search='';return env.ASSETS.fetch(new Request(url,{method:'HEAD',headers:request.headers}));
}
