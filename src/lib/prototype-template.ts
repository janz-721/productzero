import type { PrototypeResult } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

export type PrototypeBlueprint = {
  brand: string;
  badge: string;
  headline: string;
  subheadline: string;
  coverage: string;
  primaryAction: string;
  categories: Array<{ title: string; caption: string; tag: string }>;
  services: Array<{ title: string; caption: string }>;
  activity: { title: string; caption: string; action: string };
  steps: string[];
  faqs: Array<{ question: string; answer: string }>;
  bottomNav: string[];
  colors: { primary: string; accent: string; background: string };
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

function clean(value: unknown, fallback: string, limit = 80) {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, limit) : fallback;
}

const REFERENCE_ONLY_COPY = /旧衣回收|衣物回收|书籍回收|图书回收|快递上门回收|手机数码|家用电器|家具清运|专业搬运|图书绘本都能收|按斤回收|750元|最高1元\/kg|带走称重/;

function cleanAdapted(value: unknown, fallback: string, limit = 80) {
  const text = clean(value, fallback, limit);
  return REFERENCE_ONLY_COPY.test(text) ? fallback : text;
}

function cleanList(value: unknown, fallback: string[], count: number) {
  const items = Array.isArray(value) ? value : [];
  return Array.from({ length: count }, (_, index) => {
    const fallbackItem = fallback[index % fallback.length];
    return cleanAdapted(items[index], fallbackItem);
  });
}

