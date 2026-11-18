import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Keep the empty-state journey focused on one primary action. Once the user
// has trips, the heading CTA remains available alongside the trip cards.
const source=readFileSync('components/trips-dashboard.tsx','utf8');
assert.match(source,/\{plans\.length>0&&<button className="primary" onClick=\{onNew\}>/,
  'The header Create trip CTA must be shown only if trips already exist');
assert.match(source,/action=\{\{label:plans\.length\?'Mostrar todos mis viajes':'Planificar mi primer viaje',onClick:plans\.length\?clearFilters:onNew\}\}/,
  'The empty-state card must keep its contextual plan-first-trip CTA');
assert.match(source,/\{plans\.length>0&&<><div className="journey-toolbar/,
  'Search and filtering controls remain hidden until there are saved trips');
console.log('PASS: empty journeys show one relevant creation CTA; filled journeys preserve Create trip');
