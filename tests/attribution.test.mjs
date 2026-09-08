import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const tracker=await readFile(new URL('../assets/traffic-attribution.js',import.meta.url),'utf8');
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL(path,import.meta.url),'utf8')).toString('base64'));
const endpoint=await load('../functions/api/attribution/[[path]].js');
function browser({url='https://histomaps.org/starwars/',referrer='',owner=false,automated=false}={}){
 const session=new Map(),calls=[];
 const context={location:new URL(url),document:{referrer},navigator:{webdriver:automated},URL,URLSearchParams,Date,
  localStorage:{getItem:()=>owner?'1':null},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},fetch:(...args)=>{calls.push(args);return Promise.resolve();}};
 return {context,calls,run:()=>vm.runInNewContext(tracker,context)};
}
test('UTM labels and referrer hostname are recorded without personal query strings',()=>{
 const b=browser({url:'https://histomaps.org/starwars/?utm_source=Reddit&utm_medium=social&utm_campaign=launch&utm_content=post-1&email=private@example.com',referrer:'https://www.reddit.com/r/starwars/?private=secret'});b.run();
 assert.equal(b.calls.length,1);
 assert.equal(b.calls[0][0],'/api/attribution/reddit/social/launch/post-1/www.reddit.com/starwars');
 assert.equal(b.calls[0][1].credentials,'omit');
 assert.equal(b.calls[0][1].referrerPolicy,'no-referrer');
});
test('plain referrals and direct arrivals are distinguished',()=>{
 const a=browser({referrer:'https://www.google.com/search?q=private'});a.run();assert.match(a.calls[0][0],/^\/api\/attribution\/www.google.com\//);
 const b=browser();b.run();assert.match(b.calls[0][0],/^\/api\/attribution\/direct\//);
});
test('routing and internal navigation do not double-count a tracked arrival',()=>{
 const b=browser({url:'https://histomaps.org/world/?utm_source=reddit&utm_campaign=launch'});b.run();
 b.context.location=new URL('https://histomaps.org/world/mobile/?utm_source=reddit&utm_campaign=launch');b.context.document.referrer='https://histomaps.org/world/';b.run();
 b.context.location=new URL('https://histomaps.org/about/');b.run();assert.equal(b.calls.length,1);
});
test('owner browsers, automation and preview deployments do not emit tracking requests',()=>{
 for(const config of [{owner:true},{automated:true},{url:'https://preview.histomaps.pages.dev/'}]){const b=browser(config);b.run();assert.equal(b.calls.length,0);}
});
test('collector accepts valid same-origin arrivals and rejects invalid or cross-site paths',()=>{
 const url='https://histomaps.org/api/attribution/reddit/social/launch/post-1/reddit.com/starwars';
 const ok=endpoint.onRequestGet({request:new Request(url,{headers:{'sec-fetch-site':'same-origin'}})});assert.equal(ok.status,204);assert.match(ok.headers.get('cache-control'),/no-store/);
 assert.equal(endpoint.onRequestGet({request:new Request(url,{headers:{origin:'https://attacker.example'}})}).status,400);
 assert.equal(endpoint.onRequestGet({request:new Request(url+'/extra')}).status,400);
});
test('source and campaign aggregation uses the same owner exclusions as edge analytics',async t=>{
 const {onRequestGet}=await load('../functions/api/analytics.js');
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  const v=JSON.parse(options.body).variables;
  assert.equal(v.attributionFilter.clientRequestPath_like,'/api/attribution/%');
  assert.equal(v.attributionFilter.edgeResponseStatus,204);
  assert.deepEqual(v.attributionFilter.clientIP_notin,['192.0.2.1']);
  return Response.json({data:{viewer:{zones:[{arrivals:[
   {count:4,dimensions:{clientRequestPath:'/api/attribution/reddit/social/launch/post-1/reddit.com/starwars'}},
   {count:2,dimensions:{clientRequestPath:'/api/attribution/direct/-/-/-/-/home'}},
  ]}]}}});
 });
 const r=await onRequestGet({env:{CLOUDFLARE_API_TOKEN:'test',CLOUDFLARE_ZONE_ID:'test',DASHBOARD_PASSWORD:'test'},request:new Request('https://histomaps.org/api/analytics?range=24h',{headers:{'x-dashboard-password':'test','cf-connecting-ip':'192.0.2.1'}})});
 const data=await r.json();assert.equal(r.status,200);assert.equal(data.attribution.arrivals,6);assert.equal(data.attribution.directShare,33);assert.deepEqual(data.attribution.campaigns,[{name:'reddit · launch (social)',value:4}]);assert.equal(data.attribution.posts[0].name,'reddit · launch · post-1');
});

test('middleware injects tracking before routing scripts only on public HTML pages',async t=>{
 const {onRequest}=await load('../functions/_middleware.js');let inserted='';
 t.mock.method(globalThis,'fetch',async()=>assert.fail('Unexpected fetch'));
 const before=globalThis.HTMLRewriter;
 globalThis.HTMLRewriter=class{on(selector,handler){assert.equal(selector,'head');handler.element({prepend(value){inserted=value;}});return this;}transform(response){return response;}};
 try{
  for(const path of ['/','/world/','/world/mobile/','/starwars/','/about/','/journal/']){
   inserted='';const response=new Response('<html><head></head><body></body></html>',{headers:{'content-type':'text/html'}});
   await onRequest({request:new Request('https://histomaps.org'+path),next:async()=>response});assert.match(inserted,/traffic-attribution.js/);assert.ok(!inserted.includes('defer'));
  }
  inserted='';await onRequest({request:new Request('https://histomaps.org/dashboard/'),next:async()=>new Response('dashboard',{headers:{'content-type':'text/html'}})});assert.equal(inserted,'');
 }finally{if(before===undefined)delete globalThis.HTMLRewriter;else globalThis.HTMLRewriter=before;}
});

test('campaign link builder preserves the destination and generates post-level UTM tags',async()=>{
 const html=await readFile(new URL('../dashboard/index.html',import.meta.url),'utf8');const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,hidden:true,listeners:{},classList:{toggle(){}},addEventListener(event,fn){this.listeners[event]=fn}});return elements.get(id)};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:{documentElement:{},getElementById:element,querySelectorAll:()=>[]},URL,Intl,Date,Map});
 for(const [id,value] of Object.entries({'campaign-url':'https://histomaps.org/starwars/?view=wide#timeline','campaign-source':'Reddit','campaign-medium':'social','campaign-name':'launch','campaign-content':'post-1'}))element(id).value=value;
 element('campaign-form').listeners.submit({preventDefault(){}});
 const result=new URL(element('campaign-result').value);assert.equal(result.searchParams.get('utm_source'),'reddit');assert.equal(result.searchParams.get('utm_content'),'post-1');assert.equal(result.searchParams.get('view'),'wide');assert.equal(result.hash,'#timeline');
 element('campaign-url').value='https://external.example/';element('campaign-form').listeners.submit({preventDefault(){}});assert.equal(element('campaign-result').value,'');assert.match(element('campaign-error').textContent,/histomaps.org/);
});
