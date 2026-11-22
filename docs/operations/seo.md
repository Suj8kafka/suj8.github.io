# Search visibility and AI discovery

Read for metadata, indexing, canonical URLs, sitemap or search diagnosis. [Task index](../README.md) · [Actual status](../status.md) · [Audit evidence](../history/search-visibility-2026-11-22.md)

## Identity and page contracts

The canonical host is `https://www.sujeetkhadka.com.np`. Keep the non-www redirect and self-referencing www canonicals. The homepage is the primary identity page for **Sujeet Khadka**, UI/UX and product designer in Lalitpur, Nepal. Capitalization variants do not need separate content; “Sujit Khadka” is not a confirmed alias. Do not create keyword-variation doorway pages or invent awards, outcomes, aliases or reviews.

| Intent | Primary destination |
| --- | --- |
| Name, role, location, selected work, contact | `/` |
| Authored design notes and case-study catalogue | `/blog/` |
| A particular project/design problem | Its distinct `/blog/<slug>/` article |

Titles, descriptions, share metadata, visible identity and static JSON-LD must agree. The homepage's `Person`, `WebSite` and `ProfilePage` share coherent IDs. Articles use the same person ID, linked bylines, appropriate project images, breadcrumbs and visible/schema revision dates. Do not invent original publication dates. Structured data describes visible content; it does not guarantee a rich result, recommendation or first position.

Keep descriptive native links to project evidence. Only canonical, indexable maintained pages belong in `sitemap.xml`; advance `lastmod` for substantive page changes. Login, retired aliases and raw duplicate source files are excluded. Do not block a source path in robots if Google needs to fetch its noindex header. Prepared source/header rules are documented in [security](../../cloudflare/SECURITY.md) and need Worker deployment.

## Search Console workflow

1. Select the www URL-prefix property `https://www.sujeetkhadka.com.np/` or a verified Domain property. A non-www URL-prefix property does not cover www. The owner's www property and successful 11-page sitemap discovery are recorded in [status](../status.md).
2. Inspect the exact www homepage. Record indexed status, last crawl, exclusion reason and Google-selected canonical. **Page with redirect** for the non-www source is expected; it does not establish the target is indexed. A successful live test likewise does not prove indexing.
3. Review Page indexing, Manual actions and Security issues. Confirm sitemap processing; after substantive publication, request indexing for important updated pages. Repeated requests do not guarantee faster processing.
4. New-property reports can take up to a week to populate. Establish a baseline with available data, then compare equivalent periods. Track branded queries separately from broad design queries, including country/device and landing page, clicks, impressions, CTR and average position. Average position is not a universal fixed rank.
5. Keep the old property for redirect monitoring. Activate old-blog per-page redirects through the separately authorized [deployment procedure](deployment.md), then verify each destination. Correct report scope improves diagnosis, not rank directly.

If authorized to set up Bing Webmaster Tools, verify the same site and submit the canonical sitemap. No Bing setup is recorded yet. Never invent verification tokens or request account passwords.

## Content and chatbot discovery

Strategy: prioritize first-hand evidence for supported work, such as mobile-app UI/UX, Figma prototyping, older-device constraints and Nepali users. Keep name, role, location and portfolio URL consistent on confirmed professional profiles. Publish exact contribution, decisions, constraints and supported results; keep independent redesigns clearly labelled. Respect the owner's preference to omit testimonials.

Google's AI Overviews/AI Mode use ordinary SEO foundations; Google specifies no extra AI file or special schema requirement. This guidance is for Google Search's AI features, not a guarantee about the separate Gemini app. OpenAI documents OAI-SearchBot for ChatGPT search, independently of GPTBot's training control. Wildcard crawler permission already allows it in this repo; verify live edge bot policies before claiming access. Do not disable security broadly or trust a user-agent string alone.

Eligibility is not guaranteed inclusion or ordering in an answer. No site edit forces external chatbots to recommend the owner. Sample exact prompts over time, recording date, model/search mode, mentions and cited URLs; one answer is not a stable rank. Google Search AI traffic appears in normal Web reporting; Bing's supported AI citation reports are not universal chatbot rankings.

## Verify

Run `seo`, `blog` and `security-headers` tests as relevant. Check deployed HTTP status, metadata and sitemap after publication; use URL Inspection/Rich Results Test for live Google evidence. Code tests do not establish indexing, selected canonicals or ranking gains. Update [status](../status.md) only with actual evidence.

## Primary references

- [Google: search basics and capitalization](https://support.google.com/websearch/answer/134479)
- [Google: URL Inspection](https://support.google.com/webmasters/answer/9012289)
- [Google: property scope](https://support.google.com/webmasters/answer/34592), [new property data](https://support.google.com/webmasters/answer/96568)
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google: AI search features](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI: crawler controls](https://developers.openai.com/api/docs/bots)
- [Bing: AI citation reporting and limits](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
