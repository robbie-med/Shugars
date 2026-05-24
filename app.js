// ────────────────────────────────────────────────────────────
//  app.js — Glucose & Mortality Risk Explorer
//  Vanilla JS, zero dependencies. Static-hostable on GitHub Pages.
// ────────────────────────────────────────────────────────────

// ── Hazard-ratio table — Yi et al. 2017, Table 2 ────────────
//   HR per 18 mg/dL (1 mmol/L) increase in fasting glucose,
//   stratified by sex, age group, and FSG range. Verified
//   against the paper's text extraction (Table 2 in full).
//     lo  = HR per +18 mg/dL within  <100 mg/dL  range  (Table 2)
//     pd  = HR per +18 mg/dL within 100–125 mg/dL range  (Table 2)
//     dm  = HR per +18 mg/dL within 100–199 mg/dL range  (Table 2)
const HR_TABLE = {
  male: {
    "18–34": { lo: 1.00, pd: 1.30, dm: 1.15 },
    "35–44": { lo: 0.95, pd: 1.31, dm: 1.17 },
    "45–54": { lo: 0.97, pd: 1.24, dm: 1.15 },
    "55–64": { lo: 0.93, pd: 1.21, dm: 1.14 },
    "65–74": { lo: 0.95, pd: 1.17, dm: 1.11 },
    "75–99": { lo: 0.95, pd: 1.12, dm: 1.08 },
  },
  female: {
    "18–34": { lo: 0.95, pd: 1.25, dm: 1.12 },
    "35–44": { lo: 0.98, pd: 1.36, dm: 1.17 },
    "45–54": { lo: 0.95, pd: 1.32, dm: 1.13 },
    "55–64": { lo: 0.98, pd: 1.20, dm: 1.14 },
    "65–74": { lo: 0.95, pd: 1.19, dm: 1.13 },
    "75–99": { lo: 0.98, pd: 1.13, dm: 1.10 },
  },
};
const REF = 92; // midpoint of 90–94 mg/dL reference category (Figure 2 method)

function getAgeGroup(a) {
  if (a <= 34) return "18–34";
  if (a <= 44) return "35–44";
  if (a <= 54) return "45–54";
  if (a <= 64) return "55–64";
  if (a <= 74) return "65–74";
  return "75–99";
}

// HR curve faithful to Table 2 only — no Figure-2 visual approximations.
//   Paper: "fasting glucose levels associated with the lowest mortality
//   were 80–94 mg/dL." → flat HR = 1.0 across that band.
//   Outside the band, apply the published per-18 mg/dL slope log-linearly
//   from the reference (g = 92): HR(g) = slope ^ ((g − 92) / 18).
//   The 100–125 (pd) slope is the steeper within-range fit; it is shown
//   as interpretive context but not used to draw the curve, because the
//   paper's headline continuous model for the elevated range is the
//   100–199 (dm) log-linear fit (Methods §, p.4).
function computeHR(g, age, sex) {
  const { lo, dm } = HR_TABLE[sex][getAgeGroup(age)];
  if (g >= 80 && g <= 94) return 1.0;
  if (g > 94)  return Math.pow(dm, (g - REF) / 18);
  return         Math.pow(lo, (g - REF) / 18);
}

// ── Categories ──────────────────────────────────────────────
function categoryOf(g) {
  if (g < 70)   return { key: "hypo",    color: "var(--hypo)" };
  if (g < 80)   return { key: "low",     color: "var(--low)" };
  if (g <= 94)  return { key: "optimal", color: "var(--opt)" };
  if (g <= 99)  return { key: "near",    color: "var(--near)" };
  if (g <= 109) return { key: "ifg",     color: "var(--ifg)" };
  if (g <= 125) return { key: "pre",     color: "var(--pre)" };
  if (g <= 199) return { key: "dm",      color: "var(--dm)" };
  return         { key: "high",    color: "var(--high)" };
}

// ── i18n ────────────────────────────────────────────────────
const state = {
  lang: localStorage.getItem("gm.lang") || "en",
  theme: localStorage.getItem("gm.theme") || "dark",
  glucose: 92,
  age: 38,
  sex: "male",
  unit: "mgdl",
  exploreAge: 38,
  exploreSex: "male",
};

function t(key, vars) {
  let s = (window.I18N[state.lang] && window.I18N[state.lang][key]) || window.I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

function applyI18N() {
  document.documentElement.setAttribute("lang", state.lang);
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.innerHTML = t(el.getAttribute("data-i18n"));
  });
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
}

