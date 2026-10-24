UPDATE google_review_links SET review_knowledge=jsonb_set(coalesce(review_knowledge,'{}'::jsonb),'{policies}',to_jsonb($policies$Write naturally, politely and professionally. Avoid repeating the customer's wording or using the same response every time.
For complaints or mixed feedback, acknowledge the concern and invite the customer to contact the business privately.
Use only this location's verified public business phone, email or website. Never invent contact information.
Never disclose personal information, order details, payment information or private conversations. Do not request these details publicly.
Do not argue, blame the customer or accuse them of posting a fake review.
Do not invent refunds, compensation, investigations, staff actions or promises of a resolution.
Never offer incentives or pressure customers to change or remove a review.
Keep 1–3-star replies as drafts for client approval and manual submission.$policies$::text)),review_knowledge_approved_at=NULL,draft_low_stars=false,settings_version=settings_version+1 WHERE nullif(btrim(review_knowledge->>'policies'),'') IS NULL;
