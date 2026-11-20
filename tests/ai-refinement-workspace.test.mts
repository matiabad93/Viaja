import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const editor=readFileSync(new URL('../components/experience/ai-refinement-workspace.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');

assert.match(page,/onAI=\{p=>\{setAiEditingTripId\(p\.id\);/,'Opening AI editing must explicitly track the existing trip.');
assert.match(page,/plannerMode==='advanced'&&aiEditingTripId===result\?\.id&&result\?<AIRefinementWorkspace/,'Existing-trip editing needs its own screen.');
assert.match(page,/const newTrip=\(\)=>\{setPlannerMode\('guided'\);setAiEditingTripId\(null\);/,'Planning a new trip must reset the edit context.');
assert.match(page,/onSubmit=\{generate\}/,'Refinement must reuse itinerary-aware AI generation and validation.');
assert.match(editor,/id="trip-adjustment" required minLength=\{5\} maxLength=\{1000\}/,'Refinement prompt is prominent, validated and length-limited.');
assert.match(editor,/Aplicar mejoras al itinerario/);
assert.doesNotMatch(editor,/Crear mi viaje sin IA|Probar con Madrid|Contanos tu próximo viaje/);
assert.match(editor,/itineraryOf\(plan\)/,'Context panel must show the real itinerary to be improved.');
assert.match(editor,/AIActionFeedback message=\{aiError\} refining/,'Show one contextual AI outcome.');
assert.match(editor,/onClick=\{onBack\}/,'Allow returning to the current trip.');
assert.match(editor,/role="status"/);
assert.match(css,/@media\(max-width:650px\)\{\.ai-refinement-page/,'Provide a responsive narrow-screen layout.');
assert.match(css,/html\[data-theme="dark"\] \.ai-refinement-hero/,'Respect the app dark theme.');

console.log('Existing-trip AI refinement has dedicated, accessible creation-free UI — OK');
