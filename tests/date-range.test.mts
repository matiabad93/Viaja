import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
// @ts-ignore Node native TypeScript stripping.
import {calendarDays,isoFromDate,normalizeTripDates,formattedDate,validDate} from '../lib/date-range.ts';
assert.deepEqual(normalizeTripDates('2026-11-08','2026-11-07'),{start:'2026-11-08',end:''});
assert.deepEqual(normalizeTripDates('2026-11-08','2026-11-08'),{start:'2026-11-08',end:'2026-11-08'});
assert.deepEqual(normalizeTripDates('2026-11-08','2026-11-10'),{start:'2026-11-08',end:'2026-11-10'});
assert.equal(isoFromDate(new Date(2026,10,8,12)),'2026-11-08');
const days=calendarDays(2026,10);
assert.equal(days.length,42);
assert.equal(days[0],'2026-10-26');
assert.ok(days.includes('2026-11-08'));
assert.equal(validDate('2026-11-08'),true);
assert.equal(validDate('not a date'),false);
assert.match(formattedDate('2026-11-08'),/nov/i);
const styles=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
assert.ok(styles.includes('.calendar-day.other-month:not(:disabled){color:inherit;opacity:1}'),'Adjacent month selectable days must not look disabled');
console.log('Date range calendar: date comparisons, month grid, local timestamps and labels — OK');
