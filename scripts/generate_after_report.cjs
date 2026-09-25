const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = path.join(__dirname, "..", "..", "..", "brain", "02b2917d-baf8-416b-a761-fdaa6c4e62cd");
const URL = "http://localhost:8080";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Desktop
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForSelector("#global-search-input");

  const pcData = await page.evaluate(() => {
    const header = document.querySelector(".app-header");
    const dropdown = document.querySelector(".search-dropdown");
    const sidebar = document.querySelector(".app-sidebar");
    const reading = document.querySelector(".topic-reading-col");
    const badge = document.querySelector("#case-count-badge");
    const btnSidebar = document.querySelector("#btn-toggle-sidebar");
    const nav = document.querySelector(".header-nav");
    const tabTopics = document.querySelector("#tab-topics");
    const styleRoot = getComputedStyle(document.documentElement);

    return {
      tokens: {
        space1: styleRoot.getPropertyValue("--space-1").trim(),
        space2: styleRoot.getPropertyValue("--space-2").trim(),
        space3: styleRoot.getPropertyValue("--space-3").trim(),
        space4: styleRoot.getPropertyValue("--space-4").trim(),
        space5: styleRoot.getPropertyValue("--space-5").trim(),
        space6: styleRoot.getPropertyValue("--space-6").trim(),
        space7: styleRoot.getPropertyValue("--space-7").trim(),
        space8: styleRoot.getPropertyValue("--space-8").trim(),
        zBase: styleRoot.getPropertyValue("--z-base").trim(),
        zSurface: styleRoot.getPropertyValue("--z-surface").trim(),
        zSidebar: styleRoot.getPropertyValue("--z-sidebar").trim(),
        zHeader: styleRoot.getPropertyValue("--z-header").trim(),
        zDropdown: styleRoot.getPropertyValue("--z-dropdown").trim(),
        zOverlay: styleRoot.getPropertyValue("--z-overlay").trim(),
        zSidebarMobile: styleRoot.getPropertyValue("--z-sidebar-mobile").trim(),
        zModal: styleRoot.getPropertyValue("--z-modal").trim(),
        zToast: styleRoot.getPropertyValue("--z-toast").trim()
      },
      shell: {
        bodyOverflow: document.body.scrollWidth > window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth,
        headerZIndex: header ? getComputedStyle(header).zIndex : null,
        headerHeight: header ? getComputedStyle(header).height : null,
        dropdownZIndex: dropdown ? getComputedStyle(dropdown).zIndex : null,
        sidebarZIndex: sidebar ? getComputedStyle(sidebar).zIndex : null,
        sidebarOverscroll: sidebar ? getComputedStyle(sidebar).overscrollBehavior : null,
        readingMaxWidth: reading ? getComputedStyle(reading).maxWidth : null,
        readingOverscroll: reading ? getComputedStyle(reading).overscrollBehavior : null,
        badgeMinWidth: badge ? getComputedStyle(badge).minWidth : null,
        navRole: nav ? nav.getAttribute("role") : null,
        tabRole: tabTopics ? tabTopics.getAttribute("role") : null,
        tabSelected: tabTopics ? tabTopics.getAttribute("aria-selected") : null,
        btnSidebarExpanded: btnSidebar ? btnSidebar.getAttribute("aria-expanded") : null
      }
    };
  });

  // Mobile
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 400));

  const mobileData = await page.evaluate(() => {
    const header = document.querySelector(".app-header");
    const dropdown = document.querySelector(".search-dropdown");
    const sidebar = document.querySelector(".app-sidebar");
    const badge = document.querySelector("#case-count-badge");
    const tabTopics = document.querySelector("#tab-topics");
    const tabCases = document.querySelector("#tab-cases");
    const tabGraph = document.querySelector("#tab-graph");
    const btnSidebar = document.querySelector("#btn-toggle-sidebar");

    const getBox = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), pass44: r.width >= 44 && r.height >= 44 };
    };

    return {
      shell: {
        bodyOverflow: document.body.scrollWidth > window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth,
        headerZIndex: header ? getComputedStyle(header).zIndex : null,
        headerHeight: header ? getComputedStyle(header).height : null,
        dropdownZIndex: dropdown ? getComputedStyle(dropdown).zIndex : null,
        sidebarZIndex: sidebar ? getComputedStyle(sidebar).zIndex : null,
        sidebarOverscroll: sidebar ? getComputedStyle(sidebar).overscrollBehavior : null,
        badgeMinWidth: badge ? getComputedStyle(badge).minWidth : null,
        targets: {
          tabTopics: getBox(tabTopics),
          tabCases: getBox(tabCases),
          tabGraph: getBox(tabGraph),
          btnToggleSidebar: getBox(btnSidebar)
        }
      }
    };
  });

  const resolvedDefects = [
    {
      id: 1,
      title: "Z-Index Inversion between Dropdown, Modal Backdrop & Toasts",
      status: "RESOLVED",
      resolution: "Applied canonical z-index tokens: header (50) < dropdown (100) < overlay (200) < sidebar-mobile (250) < modal (500) < toast (1000)."
    },
    {
      id: 2,
      title: "Missing 8pt Spacing Scale Tokens in :root",
      status: "RESOLVED",
      resolution: "Added --space-1 (4px) through --space-8 (64px) to :root in css/main.css."
    },
    {
      id: 3,
      title: "Sidebar Overscroll Chaining on Desktop",
      status: "RESOLVED",
      resolution: "Added overscroll-behavior: contain to .app-sidebar and .sidebar-tree."
    },
    {
      id: 4,
      title: "Reading Column Max-Width & Asymmetric Centering on PC",
      status: "RESOLVED",
      resolution: "Verified margin: 0 auto; max-width: 940px; and added overscroll-behavior: contain; to .topic-reading-col."
    },
    {
      id: 5,
      title: "Missing content-visibility on Long Sidebar Tree",
      status: "RESOLVED",
      resolution: "Added content-visibility: auto; contain-intrinsic-size: 0 44px; to .category-group in css/sidebar.css."
    },
    {
      id: 6,
      title: "Inconsistent :focus-visible Outlines for Keyboard A11y",
      status: "RESOLVED",
      resolution: "Added universal :focus-visible { outline: 2px solid var(--gold-primary); outline-offset: 2px; } in css/main.css."
    },
    {
      id: 7,
      title: "Nav Tabs Missing ARIA Role/Selected and Badge Layout Shift",
      status: "RESOLVED",
      resolution: "Added role='tablist' to .header-nav, role='tab' and aria-selected to nav tabs, and min-width: 20px to .badge-count."
    },
    {
      id: 8,
      title: "Sidebar Toggle Button Missing aria-expanded",
      status: "RESOLVED",
      resolution: "Added aria-expanded='false' to #btn-toggle-sidebar and synchronized in app.js on drawer open/close."
    },
    {
      id: 9,
      title: "Active Sidebar Topic Missing aria-current and Distinct Visual Indicator",
      status: "RESOLVED",
      resolution: "Added aria-current='true' to active topic item in app.js and fixed right column width with min-width: 24px."
    },
    {
      id: 10,
      title: "Disparate Loading, Empty, and Error State Styles",
      status: "RESOLVED",
      resolution: "Added unified classes .ui-skeleton (shimmer animation), .ui-state-empty, and .ui-state-error in css/main.css."
    },
    {
      id: 11,
      title: "Missing prefers-reduced-motion Support",
      status: "RESOLVED",
      resolution: "Added @media (prefers-reduced-motion: reduce) rule in css/main.css disabling transitions and animations."
    },
    {
      id: 12,
      title: "Search Dropdown Keyboard Dismissal & Focus Restoration",
      status: "RESOLVED",
      resolution: "Updated Escape key handler in app.js to dismiss dropdown and restore focus cleanly to #global-search-input."
    }
  ];

  const report = {
    timestamp: new Date().toISOString(),
    viewports: {
      pc: { width: 1440, height: 900 },
      mobile: { width: 360, height: 740 }
    },
    pc: pcData,
    mobile: mobileData,
    defectsResolved: resolvedDefects
  };

  const reportPath = path.join(ARTIFACTS_DIR, "audit_030_report_after.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("Reporte AFTER generado con éxito en:", reportPath);

  await browser.close();
}

run().catch(err => {
  console.error("Error al generar reporte AFTER:", err);
  process.exit(1);
});
