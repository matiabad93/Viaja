'use client';
import {useId,type ReactNode} from 'react';
export function AppField({label,children,hint,error,id,className=''}:{label:string;children:(controlId:string,descriptionId?:string)=>ReactNode;hint?:string;error?:string;id?:string;className?:string}){
 const generated=useId();
 const fieldId=id||generated;
 const descriptionId=hint||error?fieldId+'-message':undefined;
 return <div className={'app-field '+className}>
  <label className="app-field-label" htmlFor={fieldId}>{label}</label>
  {children(fieldId,descriptionId)}
  {error?<p className="app-field-message" id={descriptionId} role="alert">{error}</p>:hint?<p className="app-field-hint" id={descriptionId}>{hint}</p>:null}
 </div>;
}