// ── SVG CHART ───────────────────────────────────────────────
function buildChart(containerEl, opts) {
  // opts: { age, sex, glucose (optional) }
  const W = containerEl.clientWidth || 700;
  const H = 380;
  const pad = { t: 20, r: 24, b: 44, l: 56 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  // Points
  const pts = [];
  for (let g = 50; g <= 270; g += 1) {
    pts.push({ g, hr: computeHR(g, opts.age, opts.sex) });
  }
  const maxHR = Math.max(...pts.map(p => p.hr), 2.5);
  const yMax = Math.min(maxHR * 1.05, 6);
  const yMin = 0.9; // HR floor is 1.0 (optimal); small padding below

  const xScale = g  => pad.l + ((g - 50) / (270 - 50)) * plotW;
  const yScale = hr => pad.t + (1 - Math.min(1, Math.max(0, (hr - yMin) / (yMax - yMin)))) * plotH;

  // Path
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.g).toFixed(1)},${yScale(p.hr).toFixed(1)}`).join(" ");
  const areaPath = `${path} L${xScale(270).toFixed(1)},${(pad.t + plotH).toFixed(1)} L${xScale(50).toFixed(1)},${(pad.t + plotH).toFixed(1)} Z`;

  // Ticks
  const xTicks = [50, 80, 100, 126, 150, 200, 250];
  const yTickStep = yMax > 4 ? 1 : 0.5;
  const yTicks = [];
  for (let y = Math.ceil(yMin); y <= yMax; y += yTickStep) yTicks.push(y);

  // You
  const userG = opts.glucose;
  const userHR = userG != null ? computeHR(userG, opts.age, opts.sex) : null;
  const cat = userG != null ? categoryOf(userG) : null;

  const tipId = `tip-${Math.random().toString(36).slice(2, 7)}`;

  containerEl.style.position = "relative";
  containerEl.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="curveGrad-${tipId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="var(--brand)" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="var(--brand)" stop-opacity="0.01"/>
        </linearGradient>
      </defs>

      <!-- Zones -->
      <rect class="zone-opt" x="${xScale(80)}"  y="${pad.t}" width="${xScale(94) - xScale(80)}" height="${plotH}"/>
      <rect class="zone-pre" x="${xScale(100)}" y="${pad.t}" width="${xScale(125) - xScale(100)}" height="${plotH}"/>
      <rect class="zone-dm"  x="${xScale(126)}" y="${pad.t}" width="${xScale(270) - xScale(126)}" height="${plotH}"/>

      <!-- Y grid -->
      <g class="grid">
        ${yTicks.map(y => `<line x1="${pad.l}" x2="${pad.l + plotW}" y1="${yScale(y)}" y2="${yScale(y)}"/>`).join("")}
      </g>

      <!-- HR = 1 reference -->
      <line class="ref-line" x1="${pad.l}" x2="${pad.l + plotW}" y1="${yScale(1)}" y2="${yScale(1)}"/>

      <!-- Curve -->
      <path d="${areaPath}" fill="url(#curveGrad-${tipId})"/>
      <path class="curve" d="${path}"/>

      <!-- You marker -->
      ${userG != null ? `
        <line class="you-line" style="--cat-color:${cat.color}"
              x1="${xScale(userG)}" x2="${xScale(userG)}"
              y1="${pad.t}" y2="${pad.t + plotH}"/>
        <circle class="you-dot" style="--cat-color:${cat.color}"
                cx="${xScale(userG)}" cy="${yScale(userHR)}" r="8"/>
        <text class="you-label" style="--cat-color:${cat.color}"
              x="${xScale(userG)}" y="${pad.t - 6}" text-anchor="middle">
          ${userG} mg/dL · ${userHR.toFixed(2)}×
        </text>
      ` : ""}

      <!-- Axes -->
      <g class="axis">
        <line x1="${pad.l}" x2="${pad.l + plotW}" y1="${pad.t + plotH}" y2="${pad.t + plotH}"/>
        ${xTicks.map(g => `
          <line x1="${xScale(g)}" x2="${xScale(g)}" y1="${pad.t + plotH}" y2="${pad.t + plotH + 5}"/>
          <text x="${xScale(g)}" y="${pad.t + plotH + 18}" text-anchor="middle">${g}</text>
        `).join("")}
        <text class="axis-label" x="${pad.l + plotW / 2}" y="${H - 6}" text-anchor="middle">
          ${state.lang === "ko" ? "공복혈당 (mg/dL)" : "Fasting glucose (mg/dL)"}
        </text>
      </g>
      <g class="axis">
        <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${pad.t + plotH}"/>
        ${yTicks.map(y => `
          <line x1="${pad.l - 4}" x2="${pad.l}" y1="${yScale(y)}" y2="${yScale(y)}"/>
          <text x="${pad.l - 8}" y="${yScale(y) + 3}" text-anchor="end">${y.toFixed(1)}×</text>
        `).join("")}
        <text class="axis-label" x="${-(pad.t + plotH / 2)}" y="14" text-anchor="middle" transform="rotate(-90)">
          ${state.lang === "ko" ? "위험비" : "Hazard ratio"}
        </text>
      </g>

      <!-- Hover overlay -->
      <rect id="${tipId}-hit"
            x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"
            fill="transparent" style="cursor: crosshair"/>
      <circle id="${tipId}-dot" class="hover-dot" cx="0" cy="0" r="4" opacity="0"/>
    </svg>
    <div class="chart-tip" id="${tipId}"></div>
  `;

  // Tooltip behavior
  const svg = containerEl.querySelector("svg");
  const hit = containerEl.querySelector(`#${tipId}-hit`);
  const dot = containerEl.querySelector(`#${tipId}-dot`);
  const tip = containerEl.querySelector(`#${tipId}`);

  const onMove = (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < pad.l || px > pad.l + plotW) return onLeave();
    const g = Math.round(50 + ((px - pad.l) / plotW) * (270 - 50));
    const hr = computeHR(g, opts.age, opts.sex);
    dot.setAttribute("cx", xScale(g));
    dot.setAttribute("cy", yScale(hr));
    dot.setAttribute("opacity", 1);
    tip.classList.add("visible");
    tip.innerHTML = `
      <div style="font-size:9px;letter-spacing:.1em;color:var(--text-faint);text-transform:uppercase">${t("tip.glucose")}</div>
      <div class="tip-g">${g} <span style="font-size:10px;color:var(--text-faint)">mg/dL · ${(g * 0.0555).toFixed(1)} mmol/L</span></div>
      <div style="font-size:9px;letter-spacing:.1em;color:var(--text-faint);text-transform:uppercase;margin-top:6px">${t("tip.hr")}</div>
      <div class="tip-hr">${hr.toFixed(3)}×</div>
    `;
    // position tip (relative to chart container)
    const cx = e.clientX - rect.left;
    const cy = (yScale(hr) / H) * rect.height;
    tip.style.left = Math.min(rect.width - 130, cx + 14) + "px";
    tip.style.top = Math.max(0, cy - 10) + "px";
  };
  const onLeave = () => {
    dot.setAttribute("opacity", 0);
    tip.classList.remove("visible");
  };
  hit.addEventListener("mousemove", onMove);
  hit.addEventListener("mouseleave", onLeave);
  hit.addEventListener("touchmove", e => {
    if (e.touches[0]) onMove(e.touches[0]);
  }, { passive: true });
}

