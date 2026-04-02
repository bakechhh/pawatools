import { useState } from "react";

// --- Pills, Badges ---
export function Pill({ children, active, onClick, color }) {
  const c = color || "#8b7340";
  return <button onClick={onClick} style={{
    padding: "6px 13px", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", borderRadius: 6,
    border: active ? `2px solid ${c}` : "1px solid #d5d0c0",
    background: active ? `${c}15` : "#fff", color: active ? c : "#888", whiteSpace: "nowrap",
  }}>{children}</button>;
}

export function Badge({ children, color }) {
  return <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${color}18`, color, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, zIndex: 999,
    background: msg.includes("✓") ? "#27ae60" : msg.includes("失敗") ? "#c0392b" : "#b8860b",
    color: "#fff", boxShadow: "0 4px 16px #00000040",
  }}>{msg}</div>;
}

// --- Buttons ---
export function SaveBtn({ active, onClick, saving }) {
  return <button onClick={onClick} disabled={!active || saving} style={{
    padding: "2px 8px", borderRadius: 4, border: "none",
    cursor: active ? "pointer" : "default",
    background: active ? "#27ae60" : "#e0e0d8", color: active ? "#fff" : "#bbb",
    fontSize: 10, fontWeight: 700, minWidth: 36, height: 26, opacity: saving ? 0.6 : 1,
  }}>{saving ? "…" : "保存"}</button>;
}

export function SaveAllBtn({ count, onClick }) {
  const a = count > 0;
  return <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8, alignItems: "center" }}>
    {a && <span style={{ fontSize: 11, color: "#b8860b", fontWeight: 700 }}>{count}行 未保存</span>}
    <button onClick={onClick} disabled={!a} style={{
      padding: "8px 24px", borderRadius: 8, border: "none", cursor: a ? "pointer" : "default",
      background: a ? "linear-gradient(180deg,#f0dca0,#c8a020)" : "#e0e0d8",
      color: a ? "#5a4010" : "#bbb", fontSize: 13, fontWeight: 700,
      boxShadow: a ? "0 2px 8px #00000020" : "none",
    }}>一括保存</button>
  </div>;
}

// --- NumInput ---
export function NumInput({ value, onChange, color, hasVal, dirty }) {
  const display = value != null ? String(value) : "";
  function handleChange(e) {
    const raw = e.target.value;
    if (raw === "") { onChange(null); return; }
    const cleaned = raw.replace(/[^0-9-]/g, "");
    if (cleaned === "" || cleaned === "-") { onChange(null); return; }
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) onChange(num);
  }
  return <input type="text" inputMode="numeric" pattern="[0-9]*"
    value={display} onChange={handleChange} onFocus={e => e.target.select()}
    style={TS.inputStyle(color, hasVal, dirty)} />;
}

// --- コメント・条件展開行 ---
export function DetailRow({ colSpan, conditions, comments, onAddCondition, onAddComment }) {
  const [condInput, setCondInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

  return <tr><td colSpan={colSpan} style={{ padding: "8px 10px", background: "#fefcf4", borderBottom: "2px solid #e0d8c0" }}>
    {/* 既存の条件分岐 */}
    {conditions && conditions.length > 0 && (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#b8860b", marginBottom: 3 }}>⚠ 条件分岐</div>
        {conditions.map((c, i) => (
          <div key={i} style={{ fontSize: 11, color: "#8b7340", padding: "2px 8px", background: "#fef3cd", borderRadius: 4, marginBottom: 2, display: "flex", justifyContent: "space-between" }}>
            <span>{c.text}</span>
            <span style={{ fontSize: 9, color: "#bbb" }}>{c.at ? new Date(c.at).toLocaleDateString("ja") : ""}</span>
          </div>
        ))}
      </div>
    )}
    {/* 条件追加 */}
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      <input value={condInput} onChange={e => setCondInput(e.target.value)}
        placeholder="条件分岐を追加（例: HP1000以上で査定+5）"
        style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid #e0d8c0", fontSize: 12, background: "#fff", color: "#333" }} />
      <button onClick={() => { if (condInput.trim()) { onAddCondition(condInput.trim()); setCondInput(""); } }}
        disabled={!condInput.trim()}
        style={{ padding: "5px 12px", borderRadius: 5, border: "none", background: condInput.trim() ? "#b8860b" : "#ddd", color: "#fff", fontSize: 11, fontWeight: 700, cursor: condInput.trim() ? "pointer" : "default" }}>
        追加
      </button>
    </div>

    {/* 既存コメント */}
    {comments && comments.length > 0 && (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#666", marginBottom: 3 }}>📝 コメント</div>
        {comments.map((c, i) => (
          <div key={i} style={{ fontSize: 11, color: "#555", padding: "2px 8px", background: "#f0f0ea", borderRadius: 4, marginBottom: 2, display: "flex", justifyContent: "space-between" }}>
            <span>{c.text}</span>
            <span style={{ fontSize: 9, color: "#bbb" }}>{c.at ? new Date(c.at).toLocaleDateString("ja") : ""}</span>
          </div>
        ))}
      </div>
    )}
    {/* コメント追加 */}
    <div style={{ display: "flex", gap: 4 }}>
      <input value={commentInput} onChange={e => setCommentInput(e.target.value)}
        placeholder="コメントを追加（編集メモ、検証条件など）"
        style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid #e0d8c0", fontSize: 12, background: "#fff", color: "#333" }} />
      <button onClick={() => { if (commentInput.trim()) { onAddComment(commentInput.trim()); setCommentInput(""); } }}
        disabled={!commentInput.trim()}
        style={{ padding: "5px 12px", borderRadius: 5, border: "none", background: commentInput.trim() ? "#555" : "#ddd", color: "#fff", fontSize: 11, fontWeight: 700, cursor: commentInput.trim() ? "pointer" : "default" }}>
        追加
      </button>
    </div>
  </td></tr>;
}

// --- テーブルスタイル ---
export const TS = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: (c) => ({
    padding: "7px 3px", textAlign: "center", fontWeight: 700, fontSize: 10,
    color: c, background: "#f8f4e8",
    borderBottom: "2px solid #d5c89c", borderRight: "1px solid #e8e0c8",
  }),
  td: (dirty) => ({
    padding: "2px", borderBottom: "1px solid #e8e0c8", borderRight: "1px solid #e8e0c8",
    background: dirty ? "#fff8e0" : "transparent",
  }),
  inputStyle: (c, hasVal, dirty) => ({
    width: "100%", height: 28, textAlign: "center", fontSize: 14,
    fontWeight: hasVal ? 700 : 400,
    border: dirty ? `2px solid ${c}` : `1px solid #ddd`,
    borderRadius: 4, boxSizing: "border-box", outline: "none",
    background: hasVal ? "#fff" : "#f8f6f0",
    color: hasVal ? c : "#bbb",
  }),
};
