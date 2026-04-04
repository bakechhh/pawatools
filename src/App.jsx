import { useState, useEffect } from "react";
import { GET } from "./supabase.js";
import BaseStatTab from "./tabs/BaseStatTab.jsx";
import SkillsTab from "./tabs/SkillsTab.jsx";
import SpecialTab from "./tabs/SpecialTab.jsx";
import GoldTab from "./tabs/GoldTab.jsx";
import AdminTab from "./tabs/AdminTab.jsx";

const P_JOBS = [
  { id: 1, name: "剣士", color: "#c0392b" },
  { id: 2, name: "弓使い", color: "#d4880f" },
  { id: 3, name: "魔法使い", color: "#7d3c98" },
  { id: 4, name: "魔闘士", color: "#1e8449" },
];
const P_ROWS = [
  { key: "base", label: "基本能力", table: "base_stat_costs" },
  { key: "skill", label: "スキル", table: "skill_data" },
  { key: "gold", label: "金特", table: "gold_skill_data" },
  { key: "special", label: "必殺技", table: "special_move_data" },
];

function ProgressDashboard() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!open || counts) return;
    const jobs = P_JOBS.map(j => j.id);
    const fetches = {};
    P_ROWS.forEach(r => {
      fetches[r.key] = {};
      jobs.forEach(jid => {
        fetches[r.key][jid] = GET(r.table, `job_id=eq.${jid}&select=id`).then(arr => arr.length);
      });
    });
    // resolve all
    Promise.all(
      P_ROWS.flatMap(r => jobs.map(jid => fetches[r.key][jid].then(c => ({ row: r.key, job: jid, count: c }))))
    ).then(results => {
      const c = {};
      results.forEach(({ row, job, count }) => {
        if (!c[row]) c[row] = {};
        c[row][job] = count;
      });
      setCounts(c);
    });
  }, [open, counts]);

  return (
    <div style={{ marginTop: 6 }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: "3px 10px", borderRadius: 6, border: "1px solid #c8a860",
        background: open ? "linear-gradient(180deg,#f0dca0,#c8a020)" : "#faf8f2",
        color: open ? "#5a4010" : "#8b7340", fontSize: 10, fontWeight: 600, cursor: "pointer",
      }}>進捗</button>
      {open && (
        <div style={{
          marginTop: 6, background: "#fdf6e3", border: "1px solid #d5c89c",
          borderRadius: 8, padding: 8, fontSize: 10,
        }}>
          {!counts ? <div style={{ textAlign: "center", color: "#999" }}>読み込み中...</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ textAlign: "left", padding: "2px 4px", color: "#5a4010", fontSize: 9 }}></th>
                {P_JOBS.map(j => <th key={j.id} style={{ padding: "2px 4px", color: j.color, fontSize: 9, textAlign: "center" }}>{j.name}</th>)}
              </tr></thead>
              <tbody>
                {P_ROWS.map(r => (
                  <tr key={r.key} style={{ borderTop: "1px solid #e8e0c8" }}>
                    <td style={{ padding: "3px 4px", color: "#5a4010", fontWeight: 600 }}>{r.label}</td>
                    {P_JOBS.map(j => {
                      const v = counts[r.key]?.[j.id] || 0;
                      return (
                        <td key={j.id} style={{ textAlign: "center", padding: "3px 4px" }}>
                          <span style={{
                            display: "inline-block", minWidth: 20, padding: "1px 4px",
                            borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: v > 0 ? j.color + "22" : "transparent",
                            color: v > 0 ? j.color : "#ccc",
                          }}>{v}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "base", label: "基本能力" },
  { key: "skills", label: "スキル" },
  { key: "special", label: "必殺技" },
  { key: "gold", label: "金特" },
  { key: "admin", label: "管理" },
];

export default function App() {
  const [tab, setTab] = useState("base");

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 8px 60px" }}>
      {/* ヘッダ */}
      <div style={{
        textAlign: "center", padding: "16px 12px 12px",
        background: "linear-gradient(180deg,#f5e6c0,#e0d0a0)",
        borderRadius: "0 0 14px 14px",
        border: "2px solid #c8a860", borderTop: "none",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#5a4010", letterSpacing: "-0.5px" }}>
          ⚔️ パワアド 査定DB
        </div>
        <div style={{ fontSize: 11, color: "#8b7340", marginTop: 2 }}>
          パワプロアドベンチャーズ ─ みんなで集めるデータベース
        </div>
        <ProgressDashboard />
      </div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 2 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "10px 2px", fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            cursor: "pointer",
            border: tab === t.key ? "2px solid #c8a860" : "1px solid #d5d0c0",
            borderBottom: tab === t.key ? "3px solid #c8a020" : "1px solid #d5d0c0",
            borderRadius: "10px 10px 0 0",
            background: tab === t.key
              ? "linear-gradient(180deg,#fdf6e3,#f0dca0)"
              : "#faf8f2",
            color: tab === t.key ? "#5a4010" : "#999",
            transition: "all .15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{
        background: "#fff",
        border: "2px solid #d5c89c", borderTop: "none",
        borderRadius: "0 0 14px 14px",
        padding: 12, minHeight: 400,
      }}>
        {tab === "base" && <BaseStatTab />}
        {tab === "skills" && <SkillsTab />}
        {tab === "special" && <SpecialTab />}
        {tab === "gold" && <GoldTab />}
        {tab === "admin" && <AdminTab />}
      </div>
    </div>
  );
}
