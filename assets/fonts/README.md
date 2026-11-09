Locally served Latin WOFF2 subsets of DM Mono (400 and 500), DM Sans (400–700) and Space Grotesk (500–700), downloaded from Google Fonts on 2026-11-09. DM Sans and Space Grotesk use one variable font file each. The font binaries are unmodified; each family's SIL Open Font License is included alongside them.

`scripts/fetch-portfolio-fonts.mjs` records the pinned distribution URLs and corresponding upstream license URLs. Run it from the repository root to restore these assets; network access is required. It validates WOFF2 headers and prints SHA-256 checksums. The site's `@font-face` rules live in `assets/css/site.css`, use `font-display: swap`, and require no Google Fonts stylesheet request.

The welcome's Namaste is local SVG artwork and needs no downloadable font. Unused Noto language-family requests were removed from the homepage.
