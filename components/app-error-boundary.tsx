'use client';
import React from 'react';

type State={broken:boolean};
export class AppErrorBoundary extends React.Component<React.PropsWithChildren,State>{
 state:State={broken:false};
 static getDerivedStateFromError():State{return {broken:true}}
 componentDidCatch(error:Error,details:React.ErrorInfo){
  // Keep private user content and session tokens out of logs.
  console.error('Viaja: error al iniciar la interfaz',error.name,details.componentStack?.slice(0,300));
 }
 render(){
  if(!this.state.broken)return this.props.children;
  return <main role="alert" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f7f8f3',padding:24,fontFamily:'Arial,sans-serif',color:'#173f35'}}>
   <section style={{width:'min(470px,100%)',background:'#fff',padding:32,border:'1px solid #dce5dd',borderRadius:20,boxShadow:'0 14px 35px rgba(0,0,0,.08)'}}>
    <div style={{fontFamily:'Georgia,serif',fontWeight:'bold',fontSize:32,marginBottom:24}}>viaja<span style={{color:'#d77a53'}}>.</span></div>
    <h1 style={{fontSize:24,margin:'0 0 10px'}}>No pudimos abrir Viaja</h1>
    <p style={{fontSize:15,lineHeight:1.6}}>Ocurrió un error al cargar la aplicación. Tus viajes guardados y tu cuenta no se eliminaron.</p>
    <button type="button" onClick={()=>window.location.reload()} style={{display:'block',width:'100%',marginTop:24,padding:'13px',borderRadius:10,background:'#194b3d',color:'#fff',fontWeight:700,border:0,cursor:'pointer'}}>Volver a cargar</button>
    <p style={{fontSize:12,marginTop:15,color:'#64766b'}}>Si vuelve a ocurrir, probá abrir Viaja en una ventana privada y enviá una captura del mensaje de error.</p>
   </section>
  </main>;
 }
}
