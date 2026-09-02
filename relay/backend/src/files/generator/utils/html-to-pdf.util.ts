import puppeteer from 'puppeteer';

// ─── Concurrency guard ────────────────────────────────────────────────────────
// Prevents memory exhaustion when multiple PDF requests arrive simultaneously.
// Each Puppeteer instance consumes ~100-300 MB. This cap is a safety net until
// PDF generation is moved to a dedicated BullMQ queue in Phase 1.
let activePuppeteerInstances = 0;
const MAX_CONCURRENT_PUPPETEER = Number(
  process.env.PUPPETEER_MAX_CONCURRENT ?? 3,
);

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  if (activePuppeteerInstances >= MAX_CONCURRENT_PUPPETEER) {
    throw new Error('PDF generation at capacity. Please retry in a moment.');
  }

  activePuppeteerInstances += 1;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="
          width: 100%;
          font-size: 10px;
          padding: 0 18px;
          color: rgba(17,24,39,0.62);
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="flex:1;"></div>
          <div style="flex:1; text-align:center; font-weight:600;">
            <span class="title"></span>
          </div>
          <div style="flex:1; text-align:right; font-weight:600; white-space:nowrap;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        </div>
      `,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '14mm',
        left: '0mm',
      },
    });

    return Buffer.from(pdf);
  } finally {
    activePuppeteerInstances -= 1;
    await browser.close();
  }
}
