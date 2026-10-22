import {handleProfile} from '@/lib/google-business/profile-http';
export const GET=(request:Request)=>handleProfile(request,'customer');
export const POST=GET;
