/**
 * Build-time SEO and launch files for the static site (see vite.config.ts):
 *
 * - one HTML file per public page with its own title, description, canonical link and social
 *   preview tags (link previews and many crawlers don't run JavaScript);
 * - app.html (signed-in pages and emailed-link pages: never indexed) and 404.html;
 * - sitemap.xml and robots.txt;
 * - checks that a production build doesn't ship demo data or call an API over plain HTTP.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { faqJsonLd } from '../src/features/public/faq';
import { APP_PATHS, DEFAULT_DESCRIPTION, fullTitle, PUBLIC_PAGES, SITE_NAME, SOCIAL_IMAGE, UTILITY_PATHS, type PageMeta } from '../src/seo/pages';

const START = '<!-- seo:start -->';
const END = '<!-- seo:end -->';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The site's address from VITE_SITE_URL, or Vercel's production domain during a Vercel build. */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const explicit = (env.VITE_SITE_URL ?? '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = (env.VERCEL_PROJECT_PRODUCTION_URL ?? '').trim();
  return vercel ? `https://${vercel.replace(/\/$/, '')}` : '';
}

interface TagOptions {
  title: string;
  description: string;
  /** Canonical path (indexable pages only). */
  path?: string;
  noindex?: boolean;
}

/** The <head> tags that differ per page. `siteUrl` may be empty (then links stay relative). */
export function seoTags(o: TagOptions, siteUrl: string): string {
  const abs = (p: string) => `${siteUrl}${p}`;
  const lines = [
    `<title>${esc(o.title)}</title>`,
    `<meta name="description" content="${esc(o.description)}" />`,
    `<meta name="robots" content="${o.noindex ? 'noindex, nofollow' : 'index, follow'}" />`,
  ];
  if (o.path && !o.noindex && siteUrl) lines.push(`<link rel="canonical" href="${esc(abs(o.path))}" />`);
  lines.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta property="og:title" content="${esc(o.title)}" />`,
    `<meta property="og:description" content="${esc(o.description)}" />`,
  );
  if (o.path && siteUrl) lines.push(`<meta property="og:url" content="${esc(abs(o.path))}" />`);
  lines.push(
    `<meta property="og:image" content="${esc(abs(SOCIAL_IMAGE.path))}" />`,
    `<meta property="og:image:width" content="${SOCIAL_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${SOCIAL_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${esc(SOCIAL_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(o.title)}" />`,
    `<meta name="twitter:description" content="${esc(o.description)}" />`,
    `<meta name="twitter:image" content="${esc(abs(SOCIAL_IMAGE.path))}" />`,
    `<meta name="twitter:image:alt" content="${esc(SOCIAL_IMAGE.alt)}" />`,
  );
  return lines.map((l) => `    ${l}`).join('\n');
}

export function pageTags(page: PageMeta, siteUrl: string): string {
  const tags = seoTags({ title: fullTitle(page), description: page.description, path: page.path }, siteUrl);
  // The FAQ's questions and answers as structured data, so search engines can show them. (A data
  // block, not a script: it never runs, so the Content Security Policy doesn't apply to it.)
  return page.path === '/faq' ? `${tags}\n    <script type="application/ld+json">${faqJsonLd()}</script>` : tags;
}

/** Replaces the block between the seo markers in index.html. */
export function withTags(html: string, tags: string): string {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a < 0 || b < a) throw new Error('index.html needs <!-- seo:start --> and <!-- seo:end --> markers');
  return `${html.slice(0, a + START.length)}\n${tags}\n    ${html.slice(b)}`;
}

export function sitemapXml(siteUrl: string, lastmod: string): string {
  const urls = PUBLIC_PAGES.filter((p) => p.sitemap)
    .map((p) => `  <url>\n    <loc>${esc(siteUrl + p.path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${(p.priority ?? 0.5).toFixed(1)}</priority>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(siteUrl: string): string {
  const disallow = [...APP_PATHS, ...UTILITY_PATHS].map((p) => `Disallow: ${p}`).join('\n');
  return `# Public pages may be indexed; signed-in pages and emailed-link pages may not.\nUser-agent: *\nAllow: /\n${disallow}\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
}

/** A built file as Vite/Rollup describes it (only the fields used here). */
export interface BuiltFile {
  type: string;
  fileName: string;
  facadeModuleId?: string | null;
  imports?: string[];
  viteMetadata?: { importedCss?: Set<string> };
}

/** What each page should start downloading at once, instead of discovering it step by step. */
export interface Preloads {
  /** The one font (Geist's Latin subset), needed on every page. */
  fonts: string[];
  /** Per page path: its lazily loaded page module, the modules it imports, and its CSS. */
  pages: Record<string, { js: string[]; css: string[] }>;
}

export function findPreloads(bundle: Record<string, BuiltFile>): Preloads {
  const files = Object.values(bundle);
  const fonts = files
    .filter((f) => f.type === 'asset' && /(^|\/)geist-latin-wght-normal[-.][\w-]*\.woff2$/.test(f.fileName))
    .map((f) => f.fileName)
    .sort();
  const byName = new Map(files.map((f) => [f.fileName, f]));
  const pages: Preloads['pages'] = {};
  for (const page of PUBLIC_PAGES) {
    if (!page.module) continue;
    const entry = files.find((f) => f.type === 'chunk' && f.facadeModuleId?.replace(/\\/g, '/').endsWith(`/${page.module}`));
    if (!entry) continue;
    const js = new Set<string>();
    const css = new Set<string>();
    const visit = (f: BuiltFile | undefined) => {
      if (!f || js.has(f.fileName)) return;
      js.add(f.fileName);
      f.viteMetadata?.importedCss?.forEach((c) => css.add(c));
      for (const i of f.imports ?? []) visit(byName.get(i));
    };
    visit(entry);
    pages[page.path] = { js: [...js], css: [...css] };
  }
  return { fonts, pages };
}

/** Adds preload links just before </head>, skipping files the page already links to. */
export function withPreloads(html: string, fonts: string[], js: string[] = [], css: string[] = []): string {
  const has = (f: string) => html.includes(`/${f}"`);
  const tags = [
    ...fonts.filter((f) => !has(f)).map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin />`),
    ...css.filter((f) => !has(f)).map((f) => `<link rel="stylesheet" href="/${f}" />`),
    ...js.filter((f) => !has(f)).map((f) => `<link rel="modulepreload" crossorigin href="/${f}" />`),
  ];
  return tags.length ? html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`) : html;
}

/** Every file the site needs besides the bundle, keyed by path inside dist/. */
export function launchFiles(indexHtml: string, siteUrl: string, lastmod: string, preloads: Preloads = { fonts: [], pages: {} }): Record<string, string> {
  const files: Record<string, string> = {};
  // Fonts aren't preloaded: they swap in, and on a slow phone connection preloading them delays
  // the scripts that draw the page (measured: first paint 0.4 s later).
  for (const page of PUBLIC_PAGES) {
    const p = preloads.pages[page.path];
    files[page.file] = withPreloads(withTags(indexHtml, pageTags(page, siteUrl)), [], p?.js, p?.css);
  }
  files['app.html'] = withTags(indexHtml, seoTags({ title: SITE_NAME, description: DEFAULT_DESCRIPTION, noindex: true }, siteUrl));
  files['404.html'] = withTags(indexHtml, seoTags({ title: `Page not found · ${SITE_NAME}`, description: 'This page doesn’t exist or has moved.', noindex: true }, siteUrl));
  files['robots.txt'] = robotsTxt(siteUrl);
  if (siteUrl) files['sitemap.xml'] = sitemapXml(siteUrl, lastmod);
  return files;
}

/** Patterns that must never appear in a production bundle. */
export const SECRET_PATTERNS: [RegExp, string][] = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'an Anthropic API key'],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/, 'a Resend API key'],
  [/AKIA[0-9A-Z]{16}/, 'an AWS access key'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'a private key'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'a GitHub token'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/sk_live_[A-Za-z0-9]{16,}/, 'a Stripe secret key'],
];

