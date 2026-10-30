import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
import {localIssueSnapshot} from '@/lib/local-issues';
import {activeReviewWorkerAlerts} from '@/lib/review-worker-alerts';
import {customerNavigationLocations} from '@/lib/customer-navigation-locations';
import {accountBusinesses} from '@/lib/account-business-drafts';

it.skipIf(process.env.PREVIEW_SERVICE_REGRESSION!=='true')('handles actual removed-location records in the isolated preview database',async()=>{
 const line=readFileSync('.env.local','utf8').split(/\r?\n/).find(line=>line.startsWith('DATABASE_URL='));
 const url=line?.slice('DATABASE_URL='.length).replace(/^['"]|['"]$/g,'')||'';
 if(new URL(url).hostname!=='ep-mute-field-ate5ncyk-pooler.c-9.us-east-1.aws.neon.tech')throw Error('Isolated preview only');
 const sql=neon(url);
 const [owner]=await sql`SELECT c.email,count(*)::int AS removed FROM customers c JOIN businesses b ON b.customer_id=c.id WHERE b.status='marketing_removed' GROUP BY c.email HAVING count(*)=8`;
 expect(owner).toBeDefined();
 expect(await customerNavigationLocations(owner.email,sql)).toEqual([]);
 const records=await accountBusinesses(owner.email,null,sql);
 expect(records.filter(r=>r.marketingRemoved)).toHaveLength(8);
 const snapshot=await localIssueSnapshot({kind:'customer',email:owner.email},undefined,sql);
 expect(snapshot.locations).toEqual([]);expect(snapshot.issues).toEqual([]);expect(snapshot.errors).toEqual([]);
 const alerts=await activeReviewWorkerAlerts(sql);
 const removedIds=new Set(records.filter(r=>r.marketingRemoved).map(r=>r.id));
 expect(alerts.filter(a=>removedIds.has(a.business_id)&&a.stage!=='publish')).toEqual([]);
},30000);
