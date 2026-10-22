import {describe,it,expect,vi,beforeEach} from 'vitest';
const {identity,db}=vi.hoisted(()=>({identity:vi.fn(),db:vi.fn()}));
vi.mock('@/lib/google-business/http',()=>({googleAdminIdentity:identity}));
vi.mock('@/lib/db',()=>({getSql:db}));
import {handleLocal} from '@/lib/local-management-http';
import {handleHeatmap} from '@/lib/heatmap-http';
import {handleProfile} from '@/lib/google-business/profile-http';
import {handleLocalIssues} from '@/lib/local-issue-http';
import {handleLiveReviews} from '@/lib/google-business/live-http';
import {handleReviewAi} from '@/lib/review-ai-http';
import {handleSampleReply} from '@/lib/review-workspace-http';
import {operationSummary} from '@/lib/admin-client-operations';

beforeEach(()=>{vi.clearAllMocks();identity.mockResolvedValue({owner:'staff@example.com'});});
describe('staff client privacy boundary',()=>{
  for(const [name,handler] of Object.entries({handleLocal,handleHeatmap,handleProfile,handleLocalIssues,handleLiveReviews,handleReviewAi,handleSampleReply})){
    for(const method of ['GET','POST'])it(`${name} denies authenticated staff ${method} before content access`,async()=>{
      const response=await handler(new Request('https://taprater.com/api/admin/local?businessId=private',{method,...(method==='POST'?{body:JSON.stringify({action:'publish',id:'private'})}:{})}),'admin');
      expect(response.status).toBe(403);
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(await response.text()).not.toContain('private@example.com');
      expect(db).not.toHaveBeenCalled();
    });
    it(`${name} requires a staff session`,async()=>{
      identity.mockResolvedValue(null);
      expect((await handler(new Request('https://taprater.com/api/admin/local'),'admin')).status).toBe(401);
    });
  }
  it('allows only operational fields even if the source includes sensitive content',()=>{
    const summary=operationSummary({id:'account-1',account_name:'Norah Boutique',account_status:'active',locations:'2',connected:'1',ai_calls_today:'3',email:'private@example.com',address:'private address',draft:'private draft',keyword:'private keyword',last_error:'token secret',google_subject:'secret',reviews:[{comment:'private'}]});
    expect(summary).toEqual({accountId:'account-1',accountName:'Norah Boutique',status:'active',locations:2,connected:1,syncAttention:0,aiLocations:0,aiCallsToday:3,scansThisMonth:0,scanPointsThisMonth:0});
    expect(JSON.stringify(summary)).not.toMatch(/private|secret/);
  });
});
