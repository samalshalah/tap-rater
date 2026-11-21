# Neon cost controls

On November 21, 2026, the owner approved background review syncing, scheduled
replies, and support alerts taking up to 10 minutes to lower database costs.
Both application Wrangler configs use `0,10,15,20,30,40,45,50 * * * *`.
The quarter-hour jobs in `custom-worker.ts` still run at 00, 15, 30, and 45.
Do not restore the old every-minute cron during an unrelated deployment.

Dashboard polling in the review operations, worker health, notification, and
pending heat-map panels pauses while the browser tab is hidden. Returning to
the tab refreshes immediately. Visible polling intervals, manual refresh,
server-side job execution, and checkout remain unchanged.

Production Neon capacity and database connections were preserved. Extra archived
Tap Rater branches were removed, leaving 10 branches within the included allowance.
Further savings depend on traffic and how long dashboard tabs remain hidden;
fewer queries do not translate directly to the same percentage off the bill.
