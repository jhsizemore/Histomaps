class InjectRouting{
  element(element){element.append('<script src="/assets/histomap-routing.js" defer></script><script type="module" src="/engine/browser/world-share-card.js"></script>',{html:true})}
}

function sourceUrl(request,parts){
  const url=new URL(request.url);
  const tail=Array.isArray(parts)?parts.join('/'):parts||'';
  url.pathname='/mobile-preview/'+tail;
  return url;
}

export async function onRequestGet({request,env,params}){
  const source=sourceUrl(request,params.path);
  const response=await env.ASSETS.fetch(source);
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const headers=new Headers(response.headers);headers.set('cache-control','no-cache, must-revalidate');headers.set('x-robots-tag','index, follow');
  return new HTMLRewriter().on('body',new InjectRouting()).transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}

export function onRequestHead({request,env,params}){
  const source=sourceUrl(request,params.path);return env.ASSETS.fetch(new Request(source,{method:'HEAD',headers:request.headers}));
}
