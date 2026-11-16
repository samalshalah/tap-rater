export const qaDatabaseHost='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech';
export const norahLocation='locations/5830068545182110566';
export const norahTitle='Norah Boutique';
export type GoogleQaReadScope={accounts:ReadonlySet<string>;reviewAccount?:string};
export function allowedGoogleQaRequest(url:URL,method:string,databaseApi:string,scope:GoogleQaReadScope={accounts:new Set()}){
 if(url.protocol!=='https:'||url.username||url.password)return false;
 if(url.hostname===databaseApi)return method==='POST'&&url.pathname==='/sql';
 if(url.hostname==='oauth2.googleapis.com')return method==='POST'&&url.pathname==='/token';
 if(method!=='GET')return false;
 if(url.hostname==='openidconnect.googleapis.com'&&url.pathname==='/v1/userinfo')return true;
 if(url.hostname==='mybusinessaccountmanagement.googleapis.com'&&url.pathname==='/v1/accounts'){
  const parent=url.searchParams.get('parentAccount');
  return !parent||scope.accounts.has(parent);
 }
 if(url.hostname==='mybusinessbusinessinformation.googleapis.com'){
  const match=/^\/v1\/(accounts\/[A-Za-z0-9_-]+)\/locations$/.exec(url.pathname);
  return Boolean(match&&scope.accounts.has(match[1]));
 }
 return Boolean(scope.reviewAccount&&scope.accounts.has(scope.reviewAccount)&&url.hostname==='mybusiness.googleapis.com'&&url.pathname===`/v4/${scope.reviewAccount}/${norahLocation}/reviews`);
}