// ── RECOMMENDATIONS ─────────────────────────────────────────
function getRecommendations(cat) {
  // Returns array of { num, icon, accent, titleKey, bodyKey, tag }
  const opt = "var(--opt)", brand = "var(--brand)", amber = "var(--pre)", red = "var(--high)", purple = "var(--hypo)";
  switch (cat.key) {
    case "hypo":
      return [
        { icon: "⚕", accent: purple, titleKey: "rec.hypo.title", bodyKey: "rec.hypo.body" },
        { icon: "🍬", accent: amber,  titleKey: "rec.hypo.eat.title", bodyKey: "rec.hypo.eat.body" },
        { icon: "👨‍⚕", accent: red,    titleKey: "rec.hypo.see.title", bodyKey: "rec.hypo.see.body" },
      ];
    case "low":
    case "optimal":
    case "near":
      return [
        { icon: "✓", accent: opt,   titleKey: "rec.maintain.title", bodyKey: "rec.maintain.body" },
        { icon: "↻", accent: brand, titleKey: "rec.recheck.title",  bodyKey: "rec.recheck.body" },
        { icon: "◉", accent: brand, titleKey: "rec.cgm.title",      bodyKey: "rec.cgm.body" },
      ];
    case "ifg":
    case "pre":
      return [
        { icon: "🥗", accent: opt,   titleKey: "rec.diet.title",   bodyKey: "rec.diet.body" },
        { icon: "🚶", accent: brand, titleKey: "rec.move.title",   bodyKey: "rec.move.body" },
        { icon: "⚖", accent: amber, titleKey: "rec.weight.title", bodyKey: "rec.weight.body" },
      ];
    case "dm":
    case "high":
      return [
        { icon: "⚠", accent: red,   titleKey: "rec.urgent.title",        bodyKey: "rec.urgent.body" },
        { icon: "℞", accent: brand, titleKey: "rec.metformin.title",     bodyKey: "rec.metformin.body" },
        { icon: "🔍", accent: amber, titleKey: "rec.complications.title", bodyKey: "rec.complications.body" },
      ];
  }
}

