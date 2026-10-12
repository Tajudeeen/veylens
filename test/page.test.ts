import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildAppHtml } from "../src/web/build.js";
import { ARTICLE_URL } from "../src/web/page.js";
import { BRAND } from "../src/brand.js";

let html = "";
before(async () => {
  html = await buildAppHtml();
});

const css = (): string => (html.match(/<style>([\s\S]*?)<\/style>/) as RegExpMatchArray)[1] as string;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

test("has the requested pieces: splash, landing sections, footer, landmarks", () => {
  for (const marker of ['id="splash"', "<header", "<main", "<footer", 'id="top"', 'id="rules"', 'id="audit"', 'id="case"', 'id="limits"', 'class="skip skip-link"']) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
});

test("every in-page anchor points at an id that exists", () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1] as string);
  assert.ok(targets.length >= 8);
  for (const t of targets) assert.ok(ids.has(t), `dangling anchor #${t}`);
});

test("every label points at a real control, and every button has text", () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)) assert.ok(ids.has(m[1] as string), `label for ${m[1]}`);
  for (const m of html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)) assert.ok((m[1] as string).trim().length > 0);
});

test("heading levels never skip downward", () => {
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) assert.ok((levels[i] as number) - (levels[i - 1] as number) <= 1, `jump at heading ${i}`);
});

test("CSP: default-deny, script pinned to the inline script hash, nothing external allowed", () => {
  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(meta);
  const policy = (meta[1] as string).replace(/&#39;/g, "'");
  const script = (html.match(/<script>([\s\S]*?)<\/script>/) as RegExpMatchArray)[1] as string;
  const hash = createHash("sha256").update(script).digest("base64");
  assert.ok(policy.includes("default-src 'none'"));
  assert.ok(policy.includes(`script-src 'sha256-${hash}'`));
  assert.ok(!/unsafe-eval|connect-src|https?:/.test(policy));
  assert.equal((html.match(/<script/g) ?? []).length, 1);
});

test("document links load no external assets; the historical citation remains present", () => {
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/.test(html));
  assert.ok(html.includes(`href="${ARTICLE_URL}" rel="noopener noreferrer"`));
});

test("uses the Zcash palette and does not ship a logo or image files", () => {
  assert.ok(css().includes(BRAND.gold) && css().includes(BRAND.ink));
  assert.ok(!/<img\b/.test(html));
});

test("palette pairs meet WCAG AA contrast (4.5:1 for text)", () => {
  const pairs: Array<[string, string, string]> = [
    ["paper on ink", BRAND.paper, BRAND.ink],
    ["mute on ink", BRAND.mute, BRAND.ink],
    ["gold on ink", BRAND.gold, BRAND.ink],
    ["ink on gold", BRAND.ink, BRAND.gold],
    ["paper on field", BRAND.paper, "#1b1819"],
    ["mute on field", BRAND.mute, "#1b1819"],
  ];
  for (const [name, fg, bg] of pairs) assert.ok(contrast(fg, bg) >= 4.5, `${name} is ${contrast(fg, bg).toFixed(2)}:1`);
});

test("mobile: viewport, safe areas, dynamic viewport height, mobile-first breakpoints", () => {
  assert.ok(html.includes('name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"'));
  const c = css();
  assert.ok(c.includes("env(safe-area-inset-top)") && c.includes("env(safe-area-inset-bottom)"));
  assert.ok(c.includes("min-height:100vh;min-height:100dvh"));
  assert.ok(c.includes("@media (min-width:48rem)") && c.includes("@media (min-width:64rem)"));
  assert.ok(!/@media\s*\(max-width/.test(c), "layout should be mobile-first (min-width only)");
  assert.ok(/\.nav\{display:none\}/.test(c), "primary nav is hidden on phones");
});

test("mobile: 16px inputs (no iOS zoom), 44px+ tap targets, no sideways overflow", () => {
  const c = css();
  assert.ok(/textarea\{[^}]*font:16px\//.test(c));
  assert.ok(/\.btn\{[^}]*min-height:3rem/.test(c));
  assert.ok(/\.btn-sm\{min-height:2\.75rem/.test(c));
  assert.ok(/\.foot-nav a\{[^}]*min-height:2\.75rem/.test(c));
  assert.ok(/summary\{[^}]*min-height:2\.75rem/.test(c));
  assert.ok(c.includes(".tool-in,.tool-out{min-width:0}"));
  assert.ok(/code\{[^}]*overflow-wrap:anywhere/.test(c));
  assert.ok(c.includes("touch-action:manipulation"));
});

test("motion: reduced-motion handled, and no JS means no trapped scroll", () => {
  assert.ok(css().includes("prefers-reduced-motion:reduce"));
  assert.ok(html.includes("<noscript><style>.splash{display:none}body.is-splashing{overflow:auto}</style></noscript>"));
});

test("footer carries nav, version, and the affiliation notice", () => {
  const footer = (html.match(/<footer[\s\S]*?<\/footer>/) as RegExpMatchArray)[0];
  assert.ok(footer.includes('aria-label="Footer"'));
  assert.match(footer, /Version \d+\.\d+\.\d+/);
  assert.match(footer, /Not affiliated with or endorsed by the Zcash project/);
});

test("the hero case only states figures from the public report", () => {
  const hero = (html.match(/<figure class="case">[\s\S]*?<\/figure>/) as RegExpMatchArray)[0];
  assert.ok(hero.includes("0.005 ETH") && hero.includes("0.001598 ZEC"));
  assert.ok(!/\b1(\.0)? ZEC\b/.test(hero), "no invented shield amount in the hero");
});

test("form control edges meet the 3:1 non-text contrast requirement", () => {
  const edge = (css().match(/--edge:(#[0-9A-Fa-f]{6})/) as RegExpMatchArray)[1] as string;
  assert.ok(contrast(edge, BRAND.ink) >= 3, `edge on ink is ${contrast(edge, BRAND.ink).toFixed(2)}:1`);
  assert.ok(contrast(edge, "#1b1819") >= 3, `edge on field is ${contrast(edge, "#1b1819").toFixed(2)}:1`);
  assert.ok(/textarea\{[^}]*border:1px solid var\(--edge\)/.test(css()));
});
