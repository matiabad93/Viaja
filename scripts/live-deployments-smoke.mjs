// Public, credential-free smoke check: ensure the latest client bundle is actually live
// on every Cloudflare Pages branch alias, not only committed to GitHub.
const viajaHosts=[
 'viaja.pages.dev',
 'feat-v1-production-release-p.viaja.pages.dev',
 'feat-collaborative-trips-202.viaja.pages.dev',
 'feat-multidestination-route.viaja.pages.dev',
 'fix-city-autocomplete-madrid.viaja.pages.dev',
 'fix-map-and-budget-ux-202610.viaja.pages.dev',
 'fix-multicity-map-location-2.viaja.pages.dev',
 'fix-travel-photos-dense-itin.viaja.pages.dev',
 'fix-v1-mobile-ux-madrid-guid.viaja.pages.dev',
 'work-v1-ui-fixes-pending-rel.viaja.pages.dev'
];
const tupaHosts=['tupa-travel-v1.viaja.pages.dev','demo-tupa-travel.viaja.pages.dev'];
const checks=[...viajaHosts.map(host=>({host,expected:'viaja_accept_trip_invite',app:'Viaja'})),
 ...tupaHosts.map(host=>({host,expected:'tupa-auth-session-v1',app:'Tupã Premium'}))];
const errors=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function inspect({host,expected,app}){
 const origin='https://'+host+'/';
 const res=await fetch(origin,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw Error('HTTP '+res.status+' en home');
 const html=await res.text();
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/gi)].map(m=>m[1]);
 const entry=scripts.find(s=>/index-[^/]+\.js/.test(s))||scripts[0];
 if(!entry)throw Error('Falta el script principal en HTML');
 const scriptUrl=new URL(entry,origin);
 if(scriptUrl.origin!==new URL(origin).origin)throw Error('Script origin inesperado');
 const script=await fetch(scriptUrl,{signal:AbortSignal.timeout(18000)});
 if(!script.ok)throw Error('Script HTTP '+script.status);
 const content=await script.text();
 if(!content.includes(expected))throw Error('JS antiguo o incompleto: '+scriptUrl.pathname);
 if(app==='Viaja'&&!content.includes('viaja-theme'))throw Error('Frontend no actualizado con Entrega A: '+scriptUrl.pathname);
 return {host,app,bundle:scriptUrl.pathname,length:content.length};
}
for(let attempt=1;attempt<=5;attempt++){
 const batch=await Promise.allSettled(checks.map(inspect));
 errors.length=0;
 for(let i=0;i<batch.length;i++){
  const result=batch[i];
  if(result.status==='fulfilled'){
    console.log('PASS',result.value.app,result.value.host,result.value.bundle);
  }else{
    const detail=String(result.reason?.message||result.reason);
    errors.push(checks[i].host+': '+detail);
  }
 }
 if(!errors.length){
   console.log('PASS all '+checks.length+' live Cloudflare branch URLs serve the latest product-specific client bundle.');
   process.exit(0);
 }
 console.warn('Attempt '+attempt+'/5: '+errors.length+' preview(s) still stale or inaccessible.');
 if(attempt<5)await wait(12000);
}
for(const failure of errors)console.error('FAIL',failure);
process.exitCode=1;
