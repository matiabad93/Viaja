import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Node TypeScript stripping
import {canAppendDestination,swapStops} from '../lib/stop-editor.ts';

assert.equal(canAppendDestination('','',[],[]),false,'Empty main city blocks the next stop');
assert.equal(canAppendDestination('París, Francia','',[],[]),false,'Typed but unselected main city is incomplete');
assert.equal(canAppendDestination('París, Francia','París, Francia',[],[]),true,'Confirmed first city allows a second');
assert.equal(canAppendDestination('París, Francia','París, Francia',[''],['']),false,'Blank next stop blocks another');
assert.equal(canAppendDestination('París, Francia','París, Francia',['Toledo, España'],['']),false,'Typed but unselected city blocks the next stop');
assert.equal(canAppendDestination('París, Francia','París, Francia',['Toledo, España'],['Toledo, España']),true,'Selecting city enables the next');
assert.equal(canAppendDestination('París, Francia','París, Francia',Array.from({length:5},(_,i)=>'City '+i),Array.from({length:5},(_,i)=>'City '+i)),false,'Six total destinations is the limit');
assert.deepEqual(swapStops(['Madrid','Toledo','Segovia'],1,2),['Madrid','Segovia','Toledo']);
assert.deepEqual(swapStops(['Madrid','Toledo'],0,99),['Madrid','Toledo']);
const home=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const guides=readFileSync(new URL('../components/travel-hub.tsx',import.meta.url),'utf8');
const stops=readFileSync(new URL('../components/trip-stops-editor.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
assert.ok(home.includes("onClick={()=>showGuide('madrid')}"),'Madrid teaser opens the published guide');
assert.ok(home.includes("initialGuideId={tab==='guides'?guideTarget||undefined:undefined}"),'Guide target passed to catalog');
assert.ok(guides.includes('useState<string|null>(initialGuideId||null)'),'Guide opens selected on mount');
assert.ok(stops.includes('disabled={!canAdd}'),'Cannot add an unselected stop');
assert.ok(stops.includes('setConfirmedExtra(selected)'),'Selections stay tracked when reordering');
assert.ok(css.includes('.topbar nav:has(>button:nth-child(4))'),'Bottom nav supports 3 and 4 sections');
assert.ok(css.includes('env(safe-area-inset-bottom)'),'Bottom nav accommodates iPhone safe area');
console.log('PASS: Madrid teaser navigation, sequential city confirmation, reordering, mobile UI guards');
