import assert from 'node:assert/strict';
// @ts-ignore Node native TypeScript runner
import {destinationsAPI} from '../server/destinations.ts';
const realFetch=globalThis.fetch;
let calls:string[]=[];
globalThis.fetch=async(input:any)=>{const url=String(input);calls.push(url);if(url.includes('open-meteo'))return Response.json({results:[{id:1,name:'Colmar',country:'Francia',feature_code:'PPLA2',latitude:48,longitude:7},{id:2,name:'Colmar hill',feature_code:'HLL'}]});return Response.json({query:{pages:[{title:'File:Testville skyline.jpg',index:1,imageinfo:[{width:1600,height:900,mime:'image/jpeg',thumburl:'https://upload.wikimedia.org/example.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Testville_skyline.jpg',extmetadata:{Artist:{value:'<b>Author</b>'},LicenseShortName:{value:'CC BY-SA 4.0'}}}]}]}})};
let r=await destinationsAPI(new Request('https://viaja.test/api/cities?q=Colmar'));assert.equal(r?.status,200);assert.equal((await r!.json() as any).cities.length,1);
r=await destinationsAPI(new Request('https://viaja.test/api/cities?q=x'));assert.equal(r?.status,400);
r=await destinationsAPI(new Request('https://viaja.test/api/photos?q=Testville&country=France&date=2026-12-01&lat=48'));const d=await r!.json() as any;assert.equal(d.season,'winter');assert.equal(d.photos.length,1);assert.equal(d.photos[0].author,'Author');assert.equal(d.photoStrategy,'scenic-v3');assert.ok(calls.some(u=>decodeURIComponent(u).includes('intitle:')),'Photos use title-filtered landmark searches');
globalThis.fetch=async()=>{throw Error('offline')};r=await destinationsAPI(new Request('https://viaja.test/api/cities?q=Paris'));assert.equal(r?.status,502);globalThis.fetch=realFetch;
console.log('PASS: city filtering, validation, photo deduplication, attribution, season, provider errors');
