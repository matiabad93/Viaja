'use client';
import {forwardRef,type InputHTMLAttributes} from 'react';
export const AppInput=forwardRef<HTMLInputElement,InputHTMLAttributes<HTMLInputElement>>(function AppInput({className='',...props},ref){
 return <input {...props} ref={ref} className={'app-input '+className}/>;
});
