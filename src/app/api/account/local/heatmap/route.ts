import {handleHeatmap} from '@/lib/heatmap-http';
export const GET=(request:Request)=>handleHeatmap(request,'customer');
export const POST=GET;
