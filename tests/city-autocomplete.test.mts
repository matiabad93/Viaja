import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Native TypeScript runner
import {rankCityResults,rankCountryCities,matchCountryQuery,citySubtitle,cityLabel} from '../lib/city-suggestions.ts';
// @ts-ignore Native TypeScript runner
import {destinationsAPI} from '../server/destinations.ts';

const raw=[
 {id:2,name:'Paris',country:'Estados Unidos',admin1:'Texas',feature_code:'PPL',population:24500,latitude:33.6,longitude:-95.5},
 {id:1,name:'París',country:'Francia',admin1:'Isla de Francia',feature_code:'PPLC',population:2100000,latitude:48.85,longitude:2.35},
 {id:4,name:'Paris',country:'Estados Unidos',admin1:'Tennessee',feature_code:'PPL',population:10000,latitude:36.3,longitude:-88.3},
 {id:99,name:'Paris',country:'Francia',admin1:'Isla de Francia',feature_code:'ADM1',latitude:48.8,longitude:2.3},
 {id:2,name:'Paris',country:'Estados Unidos',admin1:'Texas',feature_code:'PPL',latitude:33.6,longitude:-95.5}
];
const cities=rankCityResults(raw,'Paris');
assert.equal(cities.length,3);
assert.equal(cities[0].id,1,'The capital in France ranks before smaller US towns');
assert.equal(cityLabel(cities[0]),'París, Francia');
assert.equal(citySubtitle(cities[0],cities),'Isla de Francia, Francia','Always show the province even for unique city names');
assert.equal(citySubtitle(cities[1],cities),'Texas, Estados Unidos','State disambiguates cities in the same country');
assert.equal(citySubtitle(cities[2],cities),'Tennessee, Estados Unidos');
assert.deepEqual(rankCityResults([{id:1,name:'París',country:'Francia',featureCode:'PPLC',latitude:48.85,longitude:2.35}],'Paris').map(c=>c.id),[1],'Already normalized backend results stay searchable');
assert.equal(rankCityResults(raw,'PARÍS')[0].id,1,'Accent insensitive match');
assert.deepEqual(matchCountryQuery('Italia'),{code:'IT',name:'Italia'});
assert.equal(matchCountryQuery('Italy')?.code,'IT','English country synonyms are supported');
assert.equal(matchCountryQuery('Ital')?.code,'IT','Unambiguous partial country name is supported');
assert.equal(matchCountryQuery('Argentina')?.code,'AR');
assert.equal(matchCountryQuery('Rosario'),null,'A city is not interpreted as a country');
assert.equal(matchCountryQuery('Roma, Italia'),null,'City plus country qualifier is a city search');
const italianSource=[
 {geonameId:3173435,name:'Milano',countryCode:'IT',latitude:45.4642,longitude:9.19,population:1300000,featureCode:'PPLA'},
 {geonameId:3169070,name:'Roma',countryCode:'IT',latitude:41.9028,longitude:12.4964,population:2800000,featureCode:'PPLC'},
 {geonameId:1,name:'Italia',countryCode:'MX',latitude:19,longitude:-99,population:1000000,featureCode:'PPL'},
 {geonameId:2,name:'Piccolo',countryCode:'IT',latitude:46,longitude:11,population:0,featureCode:'PPL'}
];
assert.deepEqual(rankCountryCities(italianSource,{code:'IT',name:'Italia'}).map(c=>c.name),['Roma','Milano'],
 'Country search returns largest actual cities of Italy, not foreign namesakes');
const rosarioSource=[
 {id:100,name:'Rosario',country:'Argentina',admin1:'Santa Fe',feature_code:'PPLA2',population:950000,latitude:-32.95,longitude:-60.65},
 {id:101,name:'Rosario',country:'Filipinas',admin1:'Calabarzón',feature_code:'PPL',population:60000,latitude:14.41,longitude:120.85}
];
const rosarios=rankCityResults(rosarioSource,'Rosario');
assert.equal(rosarios[0].country,'Argentina','Argentina Rosario ranks above smaller namesakes');
assert.equal(citySubtitle(rosarios[0],rosarios),'Santa Fe, Argentina','Province and country appear under the city');


const original=globalThis.fetch;
try{
 globalThis.fetch=async()=>Response.json({results:raw});
 const response=await destinationsAPI(new Request('https://viaja.test/api/cities?q=Paris'));
 assert.equal(response?.status,200);
 const payload=await response!.json() as {cities:any[]};
 assert.equal(payload.cities[0].name,'París');
 assert.equal(payload.cities[0].country,'Francia');
 assert.equal(payload.cities[0].featureCode,'PPLC');
 assert.equal(payload.cities[0].population,2100000);
 globalThis.fetch=async(input:any)=>{
  const url=String(input);
  assert.ok(url.includes('country=IT'),'Country query uses country-filtered city endpoint');
  return Response.json(italianSource);
 };
 const nation=await destinationsAPI(new Request('https://viaja.test/api/cities?q=Italia'));
 assert.equal(nation?.status,200);
 const countryPayload=await nation!.json() as {cities:any[];mode:string;country:{code:string}};
 assert.equal(countryPayload.mode,'country');
 assert.equal(countryPayload.country.code,'IT');
 assert.deepEqual(countryPayload.cities.map(c=>c.name),['Roma','Milano']);
}finally{globalThis.fetch=original}

const component=readFileSync(new URL('../components/trip-stops-editor.tsx',import.meta.url),'utf8');
assert.ok(component.includes("ariaLabel={i===0?'Destino principal':'Destino adicional '+(i+1)}"),'All route positions, including added cities, use autocomplete');
assert.ok(component.includes('else selectStop(i-1,value);'),'Extra destinations accept and confirm city suggestions');
const home=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const detail=readFileSync(new URL('../components/trip-detail.tsx',import.meta.url),'utf8');
assert.ok(home.includes('ariaLabel="Ciudad de salida"'),'Planner origin autocompletes');
assert.ok(detail.includes('ariaLabel="Ciudad de salida"'),'Edit-trip origin autocompletes');
const guide=readFileSync(new URL('../components/travel-hub.tsx',import.meta.url),'utf8');
const madrid=guide.slice(guide.indexOf("id:'madrid'"),guide.indexOf('const meta='));
assert.ok(madrid.includes('published:true'),'Madrid is available in Explore');
assert.ok(madrid.includes('Puerta del Sol')&&madrid.includes('Plaza Mayor')&&madrid.includes('Museo del Prado'),'Madrid guide has significant landmarks');
assert.ok(guide.includes('viaja-editorial-madrid-v1'),'Madrid is added even if local catalog was previously cached');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
assert.ok(css.includes('max-height:min(256px,36dvh)'), 'Suggestions stay compact on a mobile screen');
assert.ok(css.includes('font-size:16px'), 'iPhone input remains legible without Safari zoom');
console.log('PASS: city ranking, clean labels, normalized API, consistent search fields and Madrid guide');
