import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial,legacyEditorialDays} from '../lib/curated-guides.ts';
import {createEditorialStarter,createGuideItinerary,guideDestination} from '../lib/guide-starter.ts';
import {mapRouteUrl,mapStops} from '../lib/map-helpers.ts';
import {itineraryOf,type Trip,type Plan} from '../lib/travel.ts';

const base:Trip={destination:'',origin:'',start:'',end:'',travelers:2,budget:0,pace:'Equilibrado',transport:'Sin coche',notes:'',links:'',adjustment:'',sources:['official']};
for(const guide of initial){
 const destination=guideDestination(guide);
 const days=createEditorialStarter({...base,destination});
 assert.equal(days?.length,3,guide.id+' must have three structured days');
 assert.ok(days?.every(d=>d.activities.length>=3),guide.id+' should provide individual places, not two generic periods');
 assert.ok(days?.every(d=>d.activities.every(a=>a.title.trim().length>4&&!/^(Mañana|Tarde|Noche)( en |$)/i.test(a.title))),guide.id+' still uses generic activity titles');
 assert.ok(days?.every(d=>d.activities.every(a=>a.location&&a.description.length>25)),guide.id+' needs useful descriptions and geocodable places');
 const stops=mapStops(days![0].activities,destination);
 assert.equal(stops.length,days![0].activities.length);
 assert.ok(stops.every(s=>!/(?:Mañana|Tarde) en /i.test(s.query)),guide.id+' needs actual places in map links');
 assert.ok(mapRouteUrl(days![0].activities,destination)?.includes('waypoints='),guide.id+' must offer an ordered multi-stop route');
 assert.ok(legacyEditorialDays[guide.id].some(day=>day.startsWith('Mañana:')||day.startsWith('Excursión opcional')),'Keep the exact legacy content for safe migration');
}
const rome=initial.find(g=>g.id==='roma')!;
const days=createGuideItinerary(rome,3);
assert.deepEqual(days[0].activities.map(a=>a.title),['Coliseo','Foro Romano','Colina Capitolina','Piazza Venezia']);
assert.deepEqual(days[1].activities.map(a=>a.title),['Museos Vaticanos','Plaza de San Pedro','Basílica de San Pedro','Castel Sant’Angelo']);
const romeMap=mapStops(days[0].activities,'Roma, Italia');
assert.match(romeMap[0].query,/Coliseo, Roma, Italia/);
// A guide copied from Explore must also remain concrete after the legacy parts fallback.
const copied:Plan={id:'copied',kind:'draft',createdAt:'2026-11-16',trip:{...base,destination:guideDestination(rome)},parts:rome.days.map((day,i)=>({text:'Día '+(i+1)+'\n'+day,annotations:[]})),sources:[]};
assert.deepEqual(itineraryOf(copied)[0].activities.map(a=>a.title),days[0].activities.map(a=>a.title));

const mapSource=readFileSync(new URL('../components/trip-map.tsx',import.meta.url),'utf8');
assert.ok(mapSource.includes('https://tiles.openfreemap.org/styles/liberty'));
assert.ok(mapSource.includes('maplibreGL('));
assert.ok(mapSource.includes('L.divIcon('),'Safari-safe HTML destination markers must not depend on Leaflet PNG paths');
assert.ok(mapSource.includes('order:i+1'),'Map pins must preserve their original itinerary numbering');
assert.ok(mapSource.includes('layer.clearLayers()'),'Reloading pin positions must not leave duplicate markers');
const markerCss=readFileSync(new URL('../components/trip-map-markers.css',import.meta.url),'utf8');
assert.match(markerCss,/\.viaja-destination-marker-label/,'The number badge must be styled');
assert.match(markerCss,/background:#155440/,'Destination pins must have a visible opaque background');
assert.ok(mapSource.includes("glMap.once('load'"),'The map must verify real vector rendering, not merely mount an empty canvas');
assert.ok(mapSource.includes('Cargando mapa…'),'A slow map provider must show a visible loading state');
assert.ok(!mapSource.includes('tile.openstreetmap.org/{z}/{x}/{y}.png'),'Do not depend on the blocked OSM volunteer raster endpoint');
const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
assert.ok(headers.includes('Referrer-Policy: strict-origin-when-cross-origin'),'Map/geocoding services need an identifiable HTTPS origin');
console.log('PASS editorial: concrete stops, guide-copy parity, geocodable routes and compliant vector map');
