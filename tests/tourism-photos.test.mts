import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Node native TS strip runner
import {tourismTopics,photoSearchQuery,scenicCandidate,tourismPhotos,PHOTO_SOURCE_VERSION} from '../server/tourism-photos.ts';
// @ts-ignore Node native TS strip runner
import {photoCacheKey} from '../lib/destination-covers.ts';

const miami=tourismTopics('Miami');
assert.ok(miami.some(t=>t.term==='Beach'),'Miami prioritizes beaches');
assert.ok(miami.some(t=>t.term==='Ocean Drive'),'Miami includes Ocean Drive');
assert.equal(PHOTO_SOURCE_VERSION,'scenic-v2');
assert.equal(photoCacheKey('Miami','Estados Unidos'),'scenic-v2|miami|estados unidos');
assert.ok(photoSearchQuery('Miami',miami[0]).includes('intitle:"Beach"'));
const make=(title:string,extra:Record<string,unknown>={})=>({
 title:'File:'+title,index:1,imageinfo:[{width:1800,height:1100,mime:'image/jpeg',
 thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/test.jpg/1280px-test.jpg',
 descriptionurl:'https://commons.wikimedia.org/wiki/File:'+title.replace(/ /g,'_'),
 extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'Creative Commons photographer'}},...extra}]
});
const beach=make('Miami Beach South Beach ocean coastline.jpg');
assert.equal(scenicCandidate(beach,'Miami',miami[0])?.author,'Creative Commons photographer');
assert.equal(scenicCandidate(make('Miami handshake of politicians on Beach.jpg'),'Miami',miami[0]),null,'No news or politicians');
assert.equal(scenicCandidate(make('Miami portrait on Beach.jpg'),'Miami',miami[0]),null,'No portraits');
assert.equal(scenicCandidate(make('Another Miami.jpg'),'Miami',miami[0]),null,'Place type must match requested landmark');
assert.equal(scenicCandidate(make('Italy Beach.jpg'),'Miami',miami[0]),null,'No other city');
assert.equal(scenicCandidate(make('Miami Beach.jpg',{width:400,height:400}),'Miami',miami[0]),null,'No small or square images');
assert.equal(scenicCandidate(make('Miami Beach.jpg',{extmetadata:{LicenseShortName:{value:'All rights reserved'}}}),'Miami',miami[0]),null,'Reject images without reusable license');
assert.equal(scenicCandidate(make('Miami Beach.jpg',{descriptionurl:'https://example.org/offsite'}),'Miami',miami[0]),null,'Official Commons source required');
const original=globalThis.fetch;
const calls:string[]=[];
try {
 globalThis.fetch=async(input:any)=>{
  const url=new URL(String(input));calls.push(url.searchParams.get('gsrsearch')||'');
  const term=url.searchParams.get('gsrsearch')||'';
  const title=term.includes('Beach')?'Miami Beach South Beach ocean coastline.jpg':
   term.includes('skyline')?'Miami skyline at dusk.jpg':'Miami Ocean Drive Art Deco architecture.jpg';
  return Response.json({query:{pages:[make(title),make('Miami politician Beach conference.jpg'),make('Las Vegas Beach.jpg')]}});
 };
 const images=await tourismPhotos('Miami');
 assert.ok(images.length>=2,'Returns at least two unique landmarks from different topics');
 assert.ok(images.every(p=>p.title.includes('Miami')&&!/politician|Vegas|conference/i.test(p.title)),'Only actual tourist scenes');
 assert.ok(calls.every(q=>q.includes('intitle:"Miami"')),'Search never requests an unqualified city-wide image feed');
 assert.ok(calls.length<=6,'Limit Wikimedia requests to a modest amount');
}finally{globalThis.fetch=original}
const cover=readFileSync(new URL('../lib/destination-covers.ts',import.meta.url),'utf8');
assert.ok(cover.includes('photoKey===key'),'Existing trips must not reuse old images without the current photo strategy');
assert.ok(cover.includes('if(curated.length||safeStored.length'),'Valid verified images can be reused without extra API calls');
const gallery=readFileSync(new URL('../components/destination-gallery.tsx',import.meta.url),'utf8');
assert.ok(gallery.includes('photoCacheKey(city,country)'),'Gallery keys are versioned as well');
console.log('PASS: verified tourist attractions, excluded political photos, anti-stale-cache and Wikimedia attribution');
