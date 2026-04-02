import { useState } from "react";
import BaseStatTab from "./tabs/BaseStatTab.jsx";
import SkillsTab from "./tabs/SkillsTab.jsx";
import SpecialTab from "./tabs/SpecialTab.jsx";
import GoldTab from "./tabs/GoldTab.jsx";

const TABS = [
  { key: "base", label: "基本能力" },
  { key: "skills", label: "スキル" },
  { key: "special", label: "必殺技" },
  { key: "gold", label: "金特" },
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
      </div>
    </div>
  );
}
