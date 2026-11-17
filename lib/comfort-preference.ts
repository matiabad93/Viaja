/** Lectura cómoda es una preferencia local, no un dato de la cuenta. */
export const COMFORT_STORAGE_KEY='viaja-comfort-reading';
export type ComfortPreference='on'|'off';
export function parseComfortPreference(value:unknown):ComfortPreference{
 return value==='on'?'on':'off';
}
export function comfortLabel(value:ComfortPreference){
 return value==='on'?'Desactivar lectura cómoda':'Activar lectura cómoda';
}
