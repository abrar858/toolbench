# ToolsBravo feedback rollout checklist

Project: `egypshduxktdyubwiaoo` (London, Supabase Free). Branch: `feature/tool-feedback-20261118`.

## What is deployed
- Private `public.tool_feedback` table, `public.feedback_admins` allowlist and `public.feedback_rate_limits`.
- RLS: no anonymous direct database access; only users explicitly added to `feedback_admins` can read feedback or update status.
- Supabase Edge Function `submit-feedback` accepts anonymous browser submissions from ToolsBravo origins. Backend validation and rate limits are present.
- Draft `admin/feedback.html` uses Supabase Auth password login and the publishable key only. No secret key is in the repository.
- `assets/feedback.js` and generated-page template integration in `scripts/build.mjs`.

## Before approving the PR
1. Run `node scripts/build.mjs` and `node scripts/build.mjs --check`; commit regenerated tool HTML pages. Do not edit generated tool pages directly.
2. Verify a generated tool page contains the correct `data-feedback-widget` slug and loads `assets/feedback.js`.
3. Create an admin account in Supabase Auth (Dashboard → Authentication → Users). Verify ownership of the email address. Obtain the user's UUID.
4. Grant that exact UUID access with `insert into public.feedback_admins(user_id) values ('<verified-user-uuid>');` using a privileged SQL session. Do not add arbitrary accounts or use email matching in RLS.
5. Test unauthenticated access is denied, authorised login works, admin status changes persist, pagination and CSV exports work.
6. Test valid and invalid anonymous feedback submissions, CORS, spam/rate limits, browser network failures, keyboard navigation and mobile layouts. Review anti-abuse protections before a public launch (IP header spoofing and free-tier usage risk).
7. Update the privacy notice and site claims: feedback text and submission metadata are sent to Supabase; tool files and calculator inputs remain local. Explain retention, moderation and contact mechanism.
8. Decide a retention/deletion policy and arrange periodic encrypted database exports because Supabase Free has no automatic database backups.
9. Run security advisors and CI checks; only then mark PR ready for review and merge intentionally.

## Known limitations
- No administrator is enrolled yet. The dashboard will correctly refuse access.
- This draft has not passed end-to-end browser tests.
- Only the currently visible page of 25 rows is exported as CSV.
- The static site must be rebuilt to include the widget on each tool page.
- A pending review is private; public display of approved reviews is not implemented.
- No claim is made that email alerts, screenshots, or automated backup are implemented.

Release gate: the generated site must be committed and all static checks must pass before merging.

Verification: generated pages have been rebuilt on the feature branch and the dedicated Node test suite passed in GitHub Actions.

Live API verification is required before publication: valid feedback, invalid payload and disallowed Origin.
