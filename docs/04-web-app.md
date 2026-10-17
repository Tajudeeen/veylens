> Historical implementation document. See [the current v1.0 contract](12-release-readiness.md) for current capabilities, evidence boundaries and remaining work.

# Web application, v0.4.0

## Navigation and design

The site consists of real HTML documents. Overview opens the workspace using
a normal link. All pages share the black #231F20 and yellow #F4B728 palette,
header, footer, and mobile Menu disclosure. The landing splash is skippable,
respects reduced motion, and appears once per session. The workspace and
verifier open directly without a splash.

The workspace contains input and results. The verifier contains only report
verification controls. Methodology explains the rules and actual integration
status. Static hosting requires all generated pages in `dist/client` together.
No SPA rewrite or server-side runtime is necessary.

## Behaviour and data

Each document is self-contained with hash-pinned JavaScript and inline styles.
The app makes no network requests for analysis. It does not persist flow JSON,
report JSON, or private signing keys to browser storage. Query parameters
select fixtures only. A one-off key signs browser reports. Signed report
exports contain findings, event identifiers, and the flow identifier, and
should be reviewed before sharing. Navigation still makes ordinary host requests.

Input changes and example changes hide the previous result. Invalid replacement
input cannot leave an old pass visible. Report verification caps input size.
Browser initialization binds only controls present on the current document.
The legacy single-page build remains available as `standalone.html`.

## Verification

The 109-test suite passes, including five multi-page tests covering landing
navigation, local link resolution, unique IDs, CSP hashes, workspace startup
without landing/verifier controls, sample selection, stale-result clearing,
independent verification, and tampered findings. Existing tests cover input
validation, escaping, signatures, CLI behaviour, and simulated DOM interactions.

Real browser screenshots and 320/390/768px device layout verification have not
been performed. CSS assertions and simulated DOM tests do not prove visual
layout or real browser enforcement of CSP. This environment has no configured
Sites control-browser capability, so that QA remains a recorded limitation.

## v0.5.0 evidence update

The workspace now auto-detects native Zcash-origin 1Click records, checks the
provider quote signature locally, and displays provenance and evidence gaps.
The independent verifier accepts the original source and re-runs analysis.
Reports bind evidence metadata to their signatures. Legacy clean-flow examples
now display Insufficient evidence. Real browser/device QA remains outstanding.
