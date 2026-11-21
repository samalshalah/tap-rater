import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {scheduleStrandedReplies} from '@/lib/google-business/live-review-core';

it('queues 4-5 star autopilot drafts that were written while posting was blocked',async()=>{
 const sql=vi.fn().mockResolvedValue([{id:'r1'}]);
 await scheduleStrandedReplies(sql as never,50);
 const [strings,...values]=sql.mock.calls[0];
 const text=strings.join('?');
 expect(text).toContain("s.scheduled_at IS NULL AND s.publish_state='idle' AND s.draft<>''");
 expect(text).toContain('NOT s.auto_schedule_cancelled');
 expect(text).toContain('NOT EXISTS(SELECT 1 FROM reviews_draft_only_customers policy');
 expect(text).toContain('l.auto_enabled');
 expect(text).toContain("(r.data->>'starRating'='FOUR' AND l.auto_four) OR (r.data->>'starRating'='FIVE' AND l.auto_five)");
 expect(text).toContain('r.old_reply_requested_at IS NOT NULL OR NULLIF');
 // Only the old drafts-only block is cleared; any real Google posting error stays unscheduled.
 expect(text).toContain('s.last_publish_error IS NULL OR s.last_publish_error LIKE ?');
 expect(values).toContain('This package includes imports and drafts only.%');
 expect(values).toContain(50);
});

it('runs the stranded-draft scheduler from the review worker',()=>{
 const worker=readFileSync('src/lib/google-business/live-review-automation.ts','utf8');
 expect(worker).toMatch(/getUTCMinutes\(\)%5===0\)\{try\{await scheduleStrandedReplies\(sql\);/);
});

it('adds the drafts-only policy only when a subscription is first linked, not on later Stripe updates',()=>{
 const sync=readFileSync('src/lib/marketing-subscriptions.ts','utf8');
 expect(sync).toMatch(/INSERT INTO reviews_draft_only_customers[\s\S]{0,400}AND NOT EXISTS\(SELECT 1 FROM marketing_subscriptions m WHERE[\s\S]{0,160}m\.stripe_subscription_id=\$\{id\}\)/);
});
