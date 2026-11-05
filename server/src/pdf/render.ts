import type { Browser } from 'puppeteer';

let browser: Promise<Browser> | null = null;

/**
 * One browser is shared, as starting Chrome for every PDF would be slow. Puppeteer is a very
 * large package, so it loads on the first PDF instead of slowing every server start.
 * The dev script uses `node --watch-path` because the server hangs on Puppeteer under `tsx watch`.
 */
function getBrowser() {
  browser ??= import('puppeteer')
    .then(({ default: puppeteer }) => puppeteer.launch({ headless: true }))
    .then(
      (launched) => {
        launched.once('disconnected', () => {
          browser = null;
        });
        return launched;
      },
      (error) => {
        browser = null;
        throw error;
      },
    );
  return browser;
}

// Invoices only ever need Google Fonts and inline images.
const ALLOWED_REQUESTS = /^(data:|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/;

export async function renderPdf(html: string) {
  const page = await (await getBrowser()).newPage();

  try {
    // Record text ends up in this page, so it gets no scripts and no other network access.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (ALLOWED_REQUESTS.test(request.url())) request.continue();
      else request.abort();
    });

    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);

    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close();
  }
}