function renderRecommendations() {
  const cat = categoryOf(state.glucose);
  const recs = getRecommendations(cat);
  const grid = document.getElementById("improveGrid");
  grid.innerHTML = recs.map((r, i) => `
    <article class="action" style="--accent:${r.accent}">
      <div class="action-num">0${i + 1} / 0${recs.length}</div>
      <div class="action-icon" style="background:color-mix(in srgb, ${r.accent} 14%, transparent); color:${r.accent}">${r.icon}</div>
      <h4>${t(r.titleKey)}</h4>
      <p>${t(r.bodyKey)}</p>
    </article>
  `).join("");

  // Update banner
  const banner = document.getElementById("improveBanner");
  banner.style.setProperty("--cat-color", cat.color);
  document.getElementById("ibCat").textContent = t(`cat.${cat.key}`);
  document.getElementById("ibCat").style.color = cat.color;

  // Clinical checklist
  const clinList = document.getElementById("clinicalList");
  const items = ["clin.fasting126", "clin.random200", "clin.a1c65", "clin.lows", "clin.symptoms", "clin.familyhx"];
  clinList.innerHTML = items.map(k => `<li>${t(k)}</li>`).join("");
}

// ── HR TABLE ────────────────────────────────────────────────
function renderHRTable() {
  const ageGroup = getAgeGroup(state.age);
  const tbody = document.querySelector("#hrTable tbody");
  const cat = categoryOf(state.glucose);
  tbody.innerHTML = Object.entries(HR_TABLE[state.sex]).map(([ag, { pd }]) => {
    const isMe = ag === ageGroup;
    return `
      <tr class="${isMe ? "active" : ""}" style="--cat-color:${cat.color}">
        <td>${ag} ${state.lang === "ko" ? "세" : "yr"}</td>
        <td class="mono">${pd.toFixed(2)}×</td>
        <td class="mono">+${((pd - 1) * 100).toFixed(0)}%</td>
      </tr>
    `;
  }).join("");
  document.getElementById("tableSubSex").textContent = t(`sex.${state.sex}`);
}

// ── PERSONAL RENDER ────────────────────────────────────────
function renderPersonal() {
  const g  = state.glucose;
  const hr = computeHR(g, state.age, state.sex);
  const cat = categoryOf(g);
  const ageGroup = getAgeGroup(state.age);
  const pctDiff = (hr - 1) * 100;

  // Glucose display + unit conversion
  const display = state.unit === "mmol" ? (g * 0.0555).toFixed(1) : g;
  const unitTxt = state.unit === "mmol" ? "mmol/L" : "mg/dL";
  document.getElementById("gValue").innerHTML = `${display}<span class="field-unit" id="gUnit">${unitTxt}</span>`;
  document.querySelector(".slider-g").style.setProperty("--thumb", cat.color);

  // Age / sex display
  document.getElementById("aValue").textContent = state.age;
  document.getElementById("aChip").textContent = ageGroup;

  // Result card
  const resCard = document.getElementById("resultCard");
  resCard.style.setProperty("--cat-color", cat.color);
  document.getElementById("catLabel").textContent = t(`cat.${cat.key}`);
  document.getElementById("hrValue").textContent = hr.toFixed(2);
  const explain =
    g < 70 ? t("hr.hypo") :
    pctDiff >= 1 ? t("hr.pct.higher", { p: Math.round(pctDiff) }) :
    pctDiff <= -0.5 ? t("hr.below") :
    t("hr.lowest");
  document.getElementById("hrExplain").textContent = explain;

  // Bar
  const pct = Math.min(100, Math.max(0, ((hr - 0.7) / (3.3 - 0.7)) * 100));
  document.getElementById("barFill").style.width = pct + "%";

  // Ref row — show the Table 2 slope that the user's current zone falls in.
  // Hidden when in the optimal band (HR = 1, no slope to report).
  const refRow = document.getElementById("refRow");
  if (g < 80 || g > 94) {
    refRow.hidden = false;
    const tab = HR_TABLE[state.sex][ageGroup];
    const slope = g < 80 ? tab.lo : tab.dm;
    const rangeKey = g < 80 ? "hr.ref.range.lo" : "hr.ref.range.dm";
    document.getElementById("refRowText").innerHTML = t("hr.ref.text", {
      range: t(rangeKey), age: ageGroup, sex: t(`sex.${state.sex}`),
      hr: slope.toFixed(2),
    });
  } else {
    refRow.hidden = true;
  }

  // Presets
  document.querySelectorAll("#gPresets button").forEach(b => {
    b.classList.toggle("active", +b.dataset.g === g);
  });

  // Sex buttons
  document.querySelectorAll("#sexGrid .sex-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.sex === state.sex);
  });
  // Unit segment
  document.querySelectorAll("#unitSeg .seg-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.unit === state.unit);
  });

  // Chart subtitle
  document.getElementById("chartSubA").textContent =
    `${ageGroup} ${state.lang === "ko" ? "세" : "yr"} · ${t(`sex.${state.sex}`)}`;

  // Charts
  buildChart(document.getElementById("personalChart"), {
    age: state.age, sex: state.sex, glucose: g,
  });

  renderHRTable();
  renderRecommendations();
}

