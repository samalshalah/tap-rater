export const qaDatabaseHost='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech';
export const norahAccount='accounts/110246797111938949016';
export const norahLocation='locations/5830068545182110566';
export function allowedGoogleQaRequest(url:URL,method:string,databaseApi:string){
 if(url.protocol!=='https:'||url.username||url.password)return false;
 if(url.hostname===databaseApi)return method==='POST'&&url.pathname==='/sql';
 if(url.hostname==='oauth2.googleapis.com')return method==='POST'&&url.pathname==='/token';
 if(method!=='GET')return false;
 return (url.hostname==='openidconnect.googleapis.com'&&url.pathname==='/v1/userinfo')||
  (url.hostname==='mybusinessbusinessinformation.googleapis.com'&&url.pathname===`/v1/${norahAccount}/locations`)||
  (url.hostname==='mybusiness.googleapis.com'&&url.pathname===`/v4/${norahAccount}/${norahLocation}/reviews`);
}
