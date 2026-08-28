class InjectRouting{element(element){element.append('<script src="/assets/histomap-routing.js" defer></script>',{html:true})}}
export async function onRequestGet({request,env}){
  const source=new URL(request.url);source.pathname='/mobile-preview/';
  const response=await env.ASSETS.fetch(source);
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const headers=new Headers(response.headers);headers.set('cache-control','no-cache, must-revalidate');headers.set('x-robots-tag','index, follow');
  return new HTMLRewriter().on('body',new InjectRouting()).transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}
export function onRequestHead({request,env}){const source=new URL(request.url);source.pathname='/mobile-preview/';return env.ASSETS.fetch(new Request(source,{method:'HEAD',headers:request.headers}))}
