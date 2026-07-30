# Blog Product-Intent Analytics

Tiny CV tracks blog readers who move from an article into product-intent actions. Page views still come from Google Analytics; the events below capture explicit resume-building intent.

## Events

| Event | Trigger | Expected parameters |
| --- | --- | --- |
| `blog_start_writing_click` | A blog reader clicks a Start writing CTA in the article footer or blog-aware header. | `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, `source_surface`, `page_path`, `page_location` |
| `blog_template_click` | A blog reader clicks a templates-related link, including `/templates`, `/examples/*`, or `/new?template=*` links rendered inside a blog article or the blog-aware header. | `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, `source_surface`, `page_path`, `page_location` |
| `blog_agent_guide_click` | A blog reader clicks an agent guide link rendered inside a blog article, including `/agents`, `/api/v1/spec/markdown`, or `/documentation#paid-agent-finish`. | `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, `source_surface`, `page_path`, `page_location` |
| `blog_public_link_cta_click` | A blog reader clicks the Publish a public CV link CTA in the article footer. | `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, `source_surface`, `page_path`, `page_location` |
| `blog_pdf_cta_click` | A blog reader clicks the Make a PDF resume CTA in the article footer. | `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, `source_surface`, `page_path`, `page_location` |
| `blog_create_resume` | A visitor with active blog attribution creates a resume from `/new` by selecting or auto-loading a template. | `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, `source_surface`, `page_path`, `page_location`, `template_key`, `resume_id` |

## Signup Attribution

When a visitor signs in or signs up after a blog-attributed click, the existing account event endpoint records `account.sign_in` or `account.sign_up` with:

| Metadata key | Description |
| --- | --- |
| `surface` | Always `account_page` for the current auth panel. |
| `blog_attribution` | The stored blog attribution object, when present. It includes `source: "blog"`, `captured_at`, `blog_slug`, `blog_title`, `blog_category`, `cta`, `link_text`, `link_url`, and `surface`. |

Blog attribution is stored in browser `localStorage` for up to 30 days. If Google Analytics is unavailable or blocked, the attribution still carries into signup metadata when the user signs up in the same browser.

## Implementation Notes

- Blog CTA clicks are sent to `window.gtag` through `src/app/_lib/blog-product-intent-analytics.ts`.
- Blog markdown links are classified at click time by `BlogMarkdownLink`.
- Footer and header CTAs use `BlogProductIntentLink`.
- `/new` accepts `source=blog`, `blog`, and `blog_cta` query parameters so new-tab and direct navigations can preserve attribution before resume creation.
- The first-party `/api/analytics/events` endpoint remains authenticated and currently records account sign-in/sign-up events only.

## Verification Limits

Local verification can confirm that event calls are wired, query parameters are added, and signup metadata includes stored attribution. Production analytics delivery still depends on `NEXT_PUBLIC_GA_MEASUREMENT_ID`, browser tracking permissions, and access to the Google Analytics property or the production `usage_events` database.
