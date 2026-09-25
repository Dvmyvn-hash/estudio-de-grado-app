const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/dpint/.gemini/antigravity-ide/brain/02b2917d-baf8-416b-a761-fdaa6c4e62cd';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const TOPICS = [
  { id: 'civil-actojuridi-1-6', code: '1.6', label: 'Civil_1.6_Ineficacias' },
  { id: 'procesal-procesal-2-2', code: '2.5', label: 'Procesal_2.5_Comparecencia' },
  { id: 'constitucional-constituci-1-2', code: '3.2', label: 'Constitucional_3.2_Proteccion_Amparo' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const phase = process.argv[2] || 'before';

  console.log(`=== AUDITORÍA VISUAL: FASE [${phase.toUpperCase()}] ===\n`);
  const auditReport = [];

  for (const topic of TOPICS) {
    console.log(`Procesando tópico: ${topic.id} (${topic.label})...`);

    // 1. PC: 1440 x 900
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      if (typeof LicenseService !== 'undefined') {
        LicenseService.setAdminMode(true, 'admin');
      }
    });
    await page.evaluate((id) => (typeof App !== 'undefined' ? App : window.App).openTopic(id), topic.id);
    await page.waitForSelector('#topic-markdown-body', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    // Scroll to table area (either .table-responsive or paragraph with pipe)
    await page.evaluate(() => {
      const table = document.querySelector('.table-responsive');
      if (table) {
        table.scrollIntoView({ behavior: 'instant', block: 'center' });
      } else {
        const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('|'));
        if (p) p.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await new Promise(r => setTimeout(r, 300));

    const pcMetrics = await page.evaluate(() => {
      const tableWrapper = document.querySelector('.table-responsive');
      const table = document.querySelector('.reading-table');
      const readingCol = document.querySelector('.topic-reading-col');
      const mainContent = document.querySelector('.main-content');
      const firstTh = document.querySelector('.reading-table th');
      const firstTd = document.querySelector('.reading-table td');

      return {
        hasTableResponsive: !!tableWrapper,
        tableWrapper: tableWrapper ? {
          scrollWidth: tableWrapper.scrollWidth,
          clientWidth: tableWrapper.clientWidth,
          hasScroll: tableWrapper.scrollWidth > tableWrapper.clientWidth,
          overflowX: window.getComputedStyle(tableWrapper).overflowX
        } : null,
        table: table ? {
          width: window.getComputedStyle(table).width,
          display: window.getComputedStyle(table).display,
          lineHeight: window.getComputedStyle(table).lineHeight
        } : null,
        readingCol: readingCol ? {
          overflowX: window.getComputedStyle(readingCol).overflowX,
          maxWidth: window.getComputedStyle(readingCol).maxWidth
        } : null,
        mainContent: mainContent ? {
          overflowX: window.getComputedStyle(mainContent).overflowX
        } : null,
        firstTh: firstTh ? {
          padding: window.getComputedStyle(firstTh).padding,
          fontSize: window.getComputedStyle(firstTh).fontSize,
          whiteSpace: window.getComputedStyle(firstTh).whiteSpace
        } : null,
        firstTd: firstTd ? {
          padding: window.getComputedStyle(firstTd).padding,
          wordBreak: window.getComputedStyle(firstTd).wordBreak,
          lineHeight: window.getComputedStyle(firstTd).lineHeight
        } : null,
        rawBrInCells: !!document.querySelector('.reading-table td')?.innerHTML.includes('&lt;br&gt;'),
        brokenParagraphTables: Array.from(document.querySelectorAll('p')).filter(p => p.textContent.includes('|')).length
      };
    });

    const pcScreenshotPath = path.join(ARTIFACTS_DIR, `audit_${phase}_pc_${topic.label}.png`);
    // Capture screenshot of either the table or the reading column viewport
    const captureEl = await page.$('.table-responsive') || await page.$('.topic-reading-col') || await page.$('#view-topics');
    if (captureEl) {
      await captureEl.screenshot({ path: pcScreenshotPath });
    }

    // 2. Móvil: 360 x 740
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      if (typeof LicenseService !== 'undefined') {
        LicenseService.setAdminMode(true, 'admin');
      }
    });
    await page.evaluate((id) => (typeof App !== 'undefined' ? App : window.App).openTopic(id), topic.id);
    await page.waitForSelector('#topic-markdown-body', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    // Scroll to table area
    await page.evaluate(() => {
      const table = document.querySelector('.table-responsive');
      if (table) {
        table.scrollIntoView({ behavior: 'instant', block: 'center' });
      } else {
        const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('|'));
        if (p) p.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await new Promise(r => setTimeout(r, 300));

    const mobileMetrics = await page.evaluate(() => {
      const tableWrapper = document.querySelector('.table-responsive');
      const table = document.querySelector('.reading-table');
      const readingCol = document.querySelector('.topic-reading-col');
      const mainContent = document.querySelector('.main-content');
      const body = document.body;

      return {
        hasTableResponsive: !!tableWrapper,
        tableWrapper: tableWrapper ? {
          scrollWidth: tableWrapper.scrollWidth,
          clientWidth: tableWrapper.clientWidth,
          hasScroll: tableWrapper.scrollWidth > tableWrapper.clientWidth,
          overflowX: window.getComputedStyle(tableWrapper).overflowX
        } : null,
        table: table ? {
          scrollWidth: table.scrollWidth,
          clientWidth: table.clientWidth,
          display: window.getComputedStyle(table).display,
          overflowX: window.getComputedStyle(table).overflowX,
          wordBreak: window.getComputedStyle(table).wordBreak
        } : null,
        readingCol: readingCol ? {
          overflowX: window.getComputedStyle(readingCol).overflowX,
          clientWidth: readingCol.clientWidth
        } : null,
        bodyOverflow: {
          windowInnerWidth: window.innerWidth,
          bodyScrollWidth: body.scrollWidth,
          hasBodyHorizontalOverflow: body.scrollWidth > window.innerWidth
        }
      };
    });

    const mobileScreenshotPath = path.join(ARTIFACTS_DIR, `audit_${phase}_mobile_${topic.label}.png`);
    const mobileCaptureEl = await page.$('.table-responsive') || await page.$('.topic-reading-col') || await page.$('#view-topics');
    if (mobileCaptureEl) {
      await mobileCaptureEl.screenshot({ path: mobileScreenshotPath });
    }

    auditReport.push({
      topic: topic.id,
      label: topic.label,
      pcMetrics,
      mobileMetrics,
      pcScreenshot: pcScreenshotPath,
      mobileScreenshot: mobileScreenshotPath
    });
  }

  // Also collect line-height styles for paragraphs, headings, blockquotes, callouts
  const lineHeights = await page.evaluate(() => {
    const getLh = (sel) => {
      const el = document.querySelector(sel);
      return el ? window.getComputedStyle(el).lineHeight : 'N/A';
    };
    const getFs = (sel) => {
      const el = document.querySelector(sel);
      return el ? window.getComputedStyle(el).fontSize : 'N/A';
    };
    return {
      readingP: { lh: getLh('.reading-p'), fs: getFs('.reading-p') },
      readingH1: { lh: getLh('.reading-h1'), fs: getFs('.reading-h1') },
      readingH2: { lh: getLh('.reading-h2'), fs: getFs('.reading-h2') },
      readingH3: { lh: getLh('.reading-h3'), fs: getFs('.reading-h3') },
      readingH4: { lh: getLh('.reading-h4'), fs: getFs('.reading-h4') },
      readingH5: { lh: getLh('.reading-h5'), fs: getFs('.reading-h5') },
      readingH6: { lh: getLh('.reading-h6'), fs: getFs('.reading-h6') },
      blockquote: { lh: getLh('blockquote'), fs: getFs('blockquote') },
      calloutCard: { lh: getLh('.callout-card'), fs: getFs('.callout-card') },
      tableTh: { lh: getLh('.reading-table th'), fs: getFs('.reading-table th') },
      tableTd: { lh: getLh('.reading-table td'), fs: getFs('.reading-table td') },
      ulItem: { lh: getLh('.ul-item'), fs: getFs('.ul-item') },
      olItem: { lh: getLh('.ol-item'), fs: getFs('.ol-item') }
    };
  });

  await browser.close();

  const reportPath = path.join(ARTIFACTS_DIR, `audit_report_${phase}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ auditReport, lineHeights }, null, 2), 'utf-8');
  console.log(`\nAuditoría [${phase.toUpperCase()}] finalizada con éxito.`);
  console.log(`Reporte guardado en: ${reportPath}`);
}

run().catch(err => {
  console.error('Error durante la auditoría:', err);
  process.exit(1);
});
