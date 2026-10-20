import {handleLiveReviews} from '@/lib/google-business/live-http';
export const GET=(request:Request)=>handleLiveReviews(request,'admin');
export const POST=(request:Request)=>handleLiveReviews(request,'admin');