function cleanHex(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

export function normalizePrototypeBlueprint(value: unknown, idea: string): PrototypeBlueprint {
  const source = asRecord(value);
  const colorSource = asRecord(source.colors);
  const activitySource = asRecord(source.activity);
  const productName = idea.match(/^([^：:，,。]{2,12})/)?.[1]?.trim() || "回收小程序";

  const categoryFallback = [
    { title: "相机回收", caption: "单反、微单与镜头", tag: "热门回收" },
    { title: "数码回收", caption: "手机、平板与配件", tag: "高价回收" },
  ];
  const rawCategories = Array.isArray(source.categories) ? source.categories : [];
  const categories = categoryFallback.map((fallback, index) => {
    const item = asRecord(rawCategories[index]);
    return {
      title: cleanAdapted(item.title, fallback.title, 16),
      caption: cleanAdapted(item.caption, fallback.caption, 32),
      tag: cleanAdapted(item.tag, fallback.tag, 12),
    };
  });

  const serviceFallback = [
    { title: "单反相机", caption: "快门与镜头检测" },
    { title: "微单相机", caption: "在线快速估价" },
    { title: "充电配件", caption: "充电头与数据线" },
    { title: "耳机音响", caption: "按成色回收" },
  ];
  const rawServices = Array.isArray(source.services) ? source.services : [];
  const services = serviceFallback.map((fallback, index) => {
    const item = asRecord(rawServices[index]);
    return {
      title: cleanAdapted(item.title, fallback.title, 16),
      caption: cleanAdapted(item.caption, fallback.caption, 26),
    };
  });

  const faqFallback = [
    { question: "旧相机如何估价？", answer: "选择机型并描述成色，系统会给出预估区间。" },
    { question: "支持哪些上门方式？", answer: "校园内支持预约上门，校外可预约快递取件。" },
  ];
  const rawFaqs = Array.isArray(source.faqs) ? source.faqs : [];
  const faqs = faqFallback.map((fallback, index) => {
    const item = asRecord(rawFaqs[index]);
    return {
      question: cleanAdapted(item.question, fallback.question, 30),
      answer: cleanAdapted(item.answer, fallback.answer, 60),
    };
  });

  return {
    brand: cleanAdapted(source.brand, productName, 12),
    badge: cleanAdapted(source.badge, "校园环保计划", 16),
    headline: cleanAdapted(source.headline, "旧设备，也有新去处。", 28),
    subheadline: cleanAdapted(source.subheadline, "在线估价 · 上门回收 · 环保积分", 36),
    coverage: cleanAdapted(source.coverage, "覆盖校园与周边社区", 32),
    primaryAction: cleanAdapted(source.primaryAction, "立即估价", 12),
    categories,
    services,
    activity: {
      title: cleanAdapted(activitySource.title, "预约上门回收", 20),
      caption: cleanAdapted(activitySource.caption, "验机确认后当天结算环保积分", 36),
      action: cleanAdapted(activitySource.action, "去预约", 8),
    },
    steps: cleanList(source.steps, ["在线估价", "预约上门", "验机确认", "环保结算"], 4),
    faqs,
    bottomNav: cleanList(source.bottomNav, ["首页", "估价", "订单", "我的"], 4),
    colors: {
      primary: cleanHex(colorSource.primary, "#147bf5"),
      accent: cleanHex(colorSource.accent, "#ff8a24"),
      background: cleanHex(colorSource.background, "#f4f8fd"),
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const categoryIcons = ["📷", "📱"];
const serviceIcons = ["🔋", "🔌", "🎧", "📦"];

export function renderPrototypeHtml(plan: PrototypeBlueprint) {
  const categories = plan.categories.map((item, index) => `
    <article class="category-card">
      <div class="category-copy">
        <span class="mini-tag">${escapeHtml(item.tag)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.caption)}</p>
        <span class="arrow">›</span>
      </div>
      <div class="category-icon" aria-hidden="true">${categoryIcons[index]}</div>
    </article>`).join("");

  const services = plan.services.map((item, index) => `
    <article class="service-item">
      <span class="service-icon" aria-hidden="true">${serviceIcons[index]}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.caption)}</small>
    </article>`).join("");

  const steps = plan.steps.map((step, index) => `
    <li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(step)}</span></li>`).join("");

  const faqs = plan.faqs.map((item) => `
    <article class="faq-item">
      <h3>${escapeHtml(item.question)} <span>›</span></h3>
      <p>${escapeHtml(item.answer)}</p>
    </article>`).join("");

  const nav = plan.bottomNav.map((item, index) => `
    <div class="${index === 0 ? "active" : ""}"><i aria-hidden="true">${["⌂", "◎", "▤", "○"][index]}</i><span>${escapeHtml(item)}</span></div>`).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plan.brand)} - 小程序原型</title>
  <style>
    :root { --primary: ${plan.colors.primary}; --accent: ${plan.colors.accent}; --bg: ${plan.colors.background}; }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body { margin: 0; color: #16324f; background: var(--bg); font-family: "Microsoft YaHei", "PingFang SC", sans-serif; padding-bottom: 70px; }
    .hero { position: relative; overflow: hidden; padding: 12px 16px 26px; color: #fff; background: linear-gradient(158deg, #0878f6 0%, #43aefc 60%, #dff4ff 100%); border-radius: 0 0 26px 26px; }
    .hero::after { content: ""; position: absolute; width: 150px; height: 150px; right: -50px; top: 58px; border: 18px solid rgba(255,255,255,.22); border-radius: 50%; transform: rotate(-18deg); }
    .status, .brand-row, .hero-copy { position: relative; z-index: 1; }
    .status { display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; opacity: .9; }
    .notch { width: 82px; height: 20px; border-radius: 0 0 13px 13px; background: #0d1a2b; margin: -12px auto 0; }
    .brand-row { display: flex; justify-content: space-between; align-items: center; margin-top: 3px; }
    .brand { font-size: 17px; font-weight: 900; letter-spacing: .5px; text-shadow: 0 2px 6px rgba(0,60,140,.18); }
    .brand small { margin-left: 7px; font-size: 8px; font-weight: 500; opacity: .86; }
    .top-chip { border: 1px solid rgba(255,255,255,.5); background: rgba(255,255,255,.18); border-radius: 18px; padding: 6px 9px; font-size: 8px; font-weight: 700; }
    .hero-copy { padding-top: 17px; }
    .hero-copy h1 { margin: 0; max-width: 245px; font-size: 27px; line-height: 1.16; letter-spacing: -1px; text-shadow: 0 3px 10px rgba(0,68,150,.18); }
    .hero-copy p { margin: 8px 0 0; font-size: 11px; line-height: 1.5; opacity: .92; }
    .hero-badge { display: inline-flex; align-items: center; margin-top: 11px; padding: 5px 10px; border-radius: 20px; background: var(--accent); font-size: 9px; font-weight: 800; box-shadow: 0 5px 12px rgba(255,116,20,.24); }
    .content { position: relative; z-index: 2; margin-top: -12px; padding: 0 12px; }
    .coverage { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 11px 12px; border-radius: 13px; background: #fff; box-shadow: 0 7px 22px rgba(29,73,117,.1); font-size: 9px; font-weight: 700; color: #54718b; }
    .coverage strong { color: var(--primary); }
    .coverage span:last-child { flex-shrink: 0; padding: 4px 8px; border-radius: 12px; background: #e7f3ff; color: var(--primary); }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin: 16px 2px 9px; }
    .section-head h2 { margin: 0; font-size: 13px; letter-spacing: -.2px; }
    .section-head span { color: #8ba0b3; font-size: 8px; }
    .category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    .category-card { position: relative; min-height: 110px; overflow: hidden; padding: 13px 11px; border-radius: 16px; background: linear-gradient(145deg, #e5f4ff, #f6fbff); border: 1px solid rgba(25,117,213,.1); box-shadow: 0 6px 16px rgba(35,104,170,.08); }
    .category-card:nth-child(2) { background: linear-gradient(145deg, #efe9ff, #faf7ff); }
    .category-copy { position: relative; z-index: 2; }
    .mini-tag { display: inline-block; padding: 2px 6px; border-radius: 8px; background: var(--accent); color: #fff; font-size: 7px; font-weight: 800; }
    .category-card h3 { margin: 7px 0 3px; font-size: 16px; }
    .category-card p { margin: 0; color: #71869a; font-size: 8px; }
    .category-icon { position: absolute; right: 7px; bottom: 5px; font-size: 39px; transform: rotate(-8deg); filter: drop-shadow(0 5px 5px rgba(39,79,118,.15)); }
    .arrow { display: inline-block; margin-top: 6px; color: var(--primary); font-size: 18px; font-weight: 900; line-height: 1; }
    .service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 10px 7px; border-radius: 15px; background: #fff; box-shadow: 0 5px 18px rgba(36,75,107,.06); }
    .service-item { min-width: 0; text-align: center; }
    .service-icon { display: grid; place-items: center; width: 33px; height: 33px; margin: 0 auto 5px; border-radius: 10px; background: #edf6ff; font-size: 17px; }
    .service-item strong { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 9px; }
    .service-item small { display: block; overflow: hidden; margin-top: 2px; color: #91a2b1; font-size: 7px; white-space: nowrap; text-overflow: ellipsis; }
    .activity { display: flex; align-items: center; gap: 11px; margin-top: 13px; padding: 13px; border-radius: 16px; background: linear-gradient(110deg, #dff3ff, #eef8ff 62%, #d7f2e6); border: 1px solid #cceaff; }
    .activity-mark { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 auto; border-radius: 50%; background: #fff; font-size: 23px; box-shadow: 0 5px 13px rgba(24,128,214,.12); }
    .activity-copy { min-width: 0; flex: 1; }
    .activity h3 { margin: 0; color: #1475cd; font-size: 13px; }
    .activity p { margin: 3px 0 0; color: #6c91a9; font-size: 8px; }
    .activity button { flex: 0 0 auto; border: 0; border-radius: 50%; width: 36px; height: 36px; background: var(--primary); color: #fff; font-size: 8px; font-weight: 800; }
    .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin: 0; padding: 12px 6px; list-style: none; background: #fff; border-radius: 14px; }
    .steps li { text-align: center; color: #60778b; font-size: 8px; }
    .steps b { display: block; margin-bottom: 4px; color: var(--primary); font-size: 9px; }
    .faq-item { margin-top: 7px; padding: 11px 12px; border-radius: 13px; background: #fff; border: 1px solid #e8f0f6; }
    .faq-item h3 { display: flex; justify-content: space-between; gap: 10px; margin: 0; font-size: 10px; }
    .faq-item h3 span { color: #9aabba; }
    .faq-item p { margin: 5px 0 0; color: #8294a4; font-size: 8px; line-height: 1.6; }
    .bottom-nav { position: fixed; z-index: 10; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(4, 1fr); padding: 7px 7px 6px; background: rgba(255,255,255,.96); border-top: 1px solid #e5edf3; box-shadow: 0 -5px 18px rgba(35,73,105,.07); }
    .bottom-nav div { color: #8fa0af; text-align: center; font-size: 7px; }
    .bottom-nav i { display: block; margin-bottom: 2px; font-size: 16px; font-style: normal; }
    .bottom-nav .active { color: var(--primary); font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <div class="status"><span>9:41</span><span>5G &nbsp; ●●●</span></div>
      <div class="notch"></div>
      <div class="brand-row"><div class="brand">${escapeHtml(plan.brand)}<small>${escapeHtml(plan.badge)}</small></div><span class="top-chip">••• &nbsp; ⌾</span></div>
      <div class="hero-copy"><h1>${escapeHtml(plan.headline)}</h1><p>${escapeHtml(plan.subheadline)}</p><span class="hero-badge">${escapeHtml(plan.primaryAction)} →</span></div>
    </header>
    <div class="content">
      <section class="coverage"><span>♻ <strong>${escapeHtml(plan.coverage)}</strong></span><span>立即回收 ›</span></section>
      <div class="section-head"><h2>选择回收类型</h2><span>高价 · 便捷 · 环保</span></div>
      <section class="category-grid">${categories}</section>
      <div class="section-head"><h2>热门回收</h2><span>更多品类 ›</span></div>
      <section class="service-grid">${services}</section>
      <section class="activity"><div class="activity-mark">♻</div><div class="activity-copy"><h3>${escapeHtml(plan.activity.title)}</h3><p>${escapeHtml(plan.activity.caption)}</p></div><button>${escapeHtml(plan.activity.action)}</button></section>
      <div class="section-head"><h2>回收流程</h2><span>全程可追踪</span></div>
      <ol class="steps">${steps}</ol>
      <div class="section-head"><h2>热门问题</h2><span>更多问题 ›</span></div>
      <section>${faqs}</section>
    </div>
  </main>
  <nav class="bottom-nav">${nav}</nav>
</body>
</html>`;
}

export function buildPrototypeResult(plan: PrototypeBlueprint): PrototypeResult {
  return {
    summary: `${plan.brand}采用${plan.headline}作为首屏主张，并保留分类入口、服务网格、活动、流程和 FAQ 的完整信息结构。`,
    layout: [
      "顶部品牌与活动横幅",
      "双列分类入口与四项服务网格",
      "回收活动、流程和 FAQ",
      "固定底部导航",
    ],
    colors: [plan.colors.primary, plan.colors.accent, plan.colors.background],
    typography: "粗体标题强调回收主张，紧凑正文承载价格、流程与帮助信息。",
    components: [
      "品牌栏",
      "双列分类卡片",
      "四项服务网格",
      "预约活动条",
      "流程与 FAQ",
    ],
    rationale: ["保留参考图的高信息密度和卡片层级，避免退化为欢迎页。"],
    changes: ["将图标改为内联符号，消除外部图片破图风险。"],
    warnings: [],
    html: renderPrototypeHtml(plan),
  };
}