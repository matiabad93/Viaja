import {dayAdviceFromAgenda,currentItineraryReport} from './itinerary-narrative.ts';
import {itineraryOf,money,spent,budgetSpent,extraSpent,photo,type Plan,type Activity} from './travel.ts';

// Browser-friendly A4 PDF export. No PDF runtime or server is required.
// The cover can embed a JPEG; every other element is drawn as selectable PDF text/vectors.
const W=595.28,H=841.89,M=48,RIGHT=W-M;
const ink='0.13 0.23 0.20',forest='0.10 0.22 0.18',green='0.17 0.37 0.29';
const orange='0.82 0.48 0.31',muted='0.38 0.45 0.41',pale='0.95 0.97 0.93';
const white='1 1 1',lineColor='0.85 0.89 0.84';
const codes:Record<number,number>={0x2013:150,0x2014:151,0x2018:145,0x2019:146,0x201c:147,0x201d:148,0x2022:149,0x20ac:128,0x2026:133};
const pdfText=(value:string)=>'('+Array.from(value).map(c=>{
 const n=c.codePointAt(0)!,v=n<=255?n:codes[n]??(n>0xffff?32:63);
 return v===40||v===41||v===92?'\\'+String.fromCharCode(v):v<32||v>126?'\\'+v.toString(8).padStart(3,'0'):String.fromCharCode(v);
}).join('')+')';
const approximateWidth=(s:string,size:number,bold=false)=>Array.from(s).reduce((w,c)=>{
 if('ilI.,:;!| '.includes(c))return w+size*.27;
 if('WMÁÉÓÚÑwm'.includes(c))return w+size*.80;
 return w+size*(bold?.57:.53);
},0);
const wrap=(value:string,size:number,maxWidth:number,bold=false)=>{
 const lines:string[]=[];
 for(const raw of String(value||'').split(/\r?\n/)){
  if(!raw.trim()){lines.push('');continue}
  let current='';
  for(const word of raw.trim().split(/\s+/)){
   let part=word;
   while(part&&approximateWidth(part,size,bold)>maxWidth){
    if(current){lines.push(current);current=''}
    let n=1;while(n<part.length&&approximateWidth(part.slice(0,n+1),size,bold)<maxWidth)n++;
    lines.push(part.slice(0,n));part=part.slice(n);
   }
   if(!part)continue;
   if(current&&approximateWidth(current+' '+part,size,bold)>maxWidth){lines.push(current);current=''}
   current=current?current+' '+part:part;
  }
  if(current)lines.push(current);
 }
 return lines;
};
const calendarDate=(value:string)=>{
 if(!value)return 'Fecha por definir';
 const parsed=new Date(value.slice(0,10)+'T12:00:00');
 return Number.isNaN(parsed.valueOf())?value:parsed.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
};
const dayDate=(start:string,i:number)=>{
 if(!start)return '';
 const date=new Date(start.slice(0,10)+'T12:00:00');if(Number.isNaN(date.valueOf()))return '';
 date.setDate(date.getDate()+i);
 return date.toISOString().slice(0,10);
};
const durationLabel=(a:Activity)=>{
 const parts:string[]=[];
 if(a.time)parts.push(a.time+(a.endTime?'–'+a.endTime:''));
 else parts.push('Horario flexible');
 if(a.duration)parts.push(a.duration);
 return parts.join('   ·   ');
};
const ordered=(activities:Activity[])=>[...activities].sort((a,b)=>{
 const ta=/^\d{1,2}:\d{2}$/.test(a.time||'')?a.time!.padStart(5,'0'):'99:99';
 const tb=/^\d{1,2}:\d{2}$/.test(b.time||'')?b.time!.padStart(5,'0'):'99:99';
 return ta.localeCompare(tb);
});
type CoverImage={jpeg:Uint8Array;width:number;height:number};

