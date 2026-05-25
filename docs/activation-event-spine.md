# Activation event spine

Tiny CV records the product activation funnel with privacy-safe metadata only. Client events are sent to GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured and are also posted to `/api/analytics/events` for server-side `usage_events` storage when `DATABASE_URL` is configured.

## Events

- `template_viewed`
- `template_selected`
- `workspace_bootstrap_created`
- `first_edit`
- `autosave_succeeded`
- `autosave_failed`
- `publish_clicked`
- `resume_published`
- `publish_failed`
- `share_link_copied`
- `pdf_download_clicked`
- `pdf_download_succeeded`
- `pdf_download_failed`
- `public_footer_create_clicked`
- `account_cta_clicked`
- `workspace_claimed`
- `returning_resume_opened`

## Allowed metadata

The analytics endpoint allowlists metadata keys and drops everything else before writing `usage_events`.

- Identifiers: `anonymous_id`, `session_id`, `workspace_id`
- Funnel context: `surface`, `source`, `template_key`, `mode`, `provider`, `result`
- Referrer/acquisition context: `referrer_source`, `referrer_host`, `utm_source`, `utm_medium`, `utm_campaign`
- Outcomes: `claimed_count`, `error_code`, `is_initial_template`, `is_published`, `used_dedicated_pdf_view`

Do not send resume markdown, generated resume text, emails, contact details, public slugs, resume IDs, or full public URLs. Client source context is categorized instead of sending the current page URL, so public resume slugs are not included in event parameters. GA4 page views also use sanitized route categories such as `/studio/[resumeId]` and `/[public_resume_slug]` instead of raw paths, query strings, or page titles.

String metadata is sanitized by key before client GA4 dispatch and server-side storage. Email-like values, URL-like values, public-slug-like values, path fragments, and long free-text values are dropped. The public `/api/analytics/events` write path is rate limited by IP plus available workspace and session identifiers.

## Basic funnel

Review the first-use funnel in order:

1. `template_viewed`
2. `template_selected`
3. `workspace_bootstrap_created`
4. `returning_resume_opened`
5. `first_edit`
6. `autosave_succeeded` or `autosave_failed`
7. `publish_clicked`
8. `resume_published` or `publish_failed`
9. `share_link_copied`, `pdf_download_succeeded`, or `account_cta_clicked`
10. `workspace_claimed`

For reporting quality, compare client-side GA4 counts with server-side `usage_events` counts for the same event names, then inspect duplicate rate by `anonymous_id`, `session_id`, `workspace_id`, `template_key`, and `surface`.
