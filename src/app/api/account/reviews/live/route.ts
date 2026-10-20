import {handleLiveReviews} from '@/lib/google-business/live-http';
export const GET=(request:Request)=>handleLiveReviews(request,'customer');
export const POST=(request:Request)=>handleLiveReviews(request,'customer');
