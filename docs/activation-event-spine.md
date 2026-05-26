# Activation event spine

Tiny CV records the product activation funnel with privacy-safe metadata only. Client events are sent to GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured and are also posted to `/api/analytics/events` for server-side `usage_events` storage when `DATABASE_URL` is configured.

## Events

- `cta_click`
- `template_select`
- `cv_create_start`
- `cv_save`
- `cv_publish`
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

## Launch funnel events

The launch-critical GA4 funnel uses these exact event names. Tiny CV keeps the broader activation spine events and dispatches the launch names alongside them where the same user action already exists.

| Event | Trigger | Expected parameters |
| --- | --- | --- |
| `cta_click` | Homepage hero primary CTA click. | `surface=landing_hero`, `mode=start_writing` or `mode=continue_editing`, plus anonymous/session/source/referrer context. |
| `template_select` | User selects a resume template from the homepage examples, templates page, template example page, or `/new` chooser. | `surface`, `template_key`, plus anonymous/session/source/referrer context. |
| `cv_create_start` | A new workspace resume is successfully bootstrapped from a template. | `surface=new_resume`, `template_key`, `workspace_id`, plus anonymous/session/source/referrer context in GA4. |
| `cv_save` | A studio autosave succeeds. | `surface=studio`, `template_key`, `workspace_id`, plus anonymous/session/source/referrer context. |
| `cv_publish` | A studio publish request succeeds. | `surface=studio`, `template_key`, `workspace_id`, plus anonymous/session/source/referrer context in GA4. |

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

1. `cta_click`
2. `template_viewed`
3. `template_selected` and `template_select`
4. `workspace_bootstrap_created` and `cv_create_start`
5. `returning_resume_opened`
6. `first_edit`
7. `autosave_succeeded` and `cv_save`, or `autosave_failed`
8. `publish_clicked`
9. `resume_published` and `cv_publish`, or `publish_failed`
10. `share_link_copied`, `pdf_download_succeeded`, or `account_cta_clicked`
11. `workspace_claimed`

For reporting quality, compare client-side GA4 counts with server-side `usage_events` counts for the same event names, then inspect duplicate rate by `anonymous_id`, `session_id`, `workspace_id`, `template_key`, and `surface`.
