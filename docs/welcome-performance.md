# Welcome performance — 2026-11-09

The mobile welcome now reveals the portfolio 500 ms after the deferred loader starts. All six greetings still play over five seconds, ending with the original handwritten Namaste in a small dismissible panel. The bootstrap can appear before the deferred script arrives, so the time from navigation to reveal also includes HTML and script delivery. Desktop durations are unchanged.

Greeting timers and a native progress animation replace the continuous JavaScript frame loop. Text transitions use opacity and transform. Orbital artwork takes its mobile dimensions from the first paint and disappears when docking, avoiding layout shifts. The full stylesheet applies without animating initial colour, border, shadow and padding changes. Initial offscreen layout is deferred only while an enhanced page waits for the full sheet; no-JavaScript pages keep their normal layout. The preloaded portrait has higher fetch priority than the heading font.

Three sequential cold-cache Lighthouse 13.6.0 runs of the final local source:

| Run | Performance | FCP | LCP | Speed Index | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 99 | 1.082 s | 1.812 s | 1.279 s | 72 ms | 0 |
| 2 | 98 | 0.889 s | 1.815 s | 1.369 s | 130 ms | 0 |
| 3 | 99 | 1.088 s | 1.811 s | 1.309 s | 67 ms | 0 |
| Median | **99** | 1.082 s | **1.812 s** | **1.309 s** | 72 ms | **0** |

All three audits reported zero non-composited animation warnings. The later Namaste pen drawing still animates SVG strokes and requires painting; these audit results do not claim that handwriting is composited.

Conditions: local Chrome 157 on Windows, Lighthouse's default Moto G Power mobile emulation (412 × 823 CSS pixels, DPR 1.75), simulated Slow 4G, 4× CPU slowdown, fresh browser/storage, local HTTP with gzip, and no concurrent browser tests. A read-only public response-header check confirmed gzip on the public homepage. Firebase, visitor analytics and location service requests were blocked in local QA to avoid creating real visitor records. Full production SDK, network and edge costs are therefore not represented. The standard development server does not compress responses; its scores are not interchangeable with these runs.

The user-supplied production run scored 96 with a 4.8 s Speed Index, 2.0 s LCP, 0 ms TBT and zero CLS. That run and the local audits have different hosting and service conditions, so they do not establish a measured production score increase. **A score of 100 was not achieved in these final local runs.** The median was 99, with initial layout blocking still varying between runs. Run a fresh production Lighthouse audit after an authorized publication to establish the live result. Speed Index reflects visual progress, including the welcome overlay; see [Chrome's Speed Index documentation](https://developer.chrome.com/docs/lighthouse/performance/speed-index).

Validation: all 137 Node tests passed. Chrome checks covered the complete greeting order and five-second duration, finished Namaste, light/dark themes, small phones and landscape, closing/focus, navigation while docked, direct links, reduced motion, save-data, no JavaScript, desktop greetings and script-failure recovery. A complete throttled mobile visit (4× CPU, 150 ms latency, 1.6 Mbps) observed all six greetings and zero layout shift. The inline welcome CSS, generated critical CSS and Namaste SVG copies are synchronized.

Detailed measurement values are in [the local results](performance/welcome-performance-2026-11-09.json). Raw Lighthouse reports and browser screenshots remain in `.tmp/loader-performance-verified-*.json` and `.tmp/early-welcome-*.png`. The local gzip preview and browser checks used temporary scripts in `.tmp/`; no package installation or build step was added. No deployment, Worker, Firebase or DNS changes were made.
