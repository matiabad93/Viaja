import assert from 'node:assert/strict';
import {COMFORT_STORAGE_KEY,parseComfortPreference,comfortLabel} from '../lib/comfort-preference.ts';

assert.equal(COMFORT_STORAGE_KEY,'viaja-comfort-reading');
assert.equal(parseComfortPreference('on'),'on');
for(const value of [undefined,null,'',false,'true','system','off','ON'])assert.equal(parseComfortPreference(value),'off');
assert.match(comfortLabel('on'),/Desactivar/);
assert.match(comfortLabel('off'),/Activar/);
console.log('PASS Etapa 7 · preferencias de lectura cómodas y seguras');
