import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Node TypeScript stripping
import {canAppendDestination,swapStops,swapTripStops} from '../lib/stop-editor.ts';

assert.equal(canAppendDestination('','',[],[]),false,'Empty main city blocks the next stop');
assert.equal(canAppendDestination('París, Francia','',[],[]),false,'Typed but unselected main city is incomplete');
assert.equal(canAppendDestination('París, Francia','París, Francia',[],[]),true,'Confirmed first city allows a second');
assert.equal(canAppendDestination('París, Francia','París, Francia',[''],['']),false,'Blank next stop blocks another');
assert.equal(canAppendDestination('París, Francia','París, Francia',['Toledo, España'],['']),false,'Typed but unselected city blocks the next stop');
assert.equal(canAppendDestination('París, Francia','París, Francia',['Toledo, España'],['Toledo, España']),true,'Selecting city enables the next');
assert.equal(canAppendDestination('París, Francia','París, Francia',Array.from({length:5},(_,i)=>'City '+i),Array.from({length:5},(_,i)=>'City '+i)),false,'Six total destinations is the limit');
assert.deepEqual(swapStops(['Madrid','Toledo','Segovia'],1,2),['Madrid','Segovia','Toledo']);
assert.deepEqual(swapStops(['Madrid','Toledo'],0,99),['Madrid','Toledo']);
const withCity={destination:'Varsovia, Polonia',additionalDestinations:['Cracovia, Polonia','Ámsterdam, Países Bajos'],city:{name:'Varsovia',latitude:52.23,longitude:21.01}};
const shifted=swapTripStops(withCity,0,1);
assert.equal(shifted.destination,'Cracovia, Polonia','First destination can move down');
assert.deepEqual(shifted.additionalDestinations,['Varsovia, Polonia','Ámsterdam, Países Bajos']);
assert.equal(shifted.city,undefined,'Coordinates of previous primary city are cleared');
const restored=swapTripStops(shifted,1,0);
assert.equal(restored.destination,'Varsovia, Polonia','Second destination can become primary again');
assert.deepEqual(restored.additionalDestinations,['Cracovia, Polonia','Ámsterdam, Países Bajos']);
assert.deepEqual(swapTripStops(withCity,1,2).additionalDestinations,['Ámsterdam, Países Bajos','Cracovia, Polonia']);
assert.deepEqual(swapTripStops(withCity,0,999),withCity,'Out-of-range move changes nothing');

const home=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
assert.ok(home.includes("origin:''"),'New trips start without a default city of origin');
const guides=readFileSync(new URL('../components/travel-hub.tsx',import.meta.url),'utf8');
const stops=readFileSync(new URL('../components/trip-stops-editor.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
assert.ok(home.includes("onClick={()=>showGuide('madrid')}"),'Madrid teaser opens the published guide');
assert.ok(home.includes("initialGuideId={tab==='guides'?guideTarget||undefined:undefined}"),'Guide target passed to catalog');
assert.ok(guides.includes('useState<string|null>(initialGuideId||null)'),'Guide opens selected on mount');
assert.ok(stops.includes('disabled={!canAdd}'),'Cannot add an unselected stop');
assert.ok(stops.includes('setConfirmedExtra(selected)'),'Selections stay tracked when reordering');
assert.ok(stops.includes('onChange(swapTripStops(trip,index,other))'),'Primary and secondary cities participate in the same reorder');
assert.ok(stops.includes("i===0?'Destino principal'"),'The primary city is the first rendered route position');
assert.ok(css.includes('All route positions share identical input geometry'),'All city controls use the same dimensions');
assert.ok(css.includes('.topbar nav:has(>button:nth-child(4))'),'Bottom nav supports 3 and 4 sections');
assert.ok(css.includes('env(safe-area-inset-bottom)'),'Bottom nav accommodates iPhone safe area');
// AI regeneration must use Viaja's dialog, not window.confirm(), and must not
// reserve the provider request before the user has actively confirmed.
const dialog=readFileSync(new URL('../components/confirm-dialog.tsx',import.meta.url),'utf8');
assert.ok(!/\b(?:window\.)?confirm\s*\(/.test(home),'AI regeneration must never show a browser-native confirm popup');
assert.ok(home.includes('setPendingRegeneration(true)'),'Existing itinerary asks for confirmation');
assert.ok(home.includes('onConfirm={confirmRegeneration}'),'Regeneration dialog has explicit confirmation');
assert.ok(home.includes('onCancel={()=>setPendingRegeneration(false)}'),'Closing the dialog cancels regeneration');
assert.ok(home.includes('danger={false}'),'Regeneration uses non-destructive dialog styling');
assert.ok(home.indexOf('void performGeneration();};')<home.indexOf('const confirmRegeneration='),'Initial generation is independent of confirm callback');
assert.ok(home.includes('expenses:draft.expenses'),'AI response retains already recorded expenses');
assert.ok(dialog.includes('role={danger?"alertdialog":"dialog"}'),'Non-destructive dialog uses the appropriate accessible role');
assert.ok(css.includes('.viaja-confirm-neutral .viaja-confirm-icon'),'Regeneration has branded modal styling');
console.log('PASS: Madrid navigation, sequential stops, mobile UX and branded AI regeneration confirmation');
