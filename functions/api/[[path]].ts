import {destinationsAPI} from '../../server/destinations';
export const onRequest: PagesFunction = async ({request}) => {
 const p=new URL(request.url).pathname;
 // Public demo: never trust client-supplied identity headers or expose a paid AI endpoint.
 if(p==='/api/status')return Response.json({ready:false,admin:false,restricted:true,demo:true});
 if(p==='/api/plan')return Response.json({error:'La generación con IA no está habilitada en esta demo pública. Podés crear un viaje o utilizar una guía de ejemplo.'},{status:503});
 return await destinationsAPI(request) || Response.json({error:'No encontrado'},{status:404});
};
