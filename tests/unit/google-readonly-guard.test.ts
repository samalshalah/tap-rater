import {it,expect} from 'vitest';
import {allowedGoogleQaRequest,norahAccount,norahLocation} from '../fixtures/reviews-launch/google-readonly-guard';
it('allows selected-location reads and token exchange, blocking writes, other locations and revocation',()=>{
 const allowed=(url:string,method='GET')=>allowedGoogleQaRequest(new URL(url),method,'qa-api.example');
 const reviews=`https://mybusiness.googleapis.com/v4/${norahAccount}/${norahLocation}/reviews`;
 expect(allowed(reviews)).toBe(true);
 expect(allowed(reviews+'?pageToken=next')).toBe(true);
 for(const method of ['POST','PUT','PATCH','DELETE'])expect(allowed(reviews,method)).toBe(false);
 expect(allowed(reviews+'/123/reply','PUT')).toBe(false);
 expect(allowed(reviews.replace(norahLocation,'locations/another'))).toBe(false);
 expect(allowed('https://oauth2.googleapis.com/token','POST')).toBe(true);
 expect(allowed('https://oauth2.googleapis.com/revoke','POST')).toBe(false);
 expect(allowed('https://taprater.com/api/admin/google-business/callback')).toBe(false);
 expect(allowed('http://qa-api.example/sql','POST')).toBe(false);
});
