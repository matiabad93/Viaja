import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript stripping
import {guideCountries,selectVisibleGuides,previewGuideStops} from '../lib/guide-discovery.ts';
import type {Guide} from '../lib/curated-guides.ts';

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
console.log('PASS: guide discovery, countries, accents, itinerary stops and favorites');
