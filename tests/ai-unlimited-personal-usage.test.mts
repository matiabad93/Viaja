import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(
 new URL('../supabase/migrations/202611200002_remove_personal_ai_daily_limit.sql',import.meta.url),'utf8'
);
const gateway=readFileSync(new URL('../server/ai-gateway.ts',import.meta.url),'utf8');

assert.match(migration,/create or replace function public\.viaja_reserve_ai_request/);
assert.doesNotMatch(migration,/\buser_count\b|user_daily_limit|remaining_user_today|>=10/);
assert.match(migration,/global_count>=40/,'The global cost safeguard must remain.');
assert.match(migration,/active_count>0/,'Concurrent requests from the same user must remain blocked.');
assert.match(migration,/revoke all on function public\.viaja_reserve_ai_request\(uuid,uuid\) from public,anon,authenticated/);
assert.match(migration,/grant execute on function public\.viaja_reserve_ai_request\(uuid,uuid\) to service_role/);
assert.doesNotMatch(gateway,/Alcanzaste las 10 generaciones/);
assert.match(gateway,/admission\?\.reason==='global_daily_limit'/);

console.log('AI daily personal cap removed; global safety and request concurrency remain.');
