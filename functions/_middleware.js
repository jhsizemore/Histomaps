export async function onRequest(context) {
  const response=await context.next();
  const url=new URL(context.request.url);
  if(context.request.method!=='GET'||url.hostname!=='histomaps.org'||response.status!==200||!(response.headers.get('content-type')||'').includes('text/html')) return response;
  if(!/^\/(?:$|world(?:\/|$)|starwars(?:\/|$)|about(?:\/|$)|journal(?:\/|$))/i.test(url.pathname)) return response;
  // Run before the World's device-routing redirect so its original source is retained.
  return new HTMLRewriter().on('head',{element(head){head.prepend('<script src="/assets/traffic-attribution.js?v=1"></script>',{html:true});}}).transform(response);
}
