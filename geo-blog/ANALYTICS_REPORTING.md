# Tiny CV GEO Blog Analytics Reporting

Use this path during weekly GEO blog reviews and before `auto` topic selection.
The goal is to let analytics influence the next post without inventing data when
the runtime does not have Google access.

## Reporting Identifiers

- Production site: `https://tiny.cv`
- Blog path filter: `/blog/*`
- GA4 web stream measurement ID: `G-743RD6GYBD`
- GA4 Data API property ID: not documented in this repository.
- GSC URL-prefix property: `https://tiny.cv/`
- GSC domain property fallback: `sc-domain:tiny.cv`

The GA4 measurement ID is enough to identify the tracked web stream in the
Google Analytics UI. It is not the numeric GA4 property ID required by the GA4
Data API. If an API or MCP tool asks for `property_id`, `property`, or
`properties/{id}`, use a runtime-provided numeric property ID. Do not derive one
from `G-743RD6GYBD`.

## Current Availability

GA4 and GSC reporting is available when the runtime provides one of these:

- A GA4/GSC MCP connector with authenticated reporting tools.
- Google Analytics Data API credentials plus the numeric GA4 property ID.
- Search Console API credentials with access to `https://tiny.cv/` or
  `sc-domain:tiny.cv`.
- Human-provided exports from GA4 and GSC using the fields below.

As of this repo update, the checked-in Multica CLI has no first-party GA4 or GSC
reporting command, and the repo only documents the GA4 measurement ID, not the
numeric Data API property ID. That is a tooling/configuration blocker for
automated GA4 API reporting. Agents should report the blocker and fall back to
GSC, human exports, and repo coverage when the required tools or IDs are absent.

## Weekly Date Windows

Use complete data windows. Do not use the current partial day.

- Weekly trend: last complete 7 days versus the previous 7 days.
- Topic selection: last complete 28 days versus the previous 28 days.
- Content gaps and decay: last complete 90 days versus the previous 90 days
  when enough history exists.
- New or sparse site fallback: use the longest complete window available, then
  label the analysis as sparse.
- GSC freshness fallback: if the latest GSC data date lags, end the window on
  the most recent complete date shown by Search Console.

Sparse data is not a publication blocker. If a post or query has too few clicks
to support a conclusion, say so and use impressions, average position, indexing
status, existing coverage, and editorial fit as the fallback signals.

## GA4 Landing-Page Report

Scope the report to sessions where the landing page starts with `/blog/`.

Required fields:

- `date`
- `landingPagePlusQueryString` or UI equivalent "Landing page + query string"
- `sessions`
- `activeUsers`
- `screenPageViews` or UI equivalent "Views"
- `engagementRate`
- `averageSessionDuration`
- `keyEvents` when configured, otherwise event counts for known blog-adjacent
  actions

Useful optional fields:

- `sessionDefaultChannelGroup`
- `firstUserDefaultChannelGroup`
- `newUsers`
- `eventName` plus `eventCount` for blog-driven actions

Weekly questions:

- Which `/blog/*` posts are getting the most landing sessions?
- Which posts have impressions or search clicks in GSC but weak GA4 engagement?
- Which posts get visits but no meaningful downstream events?
- Are new posts receiving any landing sessions within the first 7, 28, and 90
  complete days after publication?

If GA4 is unavailable, write:

```text
GA4 unavailable for this run: no authenticated GA4 reporting tool and no numeric
GA4 Data API property ID were available. Known web stream measurement ID:
G-743RD6GYBD. Falling back to GSC/repo coverage.
```

## GSC Query And Page Reports

Use `https://tiny.cv/` first because it matches the production URL-prefix
property. Use `sc-domain:tiny.cv` only if that is the available property.

Required query report fields:

- `date`
- `query`
- `page`
- `clicks`
- `impressions`
- `ctr`
- `position`

Required page report fields:

- `date`
- `page`
- `clicks`
- `impressions`
- `ctr`
- `position`

Recommended filters:

- Page contains `https://tiny.cv/blog/`
- Search type: web
- Country/device: all, unless the tool requires a value

Weekly questions:

- Quick wins: which queries rank in positions 4-15 with impressions and weak CTR?
- Content gaps: which queries have impressions but no clearly targeted post?
- Decay: which blog pages lost clicks or impressions versus the prior period?
- CTR opportunities: which pages have high impressions and low CTR for their
  average position?
- Refresh candidates: which existing posts map to the query instead of requiring
  a new article?

If GSC is unavailable, write:

```text
GSC unavailable for this run: no authenticated Search Console reporting tool had
access to https://tiny.cv/ or sc-domain:tiny.cv. Falling back to GEO.md,
geo-blog/TOPICS.md, existing post coverage, and source-backed search-intent
research.
```

## GSC Indexing Report

For weekly review, inspect each published blog URL from `content/blog` and any
new PR/live URLs that were published since the last review.

Required fields:

- URL
- Inspection date
- `inspectionResultLink` when API output provides it
- `indexStatusResult.verdict`
- `indexStatusResult.coverageState`
- `indexStatusResult.robotsTxtState`
- `indexStatusResult.indexingState`
- `indexStatusResult.lastCrawlTime`
- `indexStatusResult.googleCanonical`
- `indexStatusResult.userCanonical`
- Sitemap status or listed sitemap URLs when available

If the URL Inspection API is unavailable, use the Search Console UI URL
Inspection tool and record the same fields where visible. If neither API nor UI
access is available, document the blocker and do not claim indexing status.

## Weekly Review Output

Agents should summarize analytics in this shape before selecting a topic:

```text
Analytics window:
- GA4: {date range or unavailable reason}
- GSC performance: {date range or unavailable reason}
- GSC indexing: {checked URLs or unavailable reason}

GA4 blog landing pages:
- Top posts:
- Weak engagement:
- Notes:

GSC opportunities:
- Quick wins:
- Content gaps:
- Decay:
- CTR opportunities:

Indexing:
- Indexed:
- Needs attention:
- Unknown:

Topic decision:
- Recommended action:
- Why analytics support it:
- Sparse-data fallback used:
```

## Source References

- Google Analytics Data API dimensions and metrics:
  `https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema`
- Search Console Search Analytics API:
  `https://developers.google.com/webmaster-tools/v1/searchanalytics/query`
- Search Console URL Inspection result fields:
  `https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult`
