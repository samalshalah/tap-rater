import {handleLocalIssues} from '@/lib/local-issue-http';
export const GET=(request:Request)=>handleLocalIssues(request,'admin');
export const POST=GET;
