import {beforeEach,expect,it,vi} from 'vitest';
import {reviewKnowledgeSchema} from '@/lib/review-knowledge-data';
const m=vi.hoisted(()=>({preferences:{} as Record<string,unknown>}));
vi.mock('@/lib/review-knowledge',()=>({replyKnowledgeContext:async()=>({recentReplies:[],googleFacts:null,preferences:m.preferences})}));
import {generateAutomaticReviewReply,withSignOff} from '@/lib/review-ai-provider';
const meter={businessId:'b',customerId:'c',service:'review_automatic'} as never;
const good='Great to have you in for that fade with Haidar. We hope to see you back in the chair before long.';
const run=()=>vi.fn().mockResolvedValue({response:JSON.stringify({reply:good})});
beforeEach(()=>{m.preferences={...reviewKnowledgeSchema.parse({}),style:'friendly'};});

it('defaults keep existing saved preferences valid',()=>{
 expect(reviewKnowledgeSchema.parse({})).toMatchObject({team:'',signOff:'',greetByName:true});
 expect(reviewKnowledgeSchema.parse({policies:'x',contact:'y'}).greetByName).toBe(true);
});
it('adds the sign-off on its own line, and never to an empty draft',()=>{
 expect(withSignOff('Hello there.','— Haidar & the team')).toBe('Hello there.\n\n— Haidar & the team');
 expect(withSignOff('','— Haidar')).toBe('');
 expect(withSignOff('Hello.','')).toBe('Hello.');
});
it('appends the sign-off to automatic replies and does not show it to the model',async()=>{
 m.preferences={...m.preferences,signOff:'— Haidar & the University Barber team',team:'Haidar – senior barber'};
 const r=run();
 expect(await generateAutomaticReviewReply('Shop',5,'Haidar gave me a great fade','friendly',r,meter,'Omar')).toBe(good+'\n\n— Haidar & the University Barber team');
 const sent=JSON.parse(r.mock.calls[0][1].messages[1].content);
 expect(sent.knowledge.preferences.signOff).toBeUndefined();
 expect(sent.knowledge.preferences.team).toBe('Haidar – senior barber');
 expect(sent.reviewerFirstName).toBe('Omar');
});
it('leaves out the reviewer name when greeting by name is turned off',async()=>{
 m.preferences={...m.preferences,greetByName:false};
 const r=run();
 await generateAutomaticReviewReply('Shop',5,'Haidar gave me a great fade','friendly',r,meter,'Omar');
 expect(JSON.parse(r.mock.calls[0][1].messages[1].content).reviewerFirstName).toBeUndefined();
});
it('hides the team list when business knowledge is turned off',async()=>{
 m.preferences={...m.preferences,enabled:false,team:'Haidar – senior barber'};
 const r=run();
 await generateAutomaticReviewReply('Shop',5,'Haidar gave me a great fade','friendly',r,meter);
 expect(JSON.parse(r.mock.calls[0][1].messages[1].content).knowledge.preferences.team).toBeUndefined();
});
