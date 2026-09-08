export function onRequestGet({request}) {
  const url=new URL(request.url);
  const fields=url.pathname.slice('/api/attribution/'.length).split('/');
  const origin=request.headers.get('origin');
  const site=request.headers.get('sec-fetch-site');
  const valid=url.hostname==='histomaps.org' && fields.length===6 && fields.every(x=>/^[a-z0-9._-]{1,80}$/.test(x)) && ['home','world','starwars','about','journal'].includes(fields[5]);
  if(!valid || (origin && origin!==url.origin) || (site && site!=='same-origin')) return new Response(null,{status:400,headers:{'cache-control':'no-store'}});
  return new Response(null,{status:204,headers:{'cache-control':'no-store, max-age=0','x-robots-tag':'noindex'}});
}
