The active welcome is `loader/files/loader.js` and `loader/files/loader.css`.

Phones/tablets up to 800px, coarse-pointer devices and save-data connections bypass the welcome immediately, including first visits and slow asset loads. The page remains scrollable and `loader:done` still fires exactly once. This avoids adding the desktop intro's nine-second delay to mobile LCP. Desktop welcome behavior below is retained.

Normal visits show the Sujeet wordmark, a stroke-written Namaste, and the progress bar. The normal minimum is 1050 ms plus a 180 ms exit. First visits last nine seconds in total: 7720 ms of Hello, 1100 ms of handwritten Namaste, and the 180 ms exit. Only the first visit uses the longer intro, remembered across sessions in local storage with a session-storage fallback. Slow asset readiness is bounded, with a hard fail-safe; it cannot extend the first-visit intro. Scroll intent, navigation keys, and the skip control dismiss the welcome immediately. Reduced motion and deep links bypass it.

`loader/files/namaste.svg` contains the local drawing artwork, also embedded in `#ld-namaste-template` in `index.html` to avoid an extra request. Its glyph outlines come from rendered Noto Sans Devanagari. Eighteen ordered pen paths draw the letter bodies, vowel mark, and finally their joining headline in 760 ms; a 120 ms ink finish preserves the complete letterforms. The completed word remains readable before dismissal. The drawing has no runtime font dependency.

Keep the SVG asset and inline template identical when editing the artwork. JavaScript inserts it only for Namaste and preserves plain text if the template is unavailable. Reduced motion disables the drawing, and a no-script style hides the welcome so the page remains usable.