// ── EXPLORE RENDER ─────────────────────────────────────────
function renderExplore() {
  // segment states
  document.querySelectorAll("#exploreAgeSeg .seg-btn").forEach(b => {
    b.classList.toggle("active", +b.dataset.age === state.exploreAge);
  });
  document.querySelectorAll("#exploreSexSeg .seg-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.sex === state.exploreSex);
  });
  buildChart(document.getElementById("exploreChart"), {
    age: state.exploreAge, sex: state.exploreSex, glucose: null,
  });
}

// ── INIT / EVENT WIRING ────────────────────────────────────
function init() {
  applyTheme();
  applyI18N();

  // Language buttons
  document.querySelectorAll("[data-lang]").forEach(b => {
    b.addEventListener("click", () => {
      state.lang = b.dataset.lang;
      localStorage.setItem("gm.lang", state.lang);
      document.querySelectorAll("[data-lang]").forEach(x =>
        x.classList.toggle("active", x.dataset.lang === state.lang));
      applyI18N();
      renderPersonal();
      renderExplore();
    });
    if (b.dataset.lang === state.lang) b.classList.add("active");
    else b.classList.remove("active");
  });

  // Theme
  document.getElementById("themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("gm.theme", state.theme);
    applyTheme();
    renderPersonal();
    renderExplore();
  });

  // Glucose slider
  document.getElementById("glucose").addEventListener("input", e => {
    state.glucose = +e.target.value;
    renderPersonal();
  });

  // Glucose presets
  document.querySelectorAll("#gPresets button").forEach(b => {
    b.addEventListener("click", () => {
      state.glucose = +b.dataset.g;
      document.getElementById("glucose").value = state.glucose;
      renderPersonal();
    });
  });

  // Unit
  document.querySelectorAll("#unitSeg .seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      state.unit = b.dataset.unit;
      renderPersonal();
    });
  });

  // Age slider
  document.getElementById("age").addEventListener("input", e => {
    state.age = +e.target.value;
    renderPersonal();
  });

  // Sex buttons
  document.querySelectorAll("#sexGrid .sex-btn").forEach(b => {
    b.addEventListener("click", () => {
      state.sex = b.dataset.sex;
      renderPersonal();
    });
  });

  // Explore segments
  document.querySelectorAll("#exploreAgeSeg .seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      state.exploreAge = +b.dataset.age;
      renderExplore();
    });
  });
  document.querySelectorAll("#exploreSexSeg .seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      state.exploreSex = b.dataset.sex;
      renderExplore();
    });
  });

  // Smooth nav
  document.querySelectorAll(".top-nav a").forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (!id.startsWith("#")) return;
      e.preventDefault();
      document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Initial render
  renderPersonal();
  renderExplore();

  // Re-render charts on resize (debounced)
  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      renderExplore();
      buildChart(document.getElementById("personalChart"), {
        age: state.age, sex: state.sex, glucose: state.glucose,
      });
    }, 120);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
