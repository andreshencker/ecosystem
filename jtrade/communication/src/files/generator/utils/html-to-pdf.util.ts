// src/files/generator/utils/html-to-pdf.util.ts
import puppeteer from 'puppeteer';

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
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

      // ✅ Page numbers SOLO desde Puppeteer
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

          <!-- ✅ Centro: usamos el <title> del HTML -->
          <div style="flex:1; text-align:center; font-weight:600;">
            <span class="title"></span>
          </div>

          <!-- ✅ Derecha: numeración real -->
          <div style="flex:1; text-align:right; font-weight:600; white-space:nowrap;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        </div>
      `,

      // ✅ Espacio para el footer de Puppeteer (si no, lo pisa o lo corta)
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '14mm',
        left: '0mm',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
