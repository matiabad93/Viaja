'use client';
import {useId} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '../ui/select';

export type AppSelectOption={value:string;label:string;disabled?:boolean};
export type AppSelectProps={
 label:string;
 value:string;
 options:AppSelectOption[];
 onChange:(value:string)=>void;
 placeholder?:string;
 disabled?:boolean;
 error?:string;
 id?:string;
 className?:string;
};
export function AppSelect({label,value,options,onChange,placeholder='Seleccionar',disabled=false,error,id,className=''}:AppSelectProps){
 const autoId=useId();
 const fieldId=id||autoId;
 return <div className={'app-field app-select-field '+className}>
   <label id={fieldId+'-label'} className="app-field-label">{label}</label>
   <Select value={value} onValueChange={onChange} disabled={disabled}>
     <SelectTrigger className="app-select-trigger" aria-labelledby={fieldId+'-label'} aria-invalid={!!error} aria-describedby={error?fieldId+'-error':undefined}>
       <SelectValue placeholder={placeholder}/>
     </SelectTrigger>
     <SelectContent position="popper" sideOffset={7} className="app-select-content" align="start">
       {options.map(option=><SelectItem className="app-select-item" value={option.value} disabled={option.disabled} key={option.value}>{option.label}</SelectItem>)}
     </SelectContent>
   </Select>
   {error&&<p id={fieldId+'-error'} role="alert" className="app-field-message">{error}</p>}
 </div>;
}