/** Demo data belongs only in demo builds. */
const DEMO_PATTERN: [RegExp, string] = [/Password@123/, 'the sample accounts’ password (demo data in a real-backend build)'];

export function findSecrets(dir: string, realBackend: boolean): string[] {
  const patterns = realBackend ? [...SECRET_PATTERNS, DEMO_PATTERN] : SECRET_PATTERNS;
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|mjs|css|html|json|txt|xml|map)$/.test(entry.name)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const [re, what] of patterns) if (re.test(text)) hits.push(`${path.relative(dir, p)} contains ${what}`);
      }
    }
  };
  walk(dir);
  return hits;
}

/**
 * The Vite plugin. In development it only fills the SEO block of index.html; a production build
 * also writes the launch files and refuses to finish if the bundle holds a secret.
 */
export function seoPlugin(env: Record<string, string | undefined>): Plugin {
  let config: ResolvedConfig;
  let preloads: Preloads = { fonts: [], pages: {} };
  const siteUrl = resolveSiteUrl(env);
  const home = PUBLIC_PAGES[0];
  return {
    name: 'projectflow-seo',
    configResolved(c) {
      config = c;
      const mockOff = env.VITE_USE_MOCK_API !== 'true';
      const api = (env.VITE_API_BASE_URL ?? '').trim();
      if (c.command === 'build' && mockOff && /^http:\/\//i.test(api) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(api)) {
        throw new Error(`VITE_API_BASE_URL must use https:// (was ${api}). Browsers block or expose plain-HTTP calls from an HTTPS site.`);
      }
      // On Vercel there is no /api: the backend runs elsewhere, so the build needs its address.
      if (c.command === 'build' && mockOff && env.VERCEL === '1' && !/^https:\/\//i.test(api)) {
        throw new Error(
          'Set VITE_API_BASE_URL in Vercel (Settings → Environment Variables) to your backend’s address plus /api, e.g. https://niveloft-api.up.railway.app/api, then redeploy. See DEPLOYMENT.md.',
        );
      }
      if (c.command === 'build' && !siteUrl) {
        c.logger.warn('\n[projectflow-seo] VITE_SITE_URL is not set: canonical links, social preview URLs and the sitemap need the site’s address.\n');
      }
    },
    transformIndexHtml(html) {
      return withTags(html, pageTags(home, siteUrl));
    },
    generateBundle(_options, bundle) {
      preloads = findPreloads(bundle as Record<string, BuiltFile>);
    },
    closeBundle() {
      if (config.command !== 'build') return;
      const out = path.resolve(config.root, config.build.outDir);
      const indexPath = path.join(out, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const files = launchFiles(fs.readFileSync(indexPath, 'utf8'), siteUrl, new Date().toISOString().slice(0, 10), preloads);
      for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(out, name), content);
      const secrets = findSecrets(out, env.VITE_USE_MOCK_API !== 'true');
      if (secrets.length) throw new Error(`Refusing to publish: the build contains secrets.\n  ${secrets.join('\n  ')}`);
      config.logger.info(`[projectflow-seo] wrote ${Object.keys(files).length} launch files; no secrets found in the bundle.`);
    },
  };
}

/**
 * Unless a build asks for the demo API (VITE_USE_MOCK_API=true), the in-browser demo API and its
 * sample data are replaced by an empty module, so the live site never ships them (or their password).
 */
export function excludeDemoApi(env: Record<string, string | undefined>): Plugin {
  const ID = '\0projectflow-no-demo';
  return {
    name: 'projectflow-exclude-demo',
    enforce: 'pre',
    apply: 'build',
    resolveId(source) {
      if (env.VITE_USE_MOCK_API === 'true') return null;
      return /(^|\/)mock\/(server|store|demoAccounts)$/.test(source) ? ID : null;
    },
    load(id) {
      if (id !== ID) return null;
      return [
        'const off = () => { throw new Error("The demo API is not part of this build (it only runs in local development)."); };',
        'export const handleMockRequest = off;',
        'export const resetDb = off;',
        'export const forgetCachedDb = () => {};',
        'export const MOCK_DB_STORAGE_KEY = "projectflow.mockdb.v1";',
        'export const DEMO_ACCOUNTS = [];',
        'export const DEMO_PASSWORD = "";',
      ].join('\n');
    },
  };
}