export function buildTripPdf(plan:Plan,cover?:CoverImage):Uint8Array{
 const pages:string[][]=[[]];let page=pages[0],y=H-86;
 const put=(command:string)=>page.push(command);
 const rect=(x:number,bottom:number,width:number,height:number,color:string)=>put(color+' rg '+x.toFixed(2)+' '+bottom.toFixed(2)+' '+width.toFixed(2)+' '+height.toFixed(2)+' re f');
 const rule=(x1:number,y1:number,x2:number,y2:number,color=lineColor,width=.75)=>put(color+' RG '+width+' w '+x1.toFixed(1)+' '+y1.toFixed(1)+' m '+x2.toFixed(1)+' '+y2.toFixed(1)+' l S');
 const at=(value:string,x:number,baseline:number,size:number,color=ink,bold=false)=>{
  if(!value)return;
  put(color+' rg BT /'+(bold?'F2':'F1')+' '+size.toFixed(1)+' Tf 1 0 0 1 '+x.toFixed(1)+' '+baseline.toFixed(1)+' Tm '+pdfText(value)+' Tj ET');
 };
 const newPage=()=>{page=[];pages.push(page);y=H-86};
 const need=(height:number)=>{if(y-height<76)newPage()};
 const paragraph=(value:string,size=10,opts:{indent?:number;color?:string;bold?:boolean;leading?:number;after?:number;width?:number}={})=>{
  const x=M+(opts.indent||0),leading=opts.leading||size*1.56;
  for(const content of wrap(value,size,opts.width||RIGHT-x,opts.bold)){
   need(leading);if(content)at(content,x,y,size,opts.color||ink,opts.bold||false);
   y-=leading;
  }
  y-=opts.after||0;
 };
 const section=(title:string,kicker?:string)=>{
  need(66);y-=15;
  rect(M,y+5,5,21,orange);at(kicker||'GUÍA DE VIAJE',M+16,y+16,7.8,muted,true);
  at(title,M+16,y-8,19,forest,true);y-=44;
 };
 const smallHeading=(title:string)=>{need(38);at(title,M,y,11.2,green,true);y-=22};
 const kv=(name:string,value:string,after=0)=>{
  if(!value.trim())return;
  need(29);at(name.toUpperCase(),M,y,8,muted,true);
  y-=14;paragraph(value,10,{after:8+after});
 };
 const card=(x:number,bottom:number,width:number,title:string,value:string)=>{
  rect(x,bottom,width,67,pale);rect(x,bottom,width,1.5,'0.77 0.85 0.76');
  at(title.toUpperCase(),x+15,bottom+47,8,muted,true);
  const lines=wrap(value||'—',12,width-30,true);
  lines.slice(0,2).forEach((v,i)=>at(v,x+15,bottom+25-i*15,12,forest,true));
 };
 const trip=plan.trip,days=itineraryOf(plan),expenses=plan.expenses||[];
 const destination=[trip.destination,...(trip.additionalDestinations||[])].filter(Boolean).join(' · ')||'Mi próximo viaje';

 // Cover: destination photo when the browser can read it, with a brand-composed fallback.
 rect(0,0,W,H,forest);
 rect(0,H-18,W,18,orange);
 if(cover){
  const pictureX=0,pictureBottom=H-496,pictureW=W,pictureH=475;
  const scale=Math.max(pictureW/cover.width,pictureH/cover.height);
  const imageW=cover.width*scale,imageH=cover.height*scale;
  put('q '+pictureX+' '+pictureBottom+' '+pictureW+' '+pictureH+' re W n');
  put(imageW.toFixed(2)+' 0 0 '+imageH.toFixed(2)+' '+((pictureW-imageW)/2).toFixed(2)+' '+(pictureBottom+(pictureH-imageH)/2).toFixed(2)+' cm /CoverPhoto Do Q');
  rect(0,H-496,W,57,forest);
  rect(0,H-132,W,110,forest);
 }else{
  put('0.22 0.42 0.34 RG 1.3 w 90 700 m 260 670 360 540 500 520 c S');
  put('0.28 0.48 0.39 RG 2 w 210 455 m 200 550 360 650 500 690 c S');
  rect(W-136,H-320,136,240,'0.17 0.36 0.29');
  rect(W-94,H-310,94,190,'0.22 0.43 0.34');
  rect(0,H-496,W,57,forest);
 }
 at('viaja.',M,H-77,32,white,true);
 at('TU VIAJE, A TU MANERA',M,H-110,9.2,'0.85 0.94 0.85',true);
 rect(M,300,44,4,orange);
 const destLines=wrap(destination,28,W-2*M,true).slice(0,3);
 destLines.forEach((value,i)=>at(value,M,266-i*36,28,white,true));
 at(calendarDate(trip.start)+'  —  '+calendarDate(trip.end),M,136,11,white);
 at(days.length+' días  ·  '+(trip.travelers||1)+' viajeros  ·  '+(trip.transport||'Rutas a tu ritmo'),M,108,10,'0.83 0.92 0.85');
 rule(M,76,RIGHT,76,'0.38 0.54 0.45',.8);
 at('ITINERARIO PERSONAL  ·  GENERADO DESDE VIAJA',M,58,8.4,'0.82 0.89 0.82',true);

 // Trip summary
 newPage();section('Tu viaje de un vistazo','PUNTO DE PARTIDA');
 paragraph(destination,15,{color:forest,bold:true,leading:23,after:13});
 const innerWidth=(RIGHT-M-12)/2;
 need(160);
 card(M,y-68,innerWidth,'Desde',trip.origin||'Por definir');
 card(M+innerWidth+12,y-68,innerWidth,'Fechas',calendarDate(trip.start));
 y-=80;
 card(M,y-68,innerWidth,'Viajeros',String(trip.travelers||1));
 card(M+innerWidth+12,y-68,innerWidth,'Ritmo y transporte',[trip.pace,trip.transport].filter(Boolean).join(' · '));
 y-=95;
 if(trip.notes?.trim()){smallHeading('Notas y preferencias');paragraph(trip.notes,10,{after:6})}
 if(trip.budget>0){
  smallHeading('Presupuesto previsto');
  paragraph('Presupuesto del grupo: '+money(trip.budget)+'   ·   Gastos diarios registrados: '+money(budgetSpent(plan)),10,{after:4});
  paragraph('Vuelos y alojamiento registrados aparte: '+money(extraSpent(plan)),9,{color:muted});
 }
 rect(M,y-70,RIGHT-M,58,pale);
 at('PARA LLEVAR EN EL BOLSILLO',M+15,y-32,8,green,true);
 at('Horarios y precios orientativos. Confirmá reservas antes de viajar.',M+15,y-51,9,muted);
 y-=91;
 need(270);section('Tu itinerario','DÍA A DÍA');

 days.forEach((day,index)=>{
  const date=dayDate(trip.start,index),activities=ordered(day.activities);
  need(185);y-=8;
  rect(M,y-51,RIGHT-M,60,forest);
  rect(M,y-51,7,60,orange);
  at('DÍA '+(index+1)+(date?'   ·   '+calendarDate(date):''),M+20,y-12,10,'0.84 0.92 0.85',true);
  const titleLines=wrap(day.title||'Un día para descubrir',13.4,RIGHT-M-40,true).slice(0,2);
  titleLines.forEach((value,i)=>at(value,M+20,y-34-i*16,13.4,white,true));
  y-=81;
  if(!activities.length){paragraph('Este día todavía no tiene actividades planificadas.',10,{color:muted,after:10})}
  activities.forEach((activity,activityIndex)=>{
   need(85);
   rule(M,y+14,RIGHT,y+14);
   rect(M,y-2,37,18,'0.89 0.94 0.88');
   at(String(activityIndex+1).padStart(2,'0'),M+12,y+3,9,green,true);
   const x=M+51,width=RIGHT-x;
   const titleLines=wrap(activity.title||'Actividad',12.3,width,true);
   titleLines.forEach(value=>{need(19);at(value,x,y+3,12.3,forest,true);y-=18});
   need(17);at(durationLabel(activity),x,y+3,8.7,orange,true);y-=20;
   if(activity.location){paragraph('Lugar: '+activity.location,9.2,{indent:51,color:muted,leading:14,after:1})}
   if(activity.description){paragraph(activity.description,9.4,{indent:51,leading:15.2,after:2})}
   if(activity.price){paragraph('Precio: '+activity.price,9,{indent:51,color:muted,leading:14})}
   else if(activity.estimatedCostEUR!==undefined){paragraph('Coste estimado: '+money(activity.estimatedCostEUR),9,{indent:51,color:muted,leading:14})}
   if(activity.reservation){paragraph('Reserva: '+activity.reservation,8.8,{indent:51,color:muted,leading:14})}
   if(activity.completed){paragraph('Completada',8.6,{indent:51,color:green,bold:true,leading:13})}
   y-=15;
  });
  if(day.activities.length>0){
   need(67);y-=5;rect(M,y-4,4,25,orange);
   at('CÓMO APROVECHAR ESTE DÍA',M+14,y+5,9.2,green,true);y-=21;
   paragraph(dayAdviceFromAgenda(day),9.6,{indent:14,leading:15.5,after:15});
  }
  y-=10;
 });

 need(225);section('Gastos y presupuesto','TUS NÚMEROS');
 need(170);
 card(M,y-68,innerWidth,'Gastos registrados',money(spent(plan)));
 card(M+innerWidth+12,y-68,innerWidth,'Gastos diarios',money(budgetSpent(plan)));
 y-=80;
 card(M,y-68,innerWidth,'Vuelos + alojamiento',money(extraSpent(plan)));
 card(M+innerWidth+12,y-68,innerWidth,'Saldo diario',trip.budget>0?money(trip.budget-budgetSpent(plan)):'Sin presupuesto');
 y-=94;
 if(expenses.length){
  smallHeading('Movimientos registrados');
  expenses.forEach(expense=>{
   need(43);rule(M,y+8,RIGHT,y+8);
   const values=wrap(expense.label||'Gasto',10,RIGHT-M-125,true);
   values.forEach(v=>{need(17);at(v,M,y,10,forest,true);y-=16});
   at(money(expense.amount),RIGHT-115,y+16,10,green,true);
   paragraph((expense.date||'Fecha por definir')+'   ·   '+(expense.category||'Sin categoría'),8.6,{color:muted,leading:14,after:5});
  });
 }else paragraph('Todavía no hay gastos registrados.',10,{color:muted});

 if(plan.logistics?.accommodations.length||plan.logistics?.transports.length){
  section('Reservas y traslados','LOGÍSTICA');
  for(const accommodation of plan.logistics?.accommodations||[]){
   need(70);smallHeading('Alojamiento · '+accommodation.name);
   paragraph([accommodation.address,accommodation.city].filter(Boolean).join(', '),9.5);
   paragraph(calendarDate(accommodation.checkIn)+'  –  '+calendarDate(accommodation.checkOut),9.5,{color:muted,after:8});
  }
  for(const transport of plan.logistics?.transports||[]){
   need(70);smallHeading('Traslado · '+transport.origin+' - '+transport.destination);
   paragraph([transport.company,transport.serviceNumber].filter(Boolean).join(' · '),9.5);
   paragraph('Salida: '+(transport.departureAt||'Por confirmar')+'   ·   Llegada: '+(transport.arrivalAt||'Por confirmar'),9.2,{color:muted,after:8});
  }
 }
 if(plan.parts?.length){
  section('Ideas y recomendaciones','INFORME');
  paragraph(currentItineraryReport(plan),9.2,{leading:15.4,after:13})
 }
 if(plan.sources?.length||trip.links?.trim()){
  need(125);section('Fuentes y enlaces','PARA CONSULTAR');
  for(const source of plan.sources||[]){
   need(32);paragraph(source.title||'Fuente',9.8,{bold:true,leading:14});
   paragraph(source.url||'',8.6,{color:muted,leading:13,after:7});
  }
  if(trip.links?.trim())paragraph(trip.links,8.8,{color:muted,after:8});
 }
 section('Antes de salir','RECORDATORIO');
 paragraph('Los itinerarios y costes son orientativos y pueden cambiar. Verificá aperturas, frecuencia de transporte y reservas con sus proveedores oficiales.',9.6,{leading:16});

 // Page furniture and PDF object graph.
 const objects:string[]=[];const object=(value:string)=>{objects.push(value);return objects.length};
 const f1=object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 const f2=object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 let imageId=0;
 if(cover){
  let jpg='';for(let i=0;i<cover.jpeg.length;i+=8192)jpg+=String.fromCharCode(...cover.jpeg.subarray(i,i+8192));
  imageId=object('<< /Type /XObject /Subtype /Image /Width '+cover.width+' /Height '+cover.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+cover.jpeg.length+' >>\nstream\n'+jpg+'\nendstream');
 }
 const pageParent=object(''),pageIds:number[]=[];
 pages.forEach((commands,index)=>{
  if(index>0){
   rectOn(commands,M,H-49,RIGHT-M,2,orange);
   commands.push(muted+' rg BT /F2 8.4 Tf 1 0 0 1 '+M+' '+(H-65).toFixed(1)+' Tm '+pdfText('VIAJA  /  '+destination.slice(0,65))+' Tj ET');
   commands.push(lineColor+' RG .8 w '+M+' 51 m '+RIGHT+' 51 l S');
   commands.push(muted+' rg BT /F1 8 Tf 1 0 0 1 '+M+' 35 Tm '+pdfText('Viaja · Tu itinerario personal')+' Tj ET');
   commands.push(muted+' rg BT /F1 8 Tf 1 0 0 1 493 35 Tm '+pdfText((index+1)+' / '+pages.length)+' Tj ET');
  }
  const data=commands.join('\n')+'\n';
  const contentId=object('<< /Length '+data.length+' >>\nstream\n'+data+'endstream');
  const resources='<< /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >>'+(imageId?' /XObject << /CoverPhoto '+imageId+' 0 R >>':'')+' >>';
  pageIds.push(object('<< /Type /Page /Parent '+pageParent+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources '+resources+' /Contents '+contentId+' 0 R >>'));
 });
 objects[pageParent-1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pages.length+' >>';
 const catalog=object('<< /Type /Catalog /Pages '+pageParent+' 0 R >>');
 let pdf='%PDF-1.4\n',offsets=[0];
 objects.forEach((value,index)=>{offsets.push(pdf.length);pdf+=(index+1)+' 0 obj\n'+value+'\nendobj\n'});
 const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(let index=1;index<offsets.length;index++)pdf+=String(offsets[index]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return Uint8Array.from(pdf,c=>c.charCodeAt(0));
}
function rectOn(page:string[],x:number,y:number,width:number,height:number,color:string){
 page.push(color+' rg '+x.toFixed(1)+' '+y.toFixed(1)+' '+width.toFixed(1)+' '+height.toFixed(1)+' re f');
}
const pdfFilename=(plan:Plan)=>'viaja-'+(plan.trip.destination||'mi-viaje').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)+'.pdf';
async function coverPhoto(plan:Plan):Promise<CoverImage|undefined>{
 if(typeof document==='undefined')return undefined;
 const src=plan.photos?.find(item=>item.url)?.url||photo(plan.trip.destination);
 if(!src)return undefined;
 return new Promise(resolve=>{
  const image=new Image();let finished=false;
  const finish=(value?:CoverImage)=>{if(finished)return;finished=true;clearTimeout(timeout);resolve(value)};
  const timeout=setTimeout(()=>finish(),3000);
  image.crossOrigin='anonymous';
  image.onload=()=>{
   try{
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
    const context=canvas.getContext('2d');if(!context){finish();return}
    const scale=Math.max(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    context.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    const encoded=atob(canvas.toDataURL('image/jpeg',.72).split(',')[1]);
    if(encoded.length>3000000){finish();return}
    finish({jpeg:Uint8Array.from(encoded,c=>c.charCodeAt(0)),width:canvas.width,height:canvas.height});
   }catch{finish()}
  };
  image.onerror=()=>finish();
  image.src=src;
 });
}
async function fileBytes(plan:Plan){return buildTripPdf(plan,await coverPhoto(plan))}
export async function downloadTripPdf(plan:Plan):Promise<void>{
 const bytes=await fileBytes(plan),blob=new Blob([bytes as BlobPart],{type:'application/pdf'}),url=URL.createObjectURL(blob);
 const anchor=document.createElement('a');anchor.href=url;anchor.download=pdfFilename(plan);
 document.body.appendChild(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function shareTripPdf(plan:Plan):Promise<'shared'|'unsupported'|'cancelled'>{
 if(typeof navigator==='undefined'||typeof navigator.share!=='function'||typeof navigator.canShare!=='function')return 'unsupported';
 // Native sharing needs the user's click activation; avoid awaiting a photo fetch first.
 const bytes=buildTripPdf(plan);
 const file=new File([bytes as BlobPart],pdfFilename(plan),{type:'application/pdf'});
 if(!navigator.canShare({files:[file]}))return 'unsupported';
 try{
  await navigator.share({files:[file],title:'Mi viaje a '+plan.trip.destination,text:'Te comparto mi itinerario de Viaja.'});
  return 'shared';
 }catch(error){
  if(error instanceof DOMException&&error.name==='AbortError')return 'cancelled';
  throw error;
 }
}
