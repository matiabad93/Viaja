import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript stripping
import {guideCountries,selectVisibleGuides,previewGuideStops} from '../lib/guide-discovery.ts';
import type {Guide} from '../lib/curated-guides.ts';
import {initial,extra} from '../lib/curated-guides.ts';
import {syncEuropeanGuides} from '../lib/guide-catalog-sync.ts';
import {createGuideItinerary} from '../lib/guide-starter.ts';
import {mapStops} from '../lib/map-helpers.ts';
import {europeGuides} from '../lib/curated-europe-guides.ts';

const sample:Guide[]=[
 {id:'barcelona',title:'Barcelona esencial',published:true,country:'ESPAÑA',description:'Arquitectura y gastronomía',days:['Sagrada Família: Gaudí | Park Güell: Mirador'],sources:[]},
 {id:'paris',title:'París',published:true,description:'Arte y barrios',days:['Museo del Louvre: Visita | Île de la Cité: Paseo','Montmartre: Vistas'],sources:[]},
 {id:'roma',title:'Roma',published:true,description:'Historia',days:['Coliseo: Interior | Foro Romano: Paseo'],sources:[]},
 {id:'draft',title:'Lisboa',published:false,country:'PORTUGAL',days:['Alfama: Paseo'],sources:[]}
];
const find=(q='',country='Todos',sort:'Recomendadas'|'Destino A–Z'|'Menos días'='Recomendadas',favorites:string[]=[],onlyFavorites=false)=>selectVisibleGuides(sample,q,country,sort,favorites,onlyFavorites);
assert.deepEqual(guideCountries(sample),['ESPAÑA','FRANCIA','ITALIA']);
assert.deepEqual(find().map(g=>g.id),['barcelona','paris','roma']);
assert.deepEqual(find('sagrada familia').map(g=>g.id),['barcelona'],'Search ignores accents and includes individual stops');
assert.deepEqual(find('louvre paris').map(g=>g.id),['paris'],'Search matches all words across country and stop');
assert.deepEqual(find('historia','ITALIA').map(g=>g.id),['roma']);
assert.deepEqual(find('','ESPAÑA').map(g=>g.id),['barcelona']);
assert.deepEqual(find('','Todos','Destino A–Z').map(g=>g.id),['barcelona','paris','roma']);
assert.deepEqual(find('','Todos','Recomendadas',['roma'],true).map(g=>g.id),['roma']);
assert.deepEqual(find('lisboa').map(g=>g.id),[],'Unpublished editor drafts remain private');
assert.deepEqual(previewGuideStops(sample[0]),['Sagrada Família','Park Güell']);
assert.deepEqual(sample.map(g=>g.id),['barcelona','paris','roma','draft'],'Catalog ordering never mutates source');
const catalog=[...extra,...initial];
assert.equal(catalog.length,15,'Five previous guides and ten new itineraries');
assert.equal(new Set(catalog.map(g=>g.id)).size,catalog.length,'No duplicate guide IDs');
assert.equal(catalog.some(g=>g.id==='colmar'),false,'Alsace is no longer bundled in Explore');
const europe14=catalog.find(g=>g.id==='europa-14-dias')!;
const europe21=catalog.find(g=>g.id==='europa-21-dias')!;
assert.equal(europe14.days.length,14);
assert.equal(europe21.days.length,21);
assert.equal(catalog.find(g=>g.id==='belgica-clasica')!.days.length,4);
for(const guide of catalog){
 assert.ok(guide.published,guide.id+' must be published');
 assert.ok(guide.days.every(day=>day.split('|').length>=2),guide.id+' has empty/short itinerary days');
 const days=createGuideItinerary(guide,guide.days.length);
 assert.equal(days.length,guide.days.length);
 assert.ok(days.every(day=>day.activities.every(activity=>activity.description.length>=10)),guide.id+' needs stop descriptions');
}
const londonDay=createGuideItinerary(europe21,21)[16];
assert.ok(mapStops(londonDay.activities,'Gran Europa en 21 días').every(s=>!s.query.includes('Gran Europa')),'Each city in a multi-city itinerary must geocode without appending a generic journey title');
assert.deepEqual(selectVisibleGuides(catalog,'Gante Brujas','BÉLGICA','Recomendadas',[],false).map(g=>g.id),['belgica-clasica']);
assert.deepEqual(selectVisibleGuides(catalog,'14 días','EUROPA','Recomendadas',[],false).map(g=>g.id),['europa-14-dias']);
const edited={...catalog.find(g=>g.id==='madrid')!,description:'Editada por el usuario'};
const retired={id:'colmar',title:'Colmar y Alsacia',days:['Antigua'],sources:[],published:true} satisfies Guide;
const migrated=syncEuropeanGuides([edited,retired],europeGuides);
assert.equal(migrated.length,11,'Migration only imports new guides, retires Alsace and keeps edits');
assert.equal(migrated.find(g=>g.id==='madrid')?.description,'Editada por el usuario');
assert.deepEqual(syncEuropeanGuides(migrated,europeGuides),migrated,'Migration is idempotent');
const customAlsace={...retired,title:'Mi ruta personalizada por Alsacia'};
assert.equal(syncEuropeanGuides([customAlsace],europeGuides).find(g=>g.id==='colmar')?.published,false,'Custom local Alsace content is preserved but unpublished');
console.log('PASS: guide discovery, countries, accents, itinerary stops and favorites');
