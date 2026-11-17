import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('app/globals.css');
const reservations=read('components/reservations/reservations-center.tsx');
const journeys=read('components/trips-dashboard.tsx');

const header=css.match(/html\[data-theme\] \.reservation-page-header \{([^}]+)\}/)?.[1];
assert.ok(header?.includes('height:auto'),'Reservation heading must grow with its description (desktop global header is fixed-height)');
assert.ok(reservations.indexOf('reservation-page-header')<reservations.indexOf('reservation-overview'),'Summary cards follow the full heading');
assert.ok(css.includes('.journey-team-slot{display:flex;align-items:center;min-height:44px;'),'Every journey reserves a team badge row');
assert.ok(journeys.includes('<div className="journey-team-slot">{p.collaboration?'),'Show real collaboration metadata only when present');
assert.ok(journeys.indexOf('journey-team-slot')<journeys.indexOf('className="card-budget"'),'Budget always follows the reserved collaboration row');

console.log('PASS layout: reservation description unobstructed and journey collaborator slot alignment');
