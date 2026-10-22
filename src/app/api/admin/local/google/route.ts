import {handleProfile} from '@/lib/google-business/profile-http';
export const GET=(request:Request)=>handleProfile(request,'admin');
export const POST=GET;
