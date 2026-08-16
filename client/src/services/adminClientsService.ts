import { apiFetch } from './api';
export type ApiClientType = 'CLIENT' | 'PERSONAL'; export type ApiClientStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export interface ApiClient { id:string; name:string; type:ApiClientType; preview:string; status:ApiClientStatus; permissions:string[]; agentId:string|null; expiresAt:string|null; lastUsedAt:string|null; createdAt:string; updatedAt:string; agent:{id:string;name:string;email:string}|null }
export interface ClientPage { data:ApiClient[]; meta:{page:number;limit:number;total:number;totalPages:number} }
export interface ClientInput { name:string; type:ApiClientType; userId?:string; permissions?:string[]; expiresAt?:string }
const query=(params:Record<string,unknown>)=>{const e=Object.entries(params).filter(([,v])=>v!==undefined&&v!=='');return e.length?`?${e.map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')}`:''};
export const AdminClientsService={
 list:(params:Record<string,unknown>):Promise<ClientPage>=>apiFetch(`/admin/clients${query(params)}`),
 create:(input:ClientInput):Promise<{client:ApiClient;rawToken:string}>=>apiFetch('/admin/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),
 update:(id:string,input:Partial<ClientInput>):Promise<ApiClient>=>apiFetch(`/admin/clients/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),
 regenerate:(id:string):Promise<{client:ApiClient;rawToken:string}>=>apiFetch(`/admin/clients/${id}/regenerate`,{method:'POST'}),
 revoke:(id:string):Promise<ApiClient>=>apiFetch(`/admin/clients/${id}/revoke`,{method:'PATCH'}),
 remove:(id:string):Promise<void>=>apiFetch(`/admin/clients/${id}`,{method:'DELETE'}),
};
