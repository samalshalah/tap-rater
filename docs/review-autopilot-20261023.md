# Review autopilot and overview — October 23, 2026

This release supersedes the earlier draft-only review restrictions. The owner authorized client opt-in automatic publication for new selected 4/5-star reviews, and explicit manual submission for 1–3 stars. No test replies are published.

- Global review publishing is available; existing location autopilot settings remain off. A client must confirm public posting when enabling a rating.
- 1–3-star reviews always remain drafts until the client explicitly submits the saved reply. Spam flags block suggestions, approval and publishing locally; they do not file a Google spam report.
- Historical reviews and existing replies/drafts are excluded from automatic publication. Version checks prevent overwriting edits; uncertain results require reconciliation, never automatic retries.
- Google profile AI is separately off by default. When enabled it prepares one eligible profile improvement draft per scheduled run within existing AI allowances. It never publishes profile changes. Switching off invalidates in-flight automatic saves.
- Apply docs/sql/google-profile-agent.sql before release. It adds one default-false setting to existing location links.
- Overview shows monthly review growth, weighted average rating, total, review switches and draft counts, profile agent switch, imported profile completeness, and keyword-specific saved heatmap/competitor summaries. No scan is triggered by these summaries.
- Live publishing must be verified by a client-approved real submission; automated tests use mocked Google clients. Do not claim a real Google write was tested.
