import {handleLocalIssues} from '@/lib/local-issue-http';
export const GET=(request:Request)=>handleLocalIssues(request,'customer');
export const POST=GET;
