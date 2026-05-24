import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, ReferenceDot
} from "recharts";

// ── Data from Yi et al., Scientific Reports 2017 (Table 2) ──────────────────
// HR per 18 mg/dL increase in fasting glucose
const HR_TABLE = {
  male: {
    "18–34": { pd: 1.30, dm: 1.15 }, // pd = prediabetes (100–125), dm = diabetes range (100–199)
    "35–44": { pd: 1.31, dm: 1.17 },
    "45–54": { pd: 1.24, dm: 1.15 },
    "55–64": { pd: 1.21, dm: 1.14 },
    "65–74": { pd: 1.17, dm: 1.11 },
    "75–99": { pd: 1.12, dm: 1.09 },
  },
  female: {
    "18–34": { pd: 1.25, dm: 1.12 },
    "35–44": { pd: 1.36, dm: 1.17 },
    "45–54": { pd: 1.32, dm: 1.13 },
    "55–64": { pd: 1.20, dm: 1.14 },
    "65–74": { pd: 1.19, dm: 1.13 },
    "75–99": { pd: 1.13, dm: 1.10 },
  },
};

function getAgeGroup(a) {
  if (a <= 34) return "18–34";
  if (a <= 44) return "35–44";
  if (a <= 54) return "45–54";
  if (a <= 64) return "55–64";
  if (a <= 74) return "65–74";
  return "75–99";
}

const REF = 92; // midpoint of reference category 90–94 mg/dL

function computeHR(g, age, sex) {
  const ag = getAgeGroup(age);
  const { pd, dm } = HR_TABLE[sex][ag];
  if (g >= 80 && g <= 94) return 1.0;
  if (g >= 95 && g <= 99) return 1.0 + (g - 94) * 0.004;
  if (g >= 100 && g <= 125) return Math.pow(pd, (g - REF) / 18);
  if (g > 125) return Math.pow(dm, (g - REF) / 18);
  // Left arm approximation from paper Figure 2 & text
  if (g >= 70) return 1.0 + (80 - g) * 0.034;
  if (g >= 60) return 1.34 + (70 - g) * 0.042;
  return 1.76 + (60 - g) * 0.05;
}

function getCategory(g) {
  if (g < 70)  return { label: "Hypoglycemia",            short: "HYPO",    color: "#a78bfa", border: "#7c3aed" };
  if (g < 80)  return { label: "Low-Normal",              short: "LOW",     color: "#60a5fa", border: "#3b82f6" };
  if (g <= 94) return { label: "Optimal",                 short: "OPTIMAL", color: "#10b981", border: "#059669" };
  if (g <= 99) return { label: "Near-Optimal",            short: "NEAR",    color: "#34d399", border: "#10b981" };
  if (g <= 109) return { label: "Impaired Fasting Glucose", short: "IFG",   color: "#fbbf24", border: "#f59e0b" };
  if (g <= 125) return { label: "Prediabetes",            short: "PRE-DM",  color: "#f59e0b", border: "#d97706" };
  if (g <= 199) return { label: "Diabetes Range",         short: "DM",      color: "#f97316", border: "#ea580c" };
  return         { label: "Severe Hyperglycemia",         short: "HIGH-DM", color: "#ef4444", border: "#dc2626" };
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const hr = payload[0]?.value;
  return (
    <div style={{
      background: "#0a1322", border: "1px solid #1e2d40",
      borderRadius: 8, padding: "10px 14px",
    }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 2 }}>FASTING GLUCOSE</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", color: "#e2e8f0", fontSize: 15 }}>
        {d?.g} <span style={{ color: "#334155", fontSize: 11 }}>mg/dL</span>
        <span style={{ color: "#253344", fontSize: 11 }}> · {(d?.g * 0.0555).toFixed(1)} mmol/L</span>
      </div>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginTop: 8, marginBottom: 2 }}>HAZARD RATIO</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 600, color: "#f59e0b" }}>
        {hr?.toFixed(3)}<span style={{ fontSize: 12, color: "#92400e" }}>×</span>
      </div>
    </div>
  );
};

