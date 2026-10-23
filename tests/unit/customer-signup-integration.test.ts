import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect} from 'vitest';
import {activateCustomerAccountWithClient,createCustomerActivationToken} from '@/lib/customer-account';
import {createNeonSupabaseAdapterFromUrl} from '@/lib/neon-supabase-adapter';
describe.skipIf(!process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL)('isolated new-customer activation',()=>{
 it('activates once, verifies email and leaves marketing access locked',async()=>{
  const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL!;
  if(!new URL(url).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Isolated staging database required');
  const sql=neon(url),token=createCustomerActivationToken(),email=`activation-${randomUUID()}@example.test`;
  const [c]=await sql`INSERT INTO customers(email,account_status,activation_token_hash,activation_expires_at) VALUES(${email},'pending_activation',${token.tokenHash},now()+interval '7 days') RETURNING id`;
  try{
   const adapter=createNeonSupabaseAdapterFromUrl(url);
   const result=await activateCustomerAccountWithClient(adapter,token.token,randomUUID());
   expect(result).toEqual({ok:true,email});
   const [row]=await sql`SELECT account_status,email_verified_at IS NOT NULL AS verified,activation_token_hash IS NULL AS cleared,password_hash IS NOT NULL AS password_set FROM customers WHERE id=${c.id}`;
   expect(row).toEqual({account_status:'active',verified:true,cleared:true,password_set:true});
   expect(await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${c.id}`).toHaveLength(0);
   expect(await activateCustomerAccountWithClient(adapter,token.token,randomUUID())).toMatchObject({ok:false,status:401});
  }finally{await sql`DELETE FROM customers WHERE id=${c.id}`;}
 },30000);
});
