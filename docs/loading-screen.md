The active welcome uses loader/files/loader.js and loader/files/loader.css. The stylesheet is also embedded verbatim in index.html as #welcome-styles; keep those copies synchronized.

A small head bootstrap activates the overlay before body content can paint. It bypasses reduced motion, save-data, direct section links and hidden tabs. A nine-second watchdog releases the page if the deferred loader script fails; a late script cannot restart the intro. Without JavaScript, the overlay remains hidden. The loader no longer waits for a separate stylesheet request.

First desktop visits cycle Hello, Hola, Bonjour, Ciao, Hallo and handwritten Namaste in six seconds including the exit. The first four greetings take 940 ms each, Hallo takes 960 ms, Namaste takes 1100 ms and the exit takes 180 ms. Returning desktop visits retain the short Namaste sequence.

Phones retain the complete five-second sequence on every visit, but reveal the portfolio and restore scrolling 500 ms after the loader starts. The remaining greetings finish in a 184px panel above the bottom navigation, with a labelled 44px close button. Closing it restores focus to the hero heading. Scroll intent and keyboard navigation dismiss it immediately. Optional live services and motion still wait for the welcome to finish or be dismissed.

Greeting transitions use a 180 ms translation and opacity animation. The browser animates the progress bar; JavaScript wakes at greeting boundaries instead of updating styles every frame. The mobile orbital artwork uses its final mobile dimensions from the first paint and disappears when the panel opens, avoiding resizing shifts. The handwritten drawing remains unchanged. There are no new fonts, libraries or image requests. Visibility changes and reduced-motion changes dismiss the intro. Slow assets and stalled animation frames cannot hold the page indefinitely.

Namaste uses the local vector artwork in loader/files/namaste.svg, embedded identically in #ld-namaste-template. Its eighteen ordered pen paths draw in 760 ms followed by a 120 ms finish. Keep both artwork copies synchronized.

Initial styling suppresses transitions until two paint opportunities after the full sheet activates. Offscreen sections use temporary automatic content visibility only while that sheet is pending; normal layout returns when it is ready. The portrait has higher fetch priority than the preloaded heading font.

Verification: `node --test tests/*.test.mjs` covers language order, duration, early page access, progress animation cleanup, bypasses, bootstrap failure recovery, stylesheet initialization and artwork synchronization. Chrome checks cover all greetings, Namaste, both themes, 320px and 430px phones, landscape, Skip/focus, navigation while docked, reduced motion, save-data, direct links, no JavaScript, desktop and a failed loader script. A separate slow-mobile check uses 4x CPU slowdown, 1.6 Mbps and 150ms latency and checks layout stability.

Local Lighthouse measurements and their limits are recorded in [welcome performance](welcome-performance.md). A production score of 100 has not been verified.

Changes are local; publication requires separate authorization.
