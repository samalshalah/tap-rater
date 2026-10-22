import {handleHeatmap} from '@/lib/heatmap-http';
export const GET=(request:Request)=>handleHeatmap(request,'admin');
export const POST=GET;
