function destination(request){const source=new URL(request.url);const target=new URL(source.origin+'/world/mobile/');target.search=source.search;return target.toString()}
export function onRequestGet({request}){return Response.redirect(destination(request),308)}
export function onRequestHead({request}){return Response.redirect(destination(request),308)}
