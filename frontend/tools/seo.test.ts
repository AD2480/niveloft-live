import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PUBLIC_PAGES } from '../src/seo/pages';
import { findPreloads, findSecrets, launchFiles, resolveSiteUrl, robotsTxt, sitemapXml, withTags, type BuiltFile } from './seo';

const INDEX = '<html><head>\n    <!-- seo:start -->\n    <!-- seo:end -->\n</head><body></body></html>';

describe('launch files', () => {
  it('writes one page per public route with its own title, description and canonical link', () => {
    const files = launchFiles(INDEX, 'https://pf.example', '2026-09-27');
    for (const page of PUBLIC_PAGES) expect(files[page.file]).toContain(`<link rel="canonical" href="https://pf.example${page.path}" />`);
    expect(files['privacy.html']).toContain('<title>Privacy policy · Niveloft</title>');
    expect(files['privacy.html']).toContain('property="og:image" content="https://pf.example/og-image.png"');
    expect(files['app.html']).toContain('noindex, nofollow');
    expect(files['app.html']).not.toContain('rel="canonical"');
    expect(files['404.html']).toContain('Page not found');
  });

  it('lists public pages in the sitemap and keeps app pages out of robots', () => {
    const map = sitemapXml('https://pf.example', '2026-09-27');
    expect(map).toContain('<loc>https://pf.example/terms</loc>');
    expect(map).not.toContain('/dashboard');
    const robots = robotsTxt('https://pf.example');
    expect(robots).toContain('Disallow: /projects');
    expect(robots).toContain('Disallow: /reset-password');
    expect(robots).toContain('Sitemap: https://pf.example/sitemap.xml');
  });

  it('escapes and needs the markers', () => {
    expect(() => withTags('<html></html>', 'x')).toThrow(/markers/);
    expect(launchFiles(INDEX, '', '2026-09-27')['sitemap.xml']).toBeUndefined();
  });

  it('finds the site address from VITE_SITE_URL or Vercel', () => {
    expect(resolveSiteUrl({ VITE_SITE_URL: 'https://a.example/' })).toBe('https://a.example');
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'pf.vercel.app' })).toBe('https://pf.vercel.app');
    expect(resolveSiteUrl({})).toBe('');
  });

  it('refuses secrets in the bundle', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-secrets-'));
    fs.writeFileSync(path.join(dir, 'a.js'), 'const k = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123";');
    fs.writeFileSync(path.join(dir, 'b.js'), 'const p = "Password@123";');
    expect(findSecrets(dir, false)).toEqual(['a.js contains an Anthropic API key']);
    expect(findSecrets(dir, true)).toHaveLength(2);
  });

  it('preloads each page’s own module and the one font, so they download at once', () => {
    const bundle: Record<string, BuiltFile> = {
      'assets/index-a.js': { type: 'chunk', fileName: 'assets/index-a.js', facadeModuleId: '/x/frontend/index.html', imports: [] },
      'assets/LegalPages-b.js': { type: 'chunk', fileName: 'assets/LegalPages-b.js', facadeModuleId: '/x/frontend/src/pages/public/LegalPages.tsx', imports: ['assets/shared-c.js'], viteMetadata: { importedCss: new Set(['assets/legal.css']) } },
      'assets/shared-c.js': { type: 'chunk', fileName: 'assets/shared-c.js', facadeModuleId: null, imports: ['assets/index-a.js'] },
      'assets/geist-latin-wght-normal-Dx4.woff2': { type: 'asset', fileName: 'assets/geist-latin-wght-normal-Dx4.woff2' },
      'assets/inter-cyrillic-wght-normal-Q.woff2': { type: 'asset', fileName: 'assets/inter-cyrillic-wght-normal-Q.woff2' },
      'assets/other-latin-wght-normal-Z9.woff2': { type: 'asset', fileName: 'assets/other-latin-wght-normal-Z9.woff2' },
      'assets/ibm-plex-mono-latin-400-normal-M1.woff2': { type: 'asset', fileName: 'assets/ibm-plex-mono-latin-400-normal-M1.woff2' },
    };
    const pre = findPreloads(bundle);
    expect(pre.fonts).toEqual(['assets/geist-latin-wght-normal-Dx4.woff2']);
    expect(pre.pages['/privacy']).toEqual({ js: ['assets/LegalPages-b.js', 'assets/shared-c.js', 'assets/index-a.js'], css: ['assets/legal.css'] });
    const index = INDEX.replace('</head>', '<script type="module" crossorigin src="/assets/index-a.js"></script></head>');
    const files = launchFiles(index, 'https://pf.example', '2026-09-27', pre);
    expect(files['privacy.html']).toContain('<link rel="modulepreload" crossorigin href="/assets/LegalPages-b.js" />');
    expect(files['privacy.html']).not.toContain('modulepreload" crossorigin href="/assets/index-a.js"');
    expect(files['privacy.html']).toContain('<link rel="stylesheet" href="/assets/legal.css" />');
    expect(files['app.html']).not.toContain('rel="preload"');
    expect(files['login.html']).not.toContain('modulepreload');
  });
});
