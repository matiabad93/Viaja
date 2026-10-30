import assert from 'node:assert/strict';
// @ts-ignore Node TS strip mode
import {paris,colmar,barcelona,roma,lisboa} from '../server/builtin-photos.ts';
const collections={paris,colmar,barcelona,roma,lisboa};
for(const [city,photos] of Object.entries(collections)){
 assert.ok(photos.length>=4,city+' should have at least four rotating landmark photos');
 assert.equal(new Set(photos.map(p=>p.source)).size,photos.length,city+' must contain unique files');
 for(const item of photos){
  assert.ok(item.url.startsWith('https://'),city+' HTTPS image');
  assert.ok(item.source.startsWith('https://commons.wikimedia.org/'),city+' original');
  assert.ok(item.author&&item.license&&item.title,city+' license details');
  assert.doesNotMatch(item.title,/protest|demonstration|palestin|insect|millipede|political|surge/i,'Off-topic image rejected');
 }
}
assert.match(paris[0].title,/Eiffel/i,'Paris cover begins with Eiffel Tower');
assert.ok(paris.some(p=>/Louvre/i.test(p.title)),'Paris gallery includes Louvre');
assert.ok(paris.some(p=>/Montmartre/i.test(p.title)),'Paris gallery includes Montmartre');
assert.ok(lisboa.some(p=>/Tram 28/i.test(p.title)),'Lisbon includes its landmark tram');
assert.ok(lisboa.some(p=>/Bel[eé]m/i.test(p.title)),'Lisbon includes Belém Tower');
assert.ok(lisboa.some(p=>/Alfama/i.test(p.title)),'Lisbon includes Alfama viewpoint');
console.log('Curated destination photos have landmarks, authors and license metadata — OK');
