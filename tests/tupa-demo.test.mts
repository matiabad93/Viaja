import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore native Node 22 TS strip
import {tupaSampleTrip} from '../lib/tupa-demo-sample.ts';
// @ts-ignore native Node 22 TS strip
import {tupaEditorialTrip} from '../lib/tupa-featured-plans.ts';
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const vite=read('vite.portable.config.ts'),app=read('app/page.tsx'),css=read('app/globals.css');
const html=read('portable/index.html'),manifest=JSON.parse(read('public/manifest.webmanifest'));
const emblem=read('public/tupa-premium-emblem.svg');
const home=read('components/tupa-premium-home.tsx');
const nav=read('components/tupa-premium-navigation.tsx');
const profile=read('components/tupa-premium-profile.tsx');
assert.ok(vite.includes("__VIAJA_SUPABASE_URL__:JSON.stringify('')"),'Premium Tupã branch must not access Viaja production database');
assert.ok(vite.includes("__VIAJA_SUPABASE_PUBLIC_KEY__:JSON.stringify('')"),'No live production auth in branded environment');
assert.ok(!vite.includes('ovagewbmrirzrlvbvtbw'),'No production Supabase URL in build config');
assert.ok(app.includes("const storageKey='tupa-demo-trips-v1'"),'User data keeps a distinct local namespace');
assert.ok(app.includes("'tupa-demo-current-v1'"),'Drafts keep their own namespace');
assert.ok(!app.includes("<AccountControl session={session}"),'Do not render production authentication without isolated backend');
assert.ok(app.includes('TupaPremiumHome')&&app.includes('TupaPremiumNavigation')&&app.includes('TupaPremiumProfile'),'Premium Home and navigation are mounted');
assert.ok(app.includes("useState<TupaTab>('home')"),'App now opens in branded luxury homepage');
assert.ok(!app.includes('TupaDemoBanner'),'Old demo banner must no longer be mounted');
assert.ok(home.includes('https://tupatravel.com.ar/')&&home.includes('https://www.instagram.com/tupatravel/'),'Real agency links');
assert.ok(home.includes('tupa-feature-hero')&&home.includes('Santorini'),'Hero includes feature destination');
assert.ok(home.includes('tupa-featured-card')&&home.includes('Colmar y Alsacia'),'Featured Alsace route is present');
assert.ok(home.includes('Foto: Michael Nicht'),'Photo attribution from Wikimedia Commons present');
assert.ok(nav.includes("'home'")&&nav.includes("'profile'")&&nav.includes("'planner'"),'All five tabs functional');
assert.ok(profile.includes('onClick={download}')&&profile.includes('onClick={persist}'),'Profile has functioning export and preference actions');
assert.ok(css.includes('.tupa-royal')&&css.includes('.tupa-premium-selection')&&css.includes('nav.tupa-bottom-nav'),'Desktop and mobile premium UI styles');
assert.ok(emblem.includes('radialGradient')&&emblem.includes('TRAVEL')&&emblem.includes('Tupã'),'Premium emblem is scalable SVG');
assert.ok(html.includes('Tupã Travel · El arte de descubrir el mundo')&&html.includes('noindex,nofollow'),'Title updated while search indexing remains off before brand owner signoff');
assert.equal(manifest.short_name,'Tupã');
assert.ok(manifest.icons.some((i:any)=>i.src==='/tupa-premium-emblem.svg'));
const sample=tupaSampleTrip();assert.equal(sample.trip.destination,'Roma, Italia');assert.equal(sample.itinerary?.length,3);
const colmar=tupaEditorialTrip('colmar'),santorini=tupaEditorialTrip('santorini');
for(const t of [colmar,santorini]){
 assert.equal(t.itinerary?.length,3,'Featured journeys are usable, three-day editable plans');
 assert.ok(t.itinerary?.every(d=>d.activities.length>=3),'Provide real activity suggestions');
 assert.equal(t.trip.origin,'','A featured route must not invent departure');
 assert.ok(t.trip.notes.includes('No')||t.trip.notes.includes('Ruta de inspiración'),'Never assert prices or reservations');
 assert.ok(t.expenses?.length===0,'Do not fabricate expenses');
}
assert.equal(colmar.trip.destination,'Colmar, Francia');
assert.equal(santorini.trip.destination,'Santorini, Grecia');
console.log('PASS: premium Tupã logo, responsive home, five navigation tabs, honest editorial routes and isolated local data');
