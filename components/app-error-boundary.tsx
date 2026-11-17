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
  return <main role="alert" className="experience-crash">
    <section className="experience-crash-card">
     <div className="experience-crash-logo" aria-hidden="true">viaja<span>.</span></div>
     <h1>No pudimos abrir Viaja</h1>
     <p>Ocurrió un error al cargar la aplicación. Tus viajes guardados y tu cuenta no se eliminaron.</p>
     <button className="primary" type="button" onClick={()=>window.location.reload()}>Volver a cargar</button>
     <p className="experience-crash-help">Si vuelve a ocurrir, probá abrir Viaja en una ventana privada y enviá una captura del error.</p>
    </section>
   </main>;
 }
}
