// Verify that Cloudflare's public branch alias serves this release rather
// than an earlier successful build. No private tokens or browser sessions.
const base=process.argv[2];
if(!base||!/^https:\/\/[a-z0-9.-]+\.pages\.dev\/?$/.test(base)){
 console.error('Expected a Cloudflare Pages HTTPS origin.');process.exit(2);
}
const origin=base.replace(/\/$/,'');
let lastError='';
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
for(let attempt=1;attempt<=20;attempt++){
 try{
  const res=await fetch(origin+'/?ui_release_check='+attempt,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('Frontend HTTP '+res.status);
  const html=await res.text();
  const script=html.match(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/i)?.[1];
  const style=html.match(/<link\b[^>]*\bhref=["']([^"']+\.css)["']/i)?.[1];
  if(!script||!style)throw Error('Missing compiled JS/CSS bundle links');
  const [jsResponse,cssResponse]=await Promise.all([
   fetch(new URL(script,origin),{cache:'no-store',signal:AbortSignal.timeout(15000)}),
   fetch(new URL(style,origin),{cache:'no-store',signal:AbortSignal.timeout(15000)})
  ]);
  if(!jsResponse.ok||!cssResponse.ok)throw Error('Missing JS/CSS assets');
  const [js,css]=await Promise.all([jsResponse.text(),cssResponse.text()]);
  if(!js.includes('viaja-theme')||!js.includes('Apariencia:')||!css.includes('favorite-button')||!css.includes('app-select-trigger'))
    throw Error('Cloudflare still serves a pre-Delivery-A bundle');
  console.log('PASS live UI delivery A at '+origin+' JS '+script+' CSS '+style);
  process.exit(0);
 }catch(error){lastError=error instanceof Error?error.message:String(error);console.warn('Cloudflare attempt '+attempt+'/20: '+lastError);}
 await delay(8000);
}
console.error('Delivery A not confirmed live: '+lastError);process.exit(1);