export default function App() {
  const [glucose, setGlucose] = useState(92);
  const [age, setAge]         = useState(38);
  const [sex, setSex]         = useState("male");
  const [unit, setUnit]       = useState("mgdl");

  const hr      = useMemo(() => computeHR(glucose, age, sex), [glucose, age, sex]);
  const cat     = useMemo(() => getCategory(glucose), [glucose]);
  const ageGroup = getAgeGroup(age);

  // Generate personalized J-curve for this user's age+sex
  const curveData = useMemo(() => {
    const pts = [];
    for (let g = 50; g <= 270; g += 2) {
      pts.push({ g, hr: +computeHR(g, age, sex).toFixed(4) });
    }
    return pts;
  }, [age, sex]);

  const displayGlucose = unit === "mmol" ? (glucose * 0.0555).toFixed(1) : glucose;
  const glucoseUnit    = unit === "mmol" ? "mmol/L" : "mg/dL";
  const pctDiff        = (hr - 1) * 100;

  const chartGlucose = Math.max(50, Math.min(268, glucose));

  return (
    <div style={{
      minHeight: "100vh", background: "#060b14",
      color: "#e2e8f0", fontFamily: "'Syne', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060b14; }
        input[type=range] {
          -webkit-appearance: none; width: 100%; height: 3px;
          background: #152030; border-radius: 2px; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
          cursor: pointer; border: 2px solid #060b14; transition: transform 0.15s;
        }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .g-thumb::-webkit-slider-thumb { background: var(--tc, #f59e0b); }
        .a-thumb::-webkit-slider-thumb { background: #38bdf8; }
        button { cursor: pointer; font-family: inherit; transition: all 0.15s; border: none; }
        button:active { transform: scale(0.96); }
        .main-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 22px;
          max-width: 1260px;
          margin: 0 auto;
          padding: 26px 26px 60px;
        }
        @media (max-width: 780px) {
          .main-grid { grid-template-columns: 1fr; }
        }
        .stat-bar {
          display: flex; gap: 36px;
          padding: 14px 26px; overflow-x: auto;
          border-bottom: 1px solid #0e1c2a;
          background: #080d18;
        }
        .stat-bar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header style={{
        padding: "16px 26px", borderBottom: "1px solid #0e1c2a",
        background: "#060b14",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 9, color: "#253344", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
            Yi et al. · Scientific Reports 2017 · DOI 10.1038/s41598-017-08498-6 · n = 12,455,361
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
            Fasting Glucose &amp; All-Cause Mortality
            <span style={{ color: "#253344", fontWeight: 400 }}> · Risk Estimator</span>
          </h1>
        </div>
        <div style={{
          fontSize: 9, color: "#334155", letterSpacing: "0.18em",
          border: "1px solid #0e1c2a", borderRadius: 4,
          padding: "5px 12px", whiteSpace: "nowrap",
        }}>
          EDUCATIONAL · NOT CLINICAL ADVICE
        </div>
      </header>

      {/* ── STAT BANNER ────────────────────────────────────────── */}
      <div className="stat-bar">
        {[
          { label: "Cohort",        val: "12.5M",    sub: "Korean adults · NHIS 2001–2013" },
          { label: "Person-Years",  val: "134.9M",   sub: "Complete mortality follow-up" },
          { label: "Optimal Range", val: "80–94",    sub: "mg/dL · All ages & sexes" },
          { label: "Peak Risk",     val: "35–44 yr", sub: "Strongest hyperglycemia HR" },
          { label: "Total Deaths",  val: "632K",     sub: "416K men · 216K women" },
        ].map(s => (
          <div key={s.label} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.16em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, color: "#f59e0b", fontWeight: 600, margin: "2px 0" }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#253344" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ───────────────────────────────────────────── */}
      <div className="main-grid">

        {/* ── LEFT COL ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* INPUT CARD */}
          <div style={{ background: "#0a1220", border: "1px solid #0e1c2a", borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 20 }}>
              Your Parameters
            </div>

            {/* GLUCOSE */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Fasting Glucose</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: 30,
                    fontWeight: 600, color: cat.color, transition: "color 0.3s",
                  }}>{displayGlucose}</span>
                  <span style={{ fontSize: 12, color: "#334155" }}>{glucoseUnit}</span>
                </div>
              </div>
              <input type="range" min={50} max={270} value={glucose}
                onChange={e => setGlucose(+e.target.value)}
                className="g-thumb" style={{ "--tc": cat.color }}
              />
              <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                {[70, 85, 92, 110, 125, 150, 200].map(v => (
                  <button key={v} onClick={() => setGlucose(v)} style={{
                    flex: 1, fontSize: 9, padding: "3px 0",
                    background: glucose === v ? "#152030" : "transparent",
                    border: `1px solid ${glucose === v ? cat.color + "44" : "#0e1c2a"}`,
                    color: glucose === v ? "#94a3b8" : "#253344",
                    borderRadius: 3,
                    fontFamily: "JetBrains Mono, monospace",
                  }}>{v}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
                {["mgdl", "mmol"].map(u => (
                  <button key={u} onClick={() => setUnit(u)} style={{
                    padding: "4px 12px", fontSize: 10,
                    background: unit === u ? "#152030" : "transparent",
                    border: `1px solid ${unit === u ? "#1e3050" : "#0e1c2a"}`,
                    color: unit === u ? "#94a3b8" : "#253344",
                    borderRadius: 5,
                  }}>{u === "mgdl" ? "mg/dL" : "mmol/L"}</button>
                ))}
                <span style={{ fontSize: 9, color: "#1e2d40", marginLeft: 2 }}>· Use fasting value (≥8h fast)</span>
              </div>
            </div>

            {/* AGE */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Age</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 30, fontWeight: 600, color: "#e2e8f0" }}>{age}</span>
                  <span style={{ fontSize: 12, color: "#334155" }}>yr</span>
                  <span style={{
                    fontSize: 9, color: "#475569", letterSpacing: "0.08em",
                    background: "#0c1826", border: "1px solid #0e1c2a",
                    padding: "2px 7px", borderRadius: 3, marginLeft: 2,
                    fontFamily: "JetBrains Mono, monospace",
                  }}>{ageGroup}</span>
                </div>
              </div>
              <input type="range" min={18} max={99} value={age}
                onChange={e => setAge(+e.target.value)} className="a-thumb" />
            </div>

            {/* SEX */}
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>Biological Sex</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {["male", "female"].map(s => (
                  <button key={s} onClick={() => setSex(s)} style={{
                    padding: "10px 0", fontSize: 13,
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: sex === s ? 700 : 400,
                    background: sex === s ? "#0f2040" : "transparent",
                    border: `1px solid ${sex === s ? "#1e3a6a" : "#0e1c2a"}`,
                    color: sex === s ? "#60a5fa" : "#334155",
                    borderRadius: 8, textTransform: "capitalize",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* RESULT CARD */}
          <div style={{
            background: "#0a1220",
            border: `1px solid ${cat.border}44`,
            borderRadius: 12, padding: 22,
            boxShadow: `0 0 36px ${cat.color}0e`,
            transition: "border-color 0.4s, box-shadow 0.4s",
          }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
              Estimated Risk Profile
            </div>

            {/* Category badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
              background: `${cat.color}14`, border: `1px solid ${cat.color}30`,
              padding: "5px 13px", borderRadius: 20,
            }}>
              <div style={{
                width: 6, height: 6, background: cat.color,
                borderRadius: "50%", boxShadow: `0 0 7px ${cat.color}`,
              }} />
              <span style={{ fontSize: 11, color: cat.color, fontWeight: 700, letterSpacing: "0.08em" }}>
                {cat.label.toUpperCase()}
              </span>
            </div>

            {/* Big HR number */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: "#253344", marginBottom: 4 }}>
                All-cause mortality HR vs. optimal range (80–94 mg/dL)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 56, fontWeight: 600, lineHeight: 1,
                  color: cat.color, transition: "color 0.3s",
                }}>{hr.toFixed(2)}</span>
                <span style={{ fontSize: 22, color: `${cat.color}55` }}>×</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                {pctDiff >= 1
                  ? `≈ ${pctDiff.toFixed(0)}% higher all-cause mortality risk`
                  : pctDiff <= -0.5
                  ? `Slightly below reference — within optimal range`
                  : "Within lowest-mortality fasting glucose range"}
              </div>
            </div>

            {/* Gradient bar */}
            <div style={{ marginBottom: glucose > 99 ? 14 : 0 }}>
              <div style={{ height: 5, background: "#0c1826", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, ((hr - 0.7) / (3.3 - 0.7)) * 100))}%`,
                  background: "linear-gradient(90deg, #10b981 0%, #fbbf24 55%, #ef4444 100%)",
                  borderRadius: 3, transition: "width 0.35s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                {["0.7×", "1.0×", "2.0×", "3.3×"].map(l => (
                  <span key={l} style={{ fontSize: 9, color: "#1e2d40", fontFamily: "JetBrains Mono, monospace" }}>{l}</span>
                ))}
              </div>
            </div>

            {/* HR source context */}
            {glucose > 99 && (
              <div style={{
                background: "#080d18", border: "1px solid #0e1c2a",
                borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#334155",
              }}>
                <span style={{ color: "#475569" }}>HR per +18 mg/dL in your group · {ageGroup} · {sex === "male" ? "Male" : "Female"}:</span>
                <span style={{
                  color: cat.color, fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600, marginLeft: 8,
                }}>
                  {(glucose <= 125
                    ? HR_TABLE[sex][ageGroup].pd
                    : HR_TABLE[sex][ageGroup].dm).toFixed(2)}×
                </span>
                <span style={{ color: "#253344" }}> per 18 mg/dL (1 mmol/L)</span>
              </div>
            )}
          </div>

          {/* AGE STRATIFICATION TABLE */}
          <div style={{ background: "#0a1220", border: "1px solid #0e1c2a", borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>
              HR / 18 mg/dL · Prediabetes Range · {sex === "male" ? "Male" : "Female"} (Table 2)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #0e1c2a" }}>
                  {["Age", "HR / 18 mg/dL", "↑ Mortality"].map((h, i) => (
                    <th key={h} style={{
                      padding: "4px 0 6px", fontSize: 9, color: "#253344",
                      fontWeight: 500, textAlign: i === 0 ? "left" : "right",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(HR_TABLE[sex]).map(([ag, { pd }]) => {
                  const isMe = ag === ageGroup;
                  return (
                    <tr key={ag} style={{
                      background: isMe ? "#0d1e30" : "transparent",
                      borderRadius: 4,
                    }}>
                      <td style={{
                        padding: "7px 0", fontSize: 12,
                        color: isMe ? "#e2e8f0" : "#334155",
                        fontWeight: isMe ? 700 : 400,
                      }}>
                        {isMe && <span style={{ color: cat.color, marginRight: 6 }}>▸</span>}
                        {ag} yr
                      </td>
                      <td style={{
                        textAlign: "right", fontFamily: "JetBrains Mono, monospace",
                        fontSize: 13, fontWeight: isMe ? 600 : 400,
                        color: isMe ? cat.color : "#253344",
                      }}>{pd.toFixed(2)}×</td>
                      <td style={{
                        textAlign: "right", fontSize: 11,
                        color: isMe ? "#64748b" : "#1e2d40",
                        fontFamily: "JetBrains Mono, monospace",
                      }}>+{((pd - 1) * 100).toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT COL ────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* J-CURVE CHART */}
          <div style={{ background: "#0a1220", border: "1px solid #0e1c2a", borderRadius: 12, padding: 22 }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
                Personalized J-Curve · Age &amp; Sex Adjusted
              </div>
              <div style={{ fontSize: 12, color: "#253344" }}>
                All-cause mortality hazard ratio vs. fasting glucose · {ageGroup} yr · {sex === "male" ? "Male" : "Female"} · Reference: 90–94 mg/dL
              </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={curveData} margin={{ top: 10, right: 28, left: 14, bottom: 32 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#38bdf8" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d1826" strokeOpacity={0.9} />
                <XAxis
                  dataKey="g"
                  stroke="#0e1c2a"
                  tick={{ fill: "#253344", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                  label={{ value: "Fasting Glucose (mg/dL)", position: "insideBottom", offset: -20, fill: "#334155", fontSize: 11 }}
                  domain={[50, 270]}
                  tickCount={8}
                />
                <YAxis
                  stroke="#0e1c2a"
                  tick={{ fill: "#253344", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                  tickFormatter={v => `${v.toFixed(1)}×`}
                  label={{ value: "Hazard Ratio", angle: -90, position: "insideLeft", dx: -6, fill: "#334155", fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Zones */}
                <ReferenceArea x1={80} x2={94}  fill="#10b981" fillOpacity={0.09} stroke="none" />
                <ReferenceArea x1={100} x2={125} fill="#f59e0b" fillOpacity={0.055} stroke="none" />
                <ReferenceArea x1={126} x2={270} fill="#ef4444" fillOpacity={0.025} stroke="none" />

                {/* HR = 1 reference line */}
                <ReferenceLine y={1.0} stroke="#152030" strokeWidth={1.5} strokeDasharray="5 4" />

                {/* User's glucose line */}
                <ReferenceLine
                  x={chartGlucose}
                  stroke={cat.color} strokeWidth={1.5} strokeDasharray="5 4"
                  label={{ value: `${glucose} mg/dL`, position: "top", fill: cat.color, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                />

                {/* Curve */}
                <Area
                  type="monotone" dataKey="hr"
                  stroke="#38bdf8" strokeWidth={2.5}
                  fill="url(#g1)" dot={false}
                  activeDot={{ r: 4, fill: "#38bdf8", stroke: "#060b14", strokeWidth: 2 }}
                />

                {/* User's position dot */}
                <ReferenceDot
                  x={chartGlucose} y={+hr.toFixed(4)}
                  r={9} fill={cat.color} stroke="#060b14" strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Chart Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
              {[
                { color: "#10b981", label: "Optimal zone (80–94 mg/dL)", fill: "#10b98118" },
                { color: "#f59e0b", label: "Prediabetes (100–125 mg/dL)", fill: "#f59e0b12" },
                { color: "#ef4444", label: "Diabetes range (≥126 mg/dL)", fill: "#ef444412" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 11, height: 11, background: l.fill, border: `1.5px solid ${l.color}55`, borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: "#253344" }}>{l.label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, background: cat.color, borderRadius: "50%" }} />
                <span style={{ fontSize: 10, color: "#253344" }}>Your position</span>
              </div>
            </div>
          </div>

          {/* KEY FINDINGS */}
          <div style={{ background: "#0a1220", border: "1px solid #0e1c2a", borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
              Key Study Findings
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                {
                  color: "#10b981", title: "Optimal Range",
                  stat: "80–94 mg/dL",
                  body: "Nadir of J-curve. Consistent across all sex/age groups. Authors propose 100 mg/dL (not 110) as upper limit of normoglycemia.",
                },
                {
                  color: "#f59e0b", title: "Prediabetes Risk",
                  stat: "+10–32% HR / 18 mg/dL",
                  body: "Strongest effect in ages 35–44. Risk attenuates but remains significant even in the 75–99 age group (HR +12–13%).",
                },
                {
                  color: "#a78bfa", title: "Hypoglycemia J-Arm",
                  stat: "Risk rises below 80 mg/dL",
                  body: "Especially concerning below 70 mg/dL. Critical context for patients on insulin, sulfonylureas, or with CGM lows.",
                },
                {
                  color: "#38bdf8", title: "Sex & Age Differences",
                  stat: "Men > Women until ~73 yr",
                  body: "Menopause-associated estrogen decline correlates with sharp glucose rise in women ~age 50. Gap peaks at 48–51 yr (6.1 mg/dL).",
                },
              ].map(c => (
                <div key={c.title} style={{
                  background: "#080d18", border: "1px solid #0e1c2a",
                  borderLeft: `3px solid ${c.color}`,
                  borderRadius: 8, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 10, color: "#334155", marginBottom: 4 }}>{c.title}</div>
                  <div style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: 12,
                    color: c.color, marginBottom: 8, fontWeight: 600,
                  }}>{c.stat}</div>
                  <div style={{ fontSize: 11, color: "#253344", lineHeight: 1.6 }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CGM / DEXCOM NOTE */}
          <div style={{
            background: "#0a1220", border: "1px solid #0e1c2a",
            borderRadius: 12, padding: 22,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          }}>
            {[
              {
                icon: "◈", color: "#38bdf8", title: "Using Dexcom / CGM",
                body: "CGM reads interstitial glucose, which approximates plasma glucose but with ~5–10 min lag. For this tool, enter your fasting morning reading (≥8h fast, upon waking). Avoid post-meal or post-exercise values.",
              },
              {
                icon: "◈", color: "#f59e0b", title: "Clinical Thresholds",
                body: "ADA prediabetes: 100–125 mg/dL. ADA diabetes: ≥126 mg/dL (confirmed). This study uses identical cut-points. HbA1c correlates roughly: ≤5.6% ≈ normal; 5.7–6.4% ≈ prediabetes; ≥6.5% ≈ diabetes.",
              },
            ].map(c => (
              <div key={c.title} style={{
                background: "#080d18", border: "1px solid #0e1c2a",
                borderLeft: `3px solid ${c.color}`,
                borderRadius: 8, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 10, color: "#334155", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: c.color }}>{c.icon}</span> {c.title}
                </div>
                <div style={{ fontSize: 11, color: "#253344", lineHeight: 1.6 }}>{c.body}</div>
              </div>
            ))}
          </div>

          {/* DISCLAIMER */}
          <div style={{
            background: "#070c18", border: "1px solid #0e1c2a",
            borderRadius: 8, padding: "14px 18px",
            fontSize: 10, color: "#1e2d40", lineHeight: 1.7,
          }}>
            <span style={{ color: "#f59e0b88", fontWeight: 700 }}>⚠ Limitations & Disclaimer — </span>
            Hazard ratios reflect population-level relative risk in a Korean observational cohort — not individual probability of death. Causal inference is limited. Self-reported diabetes cases were excluded. Cause-specific mortality, HbA1c, and postprandial glucose were unavailable. The Korean cohort is generally leaner than Western populations (mean BMI 23.5 kg/m²); effect magnitudes may differ in other ethnic groups. The left-arm (hypoglycemia) HR values are approximated from Figure 2 rather than Table 2. Single fasting glucose measurement may underestimate true risk due to regression dilution. This tool is for educational use only. Consult your physician for any clinical decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
