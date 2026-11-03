'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {parseThemePreference,resolveTheme,themeMetaColor,THEME_STORAGE_KEY,type ThemePreference,type ResolvedTheme} from '../../lib/theme-preference';

type ThemeContextValue={preference:ThemePreference;resolved:ResolvedTheme;setPreference:(value:ThemePreference)=>void};
const ThemeContext=createContext<ThemeContextValue|undefined>(undefined);
function getSystemDark(){return typeof window!=='undefined'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches===true;}
function applyTheme(resolved:ResolvedTheme){
 if(typeof document==='undefined')return;
 const root=document.documentElement;
 root.dataset.theme=resolved;
 root.classList.toggle('dark',resolved==='dark');
 root.style.colorScheme=resolved;
 const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
 if(meta)meta.content=themeMetaColor(resolved);
}
export function ThemeProvider({children}:{children:ReactNode}){
 const [preference,setSavedPreference]=useState<ThemePreference>('system');
 const [systemDark,setSystemDark]=useState(false);
 useEffect(()=>{
  try{setSavedPreference(parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY)))}catch{}
  const query=window.matchMedia?.('(prefers-color-scheme: dark)');
  if(!query)return;
  const changed=()=>setSystemDark(query.matches);
  changed();
  query.addEventListener?.('change',changed);
  const onStorage=(event:StorageEvent)=>{
    if(event.key===THEME_STORAGE_KEY)setSavedPreference(parseThemePreference(event.newValue));
  };
  window.addEventListener('storage',onStorage);
  return()=>{query.removeEventListener?.('change',changed);window.removeEventListener('storage',onStorage)};
 },[]);
 const resolved=resolveTheme(preference,systemDark);
 useEffect(()=>applyTheme(resolved),[resolved]);
 const setPreference=useCallback((next:ThemePreference)=>{
   const safe=parseThemePreference(next);
   setSavedPreference(safe);
   try{window.localStorage.setItem(THEME_STORAGE_KEY,safe)}catch{}
   applyTheme(resolveTheme(safe,getSystemDark()));
 },[]);
 const value=useMemo(()=>({preference,resolved,setPreference}),[preference,resolved,setPreference]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(){
 const value=useContext(ThemeContext);
 if(!value)throw Error('ThemeProvider ausente de la aplicación.');
 return value;
}
