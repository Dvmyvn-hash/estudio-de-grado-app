const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/dpint/.gemini/antigravity-ide/brain/02b2917d-baf8-416b-a761-fdaa6c4e62cd';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function run() {
  console.log('=== FASE 0: AUDITORÍA VISUAL Y MÉTRICAS DE SHELL (PROMPT 030) ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const report = {
    timestamp: new Date().toISOString(),
    viewports: { pc: { width: 1440, height: 900 }, mobile: { width: 360, height: 740 } },
    pc: {},
    mobile: {},
    defects: []
  };

  // Helper to capture
  async function snap(name, selector = null) {
    const filename = `audit_030_${name}.png`;
    const fullPath = path.join(ARTIFACTS_DIR, filename);
    if (selector) {
      const el = await page.$(selector);
      if (el) {
        await el.screenshot({ path: fullPath });
        console.log(`[Snap] Element ${selector} -> ${filename}`);
        return;
      }
    }
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`[Snap] Viewport -> ${filename}`);
  }

  // --- 1. AUDITORÍA PC (1440 x 900) ---
  console.log('\n--- 1. AUDITANDO ESCRITORIO (1440x900) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

  // Reposo
  await snap('pc_header_reposo', '.app-header');
  await snap('pc_shell_overview');

  // Metrics: Shell & Layout
  report.pc.shell = await page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const headerStyle = window.getComputedStyle(header);
    const body = document.body;
    const sidebar = document.querySelector('#app-sidebar');
    const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
    const mainContent = document.querySelector('#main-content-area');
    const readingCol = document.querySelector('.topic-reading-col');
    const dropdown = document.querySelector('#search-results-dropdown');
    const modal = document.querySelector('.modal-backdrop');

    return {
      bodyOverflow: body.scrollWidth > window.innerWidth,
      bodyScrollWidth: body.scrollWidth,
      windowWidth: window.innerWidth,
      headerZIndex: headerStyle.zIndex,
      headerHeight: headerStyle.height,
      dropdownZIndex: dropdown ? window.getComputedStyle(dropdown).zIndex : null,
      sidebarZIndex: sidebarStyle ? sidebarStyle.zIndex : null,
      sidebarOverscroll: sidebarStyle ? sidebarStyle.overscrollBehavior : null,
      readingMaxWidth: readingCol ? window.getComputedStyle(readingCol).maxWidth : null,
      readingMargin: readingCol ? window.getComputedStyle(readingCol).margin : null
    };
  });

  // Dropdown abierto (Semántico)
  await page.click('#global-search-input');
  await page.type('#global-search-input', 'nulidad');
  await new Promise(r => setTimeout(r, 400));
  await snap('pc_search_semantic_dropdown');

  // Modo Q&A
  await page.click('#search-mode-qa');
  await new Promise(r => setTimeout(r, 400));
  await snap('pc_search_qa_dropdown');

  // Empty state search
  await page.evaluate(() => {
    const inp = document.querySelector('#global-search-input');
    inp.value = '';
  });
  await page.type('#global-search-input', 'termino_inexistente_xyz_123');
  await new Promise(r => setTimeout(r, 400));
  await snap('pc_search_empty_state');

  // Limpiar búsqueda
  await page.evaluate(() => {
    const inp = document.querySelector('#global-search-input');
    inp.value = '';
    const dd = document.querySelector('#search-results-dropdown');
    if (dd) dd.classList.add('hidden');
  });

  // Visor Cédula Larga
  await page.evaluate(() => {
    if (typeof App !== 'undefined') App.openTopic('civil-actojuridi-1-1');
  });
  await new Promise(r => setTimeout(r, 500));
  await snap('pc_topic_viewer_long');

  // Taller de Casos
  await page.click('#tab-cases');
  await new Promise(r => setTimeout(r, 500));
  await snap('pc_view_cases');

  // Grafo de Instituciones
  await page.click('#tab-graph');
  await new Promise(r => setTimeout(r, 600));
  await snap('pc_view_graph');

  // Modal / Paywall
  await page.click('#tab-topics');
  await page.evaluate(() => {
    if (typeof App !== 'undefined') App.openUnlockModal();
  });
  await new Promise(r => setTimeout(r, 400));
  await snap('pc_unlock_modal');
  await page.evaluate(() => {
    const modal = document.querySelector('#unlock-modal');
    if (modal) modal.classList.add('hidden');
  });
  await new Promise(r => setTimeout(r, 300));


  // --- 2. AUDITORÍA MÓVIL (360 x 740) ---
  console.log('\n--- 2. AUDITANDO MÓVIL (360x740) ---');
  await page.setViewport({ width: 360, height: 740 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

  // Reposo móvil
  await snap('mobile_header_reposo');

  report.mobile.shell = await page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const headerStyle = window.getComputedStyle(header);
    const body = document.body;
    const sidebar = document.querySelector('#app-sidebar');
    const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
    const dropdown = document.querySelector('#search-results-dropdown');
    const tabTopics = document.querySelector('#tab-topics');
    const tabCases = document.querySelector('#tab-cases');
    const tabGraph = document.querySelector('#tab-graph');
    const btnToggleSidebar = document.querySelector('#btn-toggle-sidebar');
    const searchPillSemantic = document.querySelector('#search-mode-semantic');
    const searchPillQa = document.querySelector('#search-mode-qa');

    function getTargetSize(el) {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height), pass44: rect.width >= 44 && rect.height >= 44 };
    }

    return {
      bodyOverflow: body.scrollWidth > window.innerWidth,
      bodyScrollWidth: body.scrollWidth,
      windowWidth: window.innerWidth,
      headerZIndex: headerStyle.zIndex,
      headerHeight: headerStyle.height,
      dropdownZIndex: dropdown ? window.getComputedStyle(dropdown).zIndex : null,
      sidebarZIndex: sidebarStyle ? sidebarStyle.zIndex : null,
      sidebarOverscroll: sidebarStyle ? sidebarStyle.overscrollBehavior : null,
      targets: {
        tabTopics: getTargetSize(tabTopics),
        tabCases: getTargetSize(tabCases),
        tabGraph: getTargetSize(tabGraph),
        btnToggleSidebar: getTargetSize(btnToggleSidebar),
        searchPillSemantic: getTargetSize(searchPillSemantic),
        searchPillQa: getTargetSize(searchPillQa)
      }
    };
  });

  // Mobile Dropdown abierto (Semántico)
  await page.click('#global-search-input');
  await page.type('#global-search-input', 'contrato');
  await new Promise(r => setTimeout(r, 400));
  await snap('mobile_search_semantic_dropdown');

  // Mobile Modo Q&A
  await page.click('#search-mode-qa');
  await new Promise(r => setTimeout(r, 400));
  await snap('mobile_search_qa_dropdown');

  // Limpiar búsqueda
  await page.evaluate(() => {
    const inp = document.querySelector('#global-search-input');
    inp.value = '';
    const dd = document.querySelector('#search-results-dropdown');
    if (dd) dd.classList.add('hidden');
  });

  // Sidebar abierto en móvil
  await page.click('#btn-toggle-sidebar');
  await new Promise(r => setTimeout(r, 400));
  await snap('mobile_sidebar_open');

  // Cerrar sidebar
  await page.click('#btn-close-sidebar-mobile');
  await new Promise(r => setTimeout(r, 400));
  await snap('mobile_sidebar_closed');

  // Visor Cédula móvil
  await page.evaluate(() => {
    if (typeof App !== 'undefined') App.openTopic('civil-actojuridi-1-1');
  });
  await new Promise(r => setTimeout(r, 500));
  await snap('mobile_topic_viewer');

  // Taller de Casos móvil
  await page.click('#tab-cases');
  await new Promise(r => setTimeout(r, 500));
  await snap('mobile_view_cases');

  // Grafo móvil
  await page.click('#tab-graph');
  await new Promise(r => setTimeout(r, 600));
  await snap('mobile_view_graph');

  // Modal / Paywall móvil
  await page.click('#tab-topics');
  await page.evaluate(() => {
    if (typeof App !== 'undefined') App.openUnlockModal();
  });
  await new Promise(r => setTimeout(r, 400));
  await snap('mobile_unlock_modal');
  await page.evaluate(() => {
    const modal = document.querySelector('#unlock-modal');
    if (modal) modal.classList.add('hidden');
  });

  // Métricas A11y & Focus states
  report.a11y = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button:not([disabled])'));
    const inputs = Array.from(document.querySelectorAll('input:not([disabled])'));
    const focusable = [...buttons, ...inputs];
    
    // Check focus outline style on sample elements
    const tab = document.querySelector('#tab-topics');
    const inp = document.querySelector('#global-search-input');
    const btnMenu = document.querySelector('#btn-toggle-sidebar');

    function checkFocusStyle(el) {
      if (!el) return null;
      el.focus();
      const style = window.getComputedStyle(el);
      return {
        outline: style.outline,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow
      };
    }

    return {
      totalFocusable: focusable.length,
      tabFocus: checkFocusStyle(tab),
      inputFocus: checkFocusStyle(inp),
      btnMenuFocus: checkFocusStyle(btnMenu)
    };
  });

  const reportPath = path.join(ARTIFACTS_DIR, 'audit_030_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReporte guardado en: ${reportPath}`);

  await browser.close();
  console.log('Auditoría completada exitosamente.');
}

run().catch(err => {
  console.error('Error en auditoría:', err);
  process.exit(1);
});
