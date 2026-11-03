/** Private co-editing API. Public catalogue is a separate workflow. */
import {db} from './supabase-client';
import type {Plan} from './travel';

export type TripRole='owner'|'editor'|'viewer';
export type TripMember={trip_id:string;user_id:string;role:'editor'|'viewer';joined_at:string};
export type TripInvite={id:string;invite_email:string|null;role:'editor'|'viewer';expires_at:string;accepted_at:string|null;revoked_at:string|null};
const uuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id);

export async function listTripMembers(tripId:string):Promise<TripMember[]>{
 if(!uuid(tripId))throw Error('Viaje inválido.');
 const rows=await db<TripMember[]>('trip_members?select=trip_id,user_id,role,joined_at&trip_id=eq.'+encodeURIComponent(tripId)+'&order=joined_at.asc&limit=50');
 return Array.isArray(rows)?rows:[];
}
export async function listTripInvites(tripId:string):Promise<TripInvite[]>{
 const list=await db<TripInvite[]>('rpc/viaja_list_trip_invitations',{method:'POST',body:JSON.stringify({p_trip_id:tripId})});
 return Array.isArray(list)?list:[];
}
export async function createTripInvite(tripId:string,role:'editor'|'viewer',email:string|null):Promise<string>{
 const token=await db<string>('rpc/viaja_create_trip_invite',{method:'POST',body:JSON.stringify({p_trip_id:tripId,p_role:role,p_email:email||null})});
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('No pudimos crear la invitación.');
 return token;
}
export async function acceptTripInvite(token:string):Promise<string>{
 if(!/^[a-f0-9]{64}$/.test(token))throw Error('El enlace de invitación es inválido.');
 const id=await db<string>('rpc/viaja_accept_trip_invite',{method:'POST',body:JSON.stringify({p_token:token})});
 if(!uuid(id))throw Error('No se pudo aceptar la invitación.');
 return id;
}
export async function revokeTripInvite(id:string):Promise<boolean>{
 return db<boolean>('rpc/viaja_revoke_trip_invite',{method:'POST',body:JSON.stringify({p_invite_id:id})});
}
export async function removeTripMember(tripId:string,userId:string):Promise<boolean>{
 return db<boolean>('rpc/viaja_remove_trip_member',{method:'POST',body:JSON.stringify({p_trip_id:tripId,p_user_id:userId})});
}
export async function fetchTripUpdate(tripId:string):Promise<Plan|null>{
 const rows=await db<{user_id:string;version:number;document:Plan}[]>('trips?select=user_id,version,document&id=eq.'+encodeURIComponent(tripId)+'&limit=1');
 if(!Array.isArray(rows)||!rows[0]?.document?.trip)return null;
 const row=rows[0];
 return {...row.document,collaboration:{ownerId:row.user_id,version:row.version,role:row.user_id===((await import('./supabase-client')).getCurrentSession()?.user.id)?'owner':'viewer'}};
}
