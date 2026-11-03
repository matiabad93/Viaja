/** Theme storage and system preference helpers: browser-safe and SSR-safe. */
export type ThemePreference='light'|'dark'|'system';
export type ResolvedTheme='light'|'dark';
export const THEME_STORAGE_KEY='viaja-theme';
export function parseThemePreference(value:unknown):ThemePreference {
 return value==='light'||value==='dark'||value==='system'?value:'system';
}
export function resolveTheme(preference:ThemePreference,systemDark:boolean):ResolvedTheme {
 return preference==='system'?(systemDark?'dark':'light'):preference;
}
export function themeMetaColor(theme:ResolvedTheme):string {
 return theme==='dark'?'#101816':'#f7f8f4';
}
