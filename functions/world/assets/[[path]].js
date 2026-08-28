function assetUrl(request,parts){const url=new URL(request.url);const tail=Array.isArray(parts)?parts.join('/'):parts||'';url.pathname='/assets/'+tail;return url}
export function onRequestGet({request,env,params}){return env.ASSETS.fetch(assetUrl(request,params.path))}
export function onRequestHead({request,env,params}){const url=assetUrl(request,params.path);return env.ASSETS.fetch(new Request(url,{method:'HEAD',headers:request.headers}))}
