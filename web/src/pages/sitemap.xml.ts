import type { APIRoute } from 'astro';
import catalog from '../data/catalog.json';
import android from '../data/android.json';
import { sdkPages } from '../lib/seo.mjs';

export const GET: APIRoute = ({ site }) => {
  const paths = ['/', ...sdkPages(catalog, android).map(page => page.path)];
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${escape(new URL(path, site).href)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
