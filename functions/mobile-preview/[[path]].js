function destination(request,parts){
  const source=new URL(request.url);
  const tail=Array.isArray(parts)?parts.join('/'):parts||'';
  const target=new URL(source.origin+'/world/mobile/'+tail);
  target.search=source.search;
  return target.toString();
}
export function onRequestGet({request,params}){return Response.redirect(destination(request,params.path),308)}
export function onRequestHead({request,params}){return Response.redirect(destination(request,params.path),308)}
