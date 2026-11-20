import {expect,it} from 'vitest';
import {aiReplyState} from '@/components/account/ai-reply-locations';
it('never shows autopilot for draft-only packages, even when stored flags are on',()=>{
 expect(aiReplyState({reviews_draft_only:true,ai_consent:true,auto_enabled:true,auto_four:true,auto_five:true})).toBe('drafts only');
 expect(aiReplyState({ai_consent:true,auto_enabled:true,auto_four:true,auto_five:true})).toBe('autopilot on · 4–5 stars');
 expect(aiReplyState({reviews_draft_only:true,ai_consent:false})).toBe('off');
});
