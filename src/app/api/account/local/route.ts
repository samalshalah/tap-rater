import {handleLocal} from '@/lib/local-management-http';
export const GET=(request:Request)=>handleLocal(request,'customer');
export const POST=(request:Request)=>handleLocal(request,'customer');
