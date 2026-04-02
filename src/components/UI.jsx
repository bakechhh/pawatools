import { JC } from "../constants.js";

export function Pill({ children, active, onClick, color }) {
  const c = color || "#8b7340";
  return (
    <button onClick={onClick} style={{
      padding: "6px 13px", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer",
      borderRadius: 6,
      border: active ? `2px solid ${c}` : "1px solid #d5d0c0",
      background: active ? `${c}15` : "#fff",
      color: active ? c : "#888",
      whiteSpace: "nowrap", transition: "all .1s",
    }}>
      {children}
    </button>
  );
}

export function Badge({ children, color }) {
  return (
    <span style={{
      fontSize: 9, padding: "1px 5px", borderRadius: 3,
      background: `${color}18`, color, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  const isOk = msg.includes("✓");
  const isErr = msg.includes("失敗");
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, zIndex: 999,
      background: isErr ? "#c0392b" : isOk ? "#27ae60" : "#b8860b",
      color: "#fff", boxShadow: "0 4px 16px #00000040",
    }}>
      {msg}
    </div>
  );
}

export function SaveBtn({ active, onClick, label = "保存", saving }) {
  return (
    <button onClick={onClick} disabled={!active || saving} style={{
      padding: "2px 8px", borderRadius: 4, border: "none",
      cursor: active ? "pointer" : "default",
      background: active ? "#27ae60" : "#e0e0d8",
      color: active ? "#fff" : "#bbb",
      fontSize: 10, fontWeight: 700, minWidth: 36, height: 26,
      opacity: saving ? 0.6 : 1,
    }}>
      {saving ? "…" : label}
    </button>
  );
}

export function SaveAllBtn({ count, onClick }) {
  const active = count > 0;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8, alignItems: "center" }}>
      {active && (
        <span style={{ fontSize: 11, color: "#b8860b", fontWeight: 700 }}>
          {count}行 未保存
        </span>
      )}
      <button onClick={onClick} disabled={!active} style={{
        padding: "8px 24px", borderRadius: 8, border: "none",
        cursor: active ? "pointer" : "default",
        background: active ? "linear-gradient(180deg,#f0dca0,#c8a020)" : "#e0e0d8",
        color: active ? "#5a4010" : "#bbb",
        fontSize: 13, fontWeight: 700,
        boxShadow: active ? "0 2px 8px #00000020" : "none",
      }}>
        一括保存
      </button>
    </div>
  );
}

export function MemoRow({ colSpan, condition, memo, onConditionChange, onMemoChange }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{
        padding: "6px 10px", background: "#fefcf4",
        borderBottom: "2px solid #e0d8c0",
      }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#b8860b", marginBottom: 3 }}>
              ⚠ 条件分岐
            </div>
            <input
              value={condition || ""}
              onChange={e => onConditionChange(e.target.value || null)}
              placeholder="例: HP1000以上で査定+5, 冒険者基礎値で変動..."
              style={{
                width: "100%", padding: "5px 8px", borderRadius: 5,
                border: "1px solid #e0d8c0", fontSize: 12,
                background: "#fff", color: "#333", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 3 }}>
              📝 メモ
            </div>
            <input
              value={memo || ""}
              onChange={e => onMemoChange(e.target.value || null)}
              placeholder="自由メモ（検証環境、投稿者名など）"
              style={{
                width: "100%", padding: "5px 8px", borderRadius: 5,
                border: "1px solid #e0d8c0", fontSize: 12,
                background: "#fff", color: "#333", boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

// テーブルスタイル
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

// 数値入力コンポーネント（スマホで数字キーボード表示、先頭0なし）
export function NumInput({ value, onChange, color, hasVal, dirty }) {
  const display = value != null ? String(value) : "";

  function handleChange(e) {
    const raw = e.target.value;
    // 空なら null
    if (raw === "") { onChange(null); return; }
    // 数字とマイナスだけ許可
    const cleaned = raw.replace(/[^0-9-]/g, "");
    if (cleaned === "" || cleaned === "-") { onChange(null); return; }
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) onChange(num);
  }

  function handleFocus(e) {
    // 全選択で上書きしやすく
    e.target.select();
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      style={TS.inputStyle(color, hasVal, dirty)}
    />
  );
}
