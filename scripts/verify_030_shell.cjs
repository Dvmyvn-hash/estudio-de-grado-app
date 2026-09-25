const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = path.join(__dirname, "..", "..", "..", "brain", "02b2917d-baf8-416b-a761-fdaa6c4e62cd");
const URL = "http://localhost:8080";

async function verify() {
  console.log("Iniciando verificación Puppeteer Prompt 030...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  const results = {
    checks: [],
    screenshots: []
  };

  // 1. Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForSelector("#global-search-input");

  // Check 1: Tokens in :root
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      space1: style.getPropertyValue("--space-1").trim(),
      space4: style.getPropertyValue("--space-4").trim(),
      space8: style.getPropertyValue("--space-8").trim(),
      zHeader: style.getPropertyValue("--z-header").trim(),
      zDropdown: style.getPropertyValue("--z-dropdown").trim(),
      zModal: style.getPropertyValue("--z-modal").trim(),
      zToast: style.getPropertyValue("--z-toast").trim(),
      zSidebar: style.getPropertyValue("--z-sidebar").trim()
    };
  });
  console.log("Tokens evaluados:", tokens);
  results.checks.push({
    name: "Tokens canónicos :root",
    pass: tokens.space1 === "4px" && tokens.space4 === "16px" && tokens.space8 === "64px" &&
          tokens.zHeader === "50" && tokens.zDropdown === "100" && tokens.zModal === "500" && tokens.zToast === "1000",
    details: tokens
  });

  // Check 2: ARIA en navegación
  const navAria = await page.evaluate(() => {
    const nav = document.querySelector(".header-nav");
    const tabTopics = document.getElementById("tab-topics");
    const tabCases = document.getElementById("tab-cases");
    const btnSidebar = document.getElementById("btn-toggle-sidebar");
    return {
      navRole: nav ? nav.getAttribute("role") : null,
      tabTopicsRole: tabTopics ? tabTopics.getAttribute("role") : null,
      tabTopicsSelected: tabTopics ? tabTopics.getAttribute("aria-selected") : null,
      tabCasesRole: tabCases ? tabCases.getAttribute("role") : null,
      tabCasesSelected: tabCases ? tabCases.getAttribute("aria-selected") : null,
      btnSidebarExpanded: btnSidebar ? btnSidebar.getAttribute("aria-expanded") : null
    };
  });
  console.log("Nav ARIA:", navAria);
  results.checks.push({
    name: "ARIA en header nav y sidebar button",
    pass: navAria.navRole === "tablist" && navAria.tabTopicsRole === "tab" && navAria.tabTopicsSelected === "true" &&
          navAria.tabCasesRole === "tab" && navAria.tabCasesSelected === "false" && navAria.btnSidebarExpanded === "true",
    details: navAria
  });

  // Check 3: Badge count min-width
  const badgeMetrics = await page.evaluate(() => {
    const badge = document.getElementById("case-count-badge");
    if (!badge) return null;
    const style = getComputedStyle(badge);
    const rect = badge.getBoundingClientRect();
    return {
      minWidth: style.minWidth,
      width: rect.width,
      display: style.display
    };
  });
  results.checks.push({
    name: "Badge count min-width para prevenir layout shift",
    pass: badgeMetrics && badgeMetrics.minWidth === "20px" && badgeMetrics.width >= 20,
    details: badgeMetrics
  });

  // Check 4: Abrir un tema y verificar aria-current="true"
  await page.evaluate(() => {
    const firstItem = document.querySelector(".topic-tree-item");
    if (firstItem) firstItem.click();
  });
  await new Promise(r => setTimeout(r, 300));

  const activeTopicAria = await page.evaluate(() => {
    const activeItem = document.querySelector(".topic-tree-item.active");
    return {
      hasActive: !!activeItem,
      ariaCurrent: activeItem ? activeItem.getAttribute("aria-current") : null
    };
  });
  results.checks.push({
    name: "Topic tree item activo tiene aria-current='true'",
    pass: activeTopicAria.hasActive && activeTopicAria.ariaCurrent === "true",
    details: activeTopicAria
  });

  // Check 5: Scroll containment en sidebar y lectura
  const containment = await page.evaluate(() => {
    const sidebar = document.getElementById("app-sidebar");
    const readingCol = document.querySelector(".topic-reading-col");
    const tree = document.querySelector(".sidebar-tree");
    return {
      sidebarOverscroll: sidebar ? getComputedStyle(sidebar).overscrollBehavior : null,
      treeOverscroll: tree ? getComputedStyle(tree).overscrollBehavior : null,
      readingOverscroll: readingCol ? getComputedStyle(readingCol).overscrollBehavior : null
    };
  });
  results.checks.push({
    name: "Scroll containment (overscroll-behavior: contain)",
    pass: containment.sidebarOverscroll === "contain" && containment.treeOverscroll === "contain" && containment.readingOverscroll === "contain",
    details: containment
  });

  // Screenshot PC after
  const pcPath = path.join(ARTIFACTS_DIR, "audit_030_pc_verified.png");
  await page.screenshot({ path: pcPath, fullPage: false });
  results.screenshots.push(pcPath);

  // Check 6: Mobile 360px viewport overflow
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 400));

  const mobileMetrics = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const header = document.querySelector(".app-header");
    const badge = document.getElementById("case-count-badge");
    return {
      scrollWidth: Math.max(docWidth, bodyWidth),
      clientWidth,
      hasOverflow: Math.max(docWidth, bodyWidth) > clientWidth,
      headerZIndex: header ? getComputedStyle(header).zIndex : null,
      badgeMinWidth: badge ? getComputedStyle(badge).minWidth : null
    };
  });
  results.checks.push({
    name: "Cero overflow horizontal en móvil (360px)",
    pass: !mobileMetrics.hasOverflow,
    details: mobileMetrics
  });

  // Screenshot Mobile after
  const mobilePath = path.join(ARTIFACTS_DIR, "audit_030_mobile_verified.png");
  await page.screenshot({ path: mobilePath, fullPage: false });
  results.screenshots.push(mobilePath);

  // Check 7: Tecla Escape cierra búsqueda y recupera foco
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.type("#global-search-input", "compraventa");
  await new Promise(r => setTimeout(r, 400));

  const dropdownVisibleBefore = await page.evaluate(() => {
    const dd = document.getElementById("search-results-dropdown");
    return dd && !dd.classList.contains("hidden");
  });

  await page.keyboard.press("Escape");
  await new Promise(r => setTimeout(r, 200));

  const dropdownHiddenAfter = await page.evaluate(() => {
    const dd = document.getElementById("search-results-dropdown");
    return dd && dd.classList.contains("hidden");
  });

  results.checks.push({
    name: "Escape cierra dropdown de búsqueda",
    pass: dropdownVisibleBefore && dropdownHiddenAfter,
    details: { dropdownVisibleBefore, dropdownHiddenAfter }
  });

  await browser.close();

  console.log("\n================ VERIFICACIÓN PROMPT 030 RESUMEN ================");
  let allPass = true;
  results.checks.forEach((c, idx) => {
    const status = c.pass ? "✓ PASS" : "✕ FAIL";
    console.log(`${idx + 1}. [${status}] ${c.name}`);
    if (!c.pass) allPass = false;
  });
  console.log("==================================================================\n");

  if (!allPass) {
    process.exit(1);
  }
}

verify().catch(err => {
  console.error("Error en verificación:", err);
  process.exit(1);
});
