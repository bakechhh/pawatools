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
  function handleKey(e) {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      const inputs = [...document.querySelectorAll("table input[inputmode=numeric]")];
      const idx = inputs.indexOf(e.target);
      if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const inputs = [...document.querySelectorAll("table input[inputmode=numeric]")];
      const idx = inputs.indexOf(e.target);
      if (idx > 0) inputs[idx - 1].focus();
    }
  }
  return <input type="text" inputMode="numeric" pattern="[0-9]*"
    value={display} onChange={handleChange} onKeyDown={handleKey} onFocus={e => e.target.select()}
    style={TS.inputStyle(color, hasVal, dirty)} />;
}

// --- 大きい数値入力 ---
function BigNumInput({ value, onChange, color, autoFocus, onKeyDown }) {
  return (
    <input type="text" inputMode="numeric" pattern="[0-9-]*"
      autoFocus={autoFocus}
      value={value != null ? String(value) : ""}
      onChange={e => {
        const raw = e.target.value;
        if (raw === "" || raw === "-") { onChange(null); return; }
        const n = parseInt(raw.replace(/[^0-9-]/g, ""), 10);
        if (!isNaN(n)) onChange(n);
      }}
      onFocus={e => e.target.select()}
      onKeyDown={onKeyDown}
      style={{
        width: "100%", height: 44, textAlign: "center", fontSize: 20, fontWeight: 700,
        border: `2px solid ${color || "#d5d0c0"}`, borderRadius: 8, boxSizing: "border-box",
        outline: "none", background: "#fff", color: color || "#333",
      }}
    />
  );
}

// --- モーダル外枠 ---
function ModalShell({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto",
        background: "#faf8f2", borderRadius: "16px 16px 0 0", padding: "16px 16px 24px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
      }}>{children}</div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#5a4010" }}>{title}</div>
      <button onClick={onClose} style={{
        width: 32, height: 32, borderRadius: 16, border: "none",
        background: "#e0d8c0", color: "#666", fontSize: 18, cursor: "pointer", lineHeight: "32px",
      }}>×</button>
    </div>
  );
}

function ApplyButton({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", marginTop: 16, padding: "14px 0", borderRadius: 10, border: "none",
      background: "linear-gradient(180deg,#f0dca0,#c8a020)", color: "#5a4010",
      fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    }}>{label || "反映する"}</button>
  );
}

// --- スキル入力モーダル ---
export function SkillInputModal({ skill, cols, getVal, onEdit, onClose, onNext, seqMode, seqCurrent, seqTotal }) {
  const [mode, setMode] = useState("diff");
  const [before, setBefore] = useState({});
  const [after, setAfter] = useState({});
  const [direct, setDirect] = useState(() => {
    const d = {};
    cols.forEach(c => { const v = getVal(c.key); if (v != null) d[c.key] = v; });
    return d;
  });

  function getDiff(key) {
    const b = before[key], a = after[key];
    if (a == null && b == null) return null;
    return (a ?? 0) - (b ?? 0);
  }

  function handleApply() {
    cols.forEach(c => {
      const val = mode === "diff" ? getDiff(c.key) : (direct[c.key] ?? null);
      if (val != null) onEdit(c.key, val);
    });
    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title={`${skill.name}${skill.grade || ""}${seqMode ? ` (${seqCurrent}/${seqTotal})` : ""}`} onClose={onClose} />
      {seqMode && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: "#e0d8c0", borderRadius: 2 }}>
            <div style={{ height: 4, background: "#c8a020", borderRadius: 2, width: `${(seqCurrent / seqTotal) * 100}%`, transition: "width 0.2s" }} />
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        <Pill active={mode === "diff"} onClick={() => setMode("diff")}>前後入力</Pill>
        <Pill active={mode === "direct"} onClick={() => setMode("direct")}>直接入力</Pill>
      </div>

      {mode === "diff" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cols.map(c => {
            const d = getDiff(c.key);
            return (
              <div key={c.key} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid ${c.color}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.color, marginBottom: 6 }}>{c.label}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: "#999", marginBottom: 2, textAlign: "center" }}>取得前</div>
                    <BigNumInput value={before[c.key]} onChange={v => setBefore(p => ({ ...p, [c.key]: v }))} color="#999" />
                  </div>
                  <div style={{ fontSize: 18, color: "#aaa", paddingTop: 14 }}>&rarr;</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: "#999", marginBottom: 2, textAlign: "center" }}>取得後</div>
                    <BigNumInput value={after[c.key]} onChange={v => setAfter(p => ({ ...p, [c.key]: v }))} color={c.color} />
                  </div>
                  <div style={{ width: 56, textAlign: "center", paddingTop: 14 }}>
                    <div style={{ fontSize: 9, color: "#999" }}>差分</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: d == null ? "#ccc" : d > 0 ? c.color : d < 0 ? "#c0392b" : "#999" }}>
                      {d != null ? (d > 0 ? `+${d}` : d) : "-"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cols.map(c => (
            <div key={c.key} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid ${c.color}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.color, width: 36 }}>{c.label}</div>
                <div style={{ flex: 1 }}><BigNumInput value={direct[c.key] ?? getVal(c.key)} onChange={v => setDirect(p => ({ ...p, [c.key]: v }))} color={c.color} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {onNext ? (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => { handleApply(); }} style={{
            flex: 1, padding: "14px 0", borderRadius: 10, border: "2px solid #d5c89c",
            background: "#fff", color: "#5a4010", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>反映して閉じる</button>
          <button onClick={() => {
            cols.forEach(c => {
              const val = mode === "diff" ? getDiff(c.key) : (direct[c.key] ?? null);
              if (val != null) onEdit(c.key, val);
            });
            onNext();
          }} style={{
            flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(180deg,#f0dca0,#c8a020)", color: "#5a4010",
            fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}>反映して次へ →</button>
        </div>
      ) : (
        <ApplyButton onClick={handleApply} />
      )}
    </ModalShell>
  );
}

// --- ステータス連続入力モーダル ---
// 査定は差分値だけ入力。経験点はテーブルが変わるまで据え置き。
export function StatSequentialModal({ cols, currentVal, cap, getVal, onEdit, onSave, onClose }) {
  const [val, setVal] = useState(currentVal);
  const [satei, setSatei] = useState(null); // 査定差分値
  const [exp, setExp] = useState({ exp_kinryoku: null, exp_binsoku: null, exp_gijutsu: null, exp_chiryoku: null, exp_seishin: null });
  const [log, setLog] = useState([]);
  const [expLocked, setExpLocked] = useState(true); // 経験点は据え置きモード

  const expCols = cols.filter(c => c.key !== "satei_delta");
  const sateiCol = cols.find(c => c.key === "satei_delta");

  function applyAndNext() {
    // 査定差分を反映
    if (satei != null) onEdit(val, "satei_delta", satei);
    // 経験点を反映（据え置き分も含む）
    expCols.forEach(c => {
      if (exp[c.key] != null) onEdit(val, c.key, exp[c.key]);
    });
    onSave(val);
    setLog(prev => [...prev, val]);

    // 次へ（査定だけリセット、経験点は据え置き）
    if (val < cap) {
      setVal(val + 1);
      setSatei(null);
      // 経験点はそのまま維持（据え置き）
    }
  }

  function applyAndClose() {
    if (satei != null) onEdit(val, "satei_delta", satei);
    expCols.forEach(c => {
      if (exp[c.key] != null) onEdit(val, c.key, exp[c.key]);
    });
    onSave(val);
    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title="連続入力" onClose={onClose} />

      {/* 進捗 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#5a4010" }}>
          {val} <span style={{ fontSize: 13, color: "#999", fontWeight: 400 }}>/ {cap}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { if (val > 0) { setVal(val - 1); setSatei(null); } }} disabled={val <= 0}
            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d5d0c0", background: val > 0 ? "#fff" : "#eee", color: val > 0 ? "#666" : "#ccc", fontSize: 12, cursor: val > 0 ? "pointer" : "default" }}>←</button>
          <button onClick={() => { if (val < cap) { setVal(val + 1); setSatei(null); } }} disabled={val >= cap}
            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d5d0c0", background: val < cap ? "#fff" : "#eee", color: val < cap ? "#666" : "#ccc", fontSize: 12, cursor: val < cap ? "pointer" : "default" }}>→</button>
        </div>
      </div>
      <div style={{ height: 4, background: "#e0d8c0", borderRadius: 2, marginBottom: 14 }}>
        <div style={{ height: 4, background: "#c8a020", borderRadius: 2, width: `${(val / cap) * 100}%`, transition: "width 0.2s" }} />
      </div>

      {/* 査定差分 — メイン入力 */}
      {sateiCol && (
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "2px solid #b8860b40", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b8860b", marginBottom: 6 }}>査定差分</div>
          <BigNumInput value={satei} onChange={setSatei} color="#b8860b" autoFocus
            onKeyDown={e => { if (e.key === "Enter" && satei != null) applyAndNext(); }} />
        </div>
      )}

      {/* 経験点 — 据え置きモード */}
      <div style={{ background: "#f8f6f0", borderRadius: 10, padding: "10px 12px", border: "1px solid #e0d8c0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>経験点コスト</span>
          <button onClick={() => setExpLocked(!expLocked)} style={{
            padding: "2px 10px", borderRadius: 4, border: "1px solid #d5d0c0",
            background: expLocked ? "#e8f5e8" : "#fff8e0", color: expLocked ? "#27ae60" : "#b8860b",
            fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>{expLocked ? "据え置き中" : "編集中"}</button>
        </div>

        {expLocked ? (
          // 据え置きモード: コンパクトに現在値を表示
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {expCols.map(c => (
              <div key={c.key} style={{ textAlign: "center", minWidth: 44 }}>
                <div style={{ fontSize: 9, color: "#999" }}>{c.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: exp[c.key] != null ? c.color : "#ccc" }}>
                  {exp[c.key] != null ? exp[c.key] : "-"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 編集モード: 各経験値を入力
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {expCols.map(c => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color, width: 32 }}>{c.label}</span>
                <BigNumInput value={exp[c.key]} onChange={v => setExp(p => ({ ...p, [c.key]: v }))} color={c.color} />
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 9, color: "#aaa", marginTop: 4 }}>
          経験点テーブルが変わったら「据え置き中」を押して編集
        </div>
      </div>

      {/* ボタン */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={applyAndClose} style={{
          flex: 1, padding: "14px 0", borderRadius: 10, border: "2px solid #d5c89c",
          background: "#fff", color: "#5a4010", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>保存して閉じる</button>
        <button onClick={applyAndNext} disabled={val >= cap} style={{
          flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
          background: val < cap ? "linear-gradient(180deg,#f0dca0,#c8a020)" : "#e0e0d8",
          color: val < cap ? "#5a4010" : "#bbb", fontSize: 14, fontWeight: 700,
          cursor: val < cap ? "pointer" : "default", boxShadow: val < cap ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
        }}>次へ →</button>
      </div>

      {/* ログ */}
      {log.length > 0 && (
        <div style={{ marginTop: 10, borderTop: "1px solid #e0d8c0", paddingTop: 6 }}>
          <div style={{ fontSize: 10, color: "#999", marginBottom: 3 }}>入力済み ({log.length}件)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {log.map((v, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#e8f5e8", color: "#27ae60", fontWeight: 600 }}>{v}</span>
            ))}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// --- コメント・条件展開行 ---
export function DetailRow({ colSpan, conditions, comments, onAddCondition, onAddComment, onUpdateConditions, onUpdateComments }) {
  const [condInput, setCondInput] = useState("");
  const [effectInput, setEffectInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [editingCond, setEditingCond] = useState(null); // { index, text, effect }
  const [editingComment, setEditingComment] = useState(null); // { index, text }
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: "cond"|"comment", index }

  const condTemplates = ["HP○○以上で", "○○装備時", "Lv○○以上で", "特定キャラ編成時", "コンボ発動時"];

  const handleDeleteCondition = (i) => {
    if (confirmDelete && confirmDelete.type === "cond" && confirmDelete.index === i) {
      const next = [...conditions];
      next.splice(i, 1);
      onUpdateConditions(next);
      setConfirmDelete(null);
    } else {
      setConfirmDelete({ type: "cond", index: i });
    }
  };

  const handleSaveCondEdit = () => {
    if (!editingCond || !editingCond.text.trim()) return;
    const next = [...conditions];
    next[editingCond.index] = { ...next[editingCond.index], text: editingCond.text.trim(), effect: editingCond.effect.trim() };
    onUpdateConditions(next);
    setEditingCond(null);
  };

  const handleDeleteComment = (i) => {
    if (confirmDelete && confirmDelete.type === "comment" && confirmDelete.index === i) {
      const next = [...comments];
      next.splice(i, 1);
      onUpdateComments(next);
      setConfirmDelete(null);
    } else {
      setConfirmDelete({ type: "comment", index: i });
    }
  };

  const handleSaveCommentEdit = () => {
    if (!editingComment || !editingComment.text.trim()) return;
    const next = [...comments];
    next[editingComment.index] = { ...next[editingComment.index], text: editingComment.text.trim() };
    onUpdateComments(next);
    setEditingComment(null);
  };

  const smallBtn = (label, onClick, bg, extra) => (
    <button onClick={onClick} style={{ padding: "1px 6px", borderRadius: 3, border: "none", background: bg, color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer", lineHeight: "16px", ...extra }}>{label}</button>
  );

  return <tr><td colSpan={colSpan} style={{ padding: "8px 10px", background: "#fefcf4", borderBottom: "2px solid #e0d8c0" }}>
    {/* 既存の条件分岐 */}
    {conditions && conditions.length > 0 && (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#b8860b", marginBottom: 3 }}>⚠ 条件分岐</div>
        {conditions.map((c, i) => (
          editingCond && editingCond.index === i ? (
            <div key={i} style={{ display: "flex", gap: 3, marginBottom: 2, alignItems: "center" }}>
              <input value={editingCond.text} onChange={e => setEditingCond({ ...editingCond, text: e.target.value })}
                style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid #b8860b", fontSize: 11, background: "#fff", color: "#333" }} />
              <input value={editingCond.effect} onChange={e => setEditingCond({ ...editingCond, effect: e.target.value })}
                placeholder="効果"
                style={{ width: 80, padding: "3px 6px", borderRadius: 4, border: "1px solid #b8860b", fontSize: 11, background: "#fff", color: "#333" }} />
              {smallBtn("保存", handleSaveCondEdit, "#b8860b")}
              {smallBtn("取消", () => setEditingCond(null), "#999")}
            </div>
          ) : (
            <div key={i} style={{ fontSize: 11, color: "#8b7340", padding: "2px 8px", background: "#fef3cd", borderRadius: 4, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ flex: 1 }}>{c.text}</span>
              {c.effect && <span style={{ fontSize: 10, fontWeight: 700, color: "#b8860b", background: "#fff8e0", padding: "0 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{c.effect}</span>}
              <span style={{ fontSize: 9, color: "#bbb", whiteSpace: "nowrap" }}>{c.at ? new Date(c.at).toLocaleDateString("ja") : ""}</span>
              {onUpdateConditions && <>
                {smallBtn("編集", () => { setEditingCond({ index: i, text: c.text, effect: c.effect || "" }); setConfirmDelete(null); }, "#b8860b")}
                {smallBtn(confirmDelete && confirmDelete.type === "cond" && confirmDelete.index === i ? "確認" : "削除",
                  () => handleDeleteCondition(i),
                  confirmDelete && confirmDelete.type === "cond" && confirmDelete.index === i ? "#d32f2f" : "#c0392b")}
              </>}
            </div>
          )
        ))}
      </div>
    )}
    {/* 条件テンプレート */}
    <div style={{ display: "flex", gap: 3, marginBottom: 4, flexWrap: "wrap" }}>
      {condTemplates.map(t => (
        <button key={t} onClick={() => { setCondInput(t); }}
          style={{ padding: "2px 7px", borderRadius: 4, border: "1px solid #e0d8c0", background: "#fff8e0", color: "#b8860b", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
          {t}
        </button>
      ))}
    </div>
    {/* 条件追加 */}
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      <input value={condInput} onChange={e => setCondInput(e.target.value)}
        placeholder="条件分岐を追加（例: HP1000以上で）"
        style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid #e0d8c0", fontSize: 12, background: "#fff", color: "#333" }} />
      <input value={effectInput} onChange={e => setEffectInput(e.target.value)}
        placeholder="効果 (例: 査定+5)"
        style={{ width: 120, padding: "5px 8px", borderRadius: 5, border: "1px solid #e0d8c0", fontSize: 12, background: "#fff", color: "#333" }} />
      <button onClick={() => { if (condInput.trim()) { onAddCondition({ text: condInput.trim(), effect: effectInput.trim(), at: Date.now() }); setCondInput(""); setEffectInput(""); } }}
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
          editingComment && editingComment.index === i ? (
            <div key={i} style={{ display: "flex", gap: 3, marginBottom: 2, alignItems: "center" }}>
              <input value={editingComment.text} onChange={e => setEditingComment({ ...editingComment, text: e.target.value })}
                style={{ flex: 1, padding: "3px 6px", borderRadius: 4, border: "1px solid #666", fontSize: 11, background: "#fff", color: "#333" }} />
              {smallBtn("保存", handleSaveCommentEdit, "#555")}
              {smallBtn("取消", () => setEditingComment(null), "#999")}
            </div>
          ) : (
            <div key={i} style={{ fontSize: 11, color: "#555", padding: "2px 8px", background: "#f0f0ea", borderRadius: 4, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ flex: 1 }}>{c.text}</span>
              <span style={{ fontSize: 9, color: "#bbb", whiteSpace: "nowrap" }}>{c.at ? new Date(c.at).toLocaleDateString("ja") : ""}</span>
              {onUpdateComments && <>
                {smallBtn("編集", () => { setEditingComment({ index: i, text: c.text }); setConfirmDelete(null); }, "#555")}
                {smallBtn(confirmDelete && confirmDelete.type === "comment" && confirmDelete.index === i ? "確認" : "削除",
                  () => handleDeleteComment(i),
                  confirmDelete && confirmDelete.type === "comment" && confirmDelete.index === i ? "#d32f2f" : "#c0392b")}
              </>}
            </div>
          )
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

// --- テキスト一括インポート ---
export function BulkImportPanel({ cols, onImport, onClose }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState([]);
  const [error, setError] = useState("");

  function doParse() {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (!lines.length) { setError("データがありません"); return; }
    const results = [];
    for (const line of lines) {
      // 各行: "名前 査定 筋力 敏捷 技術 知力 精神" or タブ/カンマ区切り
      const parts = line.split(/[\t,\s]+/).filter(Boolean);
      if (parts.length < 2) continue;
      const name = parts[0];
      const values = {};
      cols.forEach((c, i) => {
        const v = parts[i + 1];
        if (v != null && v !== "" && v !== "-") {
          const n = parseInt(v, 10);
          if (!isNaN(n)) values[c.key] = n;
        }
      });
      results.push({ name, values });
    }
    if (results.length === 0) { setError("解析できる行がありません"); return; }
    setParsed(results);
    setError("");
  }

  return (
    <div style={{ background: "#f8f4e8", border: "1px solid #d5c89c", borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5a4010" }}>一括インポート</span>
        <button onClick={onClose} style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 6 }}>
        1行1件で「名前 査定 筋力 敏捷 技術 知力 精神」の順に入力（タブ/スペース/カンマ区切り）
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
        placeholder={"物理攻撃◎\t10\t100\t0\t50\t0\t0\n回避○\t5\t0\t80\t0\t0\t0"}
        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #d5d0c0", fontSize: 11, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }} />
      {error && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>{error}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={doParse} disabled={!text.trim()} style={{
          padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12,
          background: text.trim() ? "#b8860b" : "#ddd", color: text.trim() ? "#fff" : "#bbb", cursor: text.trim() ? "pointer" : "default",
        }}>解析</button>
        {parsed.length > 0 && (
          <button onClick={() => { onImport(parsed); onClose(); }} style={{
            padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12,
            background: "#27ae60", color: "#fff", cursor: "pointer",
          }}>反映 ({parsed.length}件)</button>
        )}
      </div>
      {parsed.length > 0 && (
        <div style={{ marginTop: 8, maxHeight: 150, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>解析結果プレビュー:</div>
          {parsed.map((p, i) => (
            <div key={i} style={{ fontSize: 10, padding: "2px 4px", borderBottom: "1px solid #eee", display: "flex", gap: 6 }}>
              <span style={{ fontWeight: 700, minWidth: 60 }}>{p.name}</span>
              {cols.map(c => <span key={c.key} style={{ color: c.color, minWidth: 30, textAlign: "center" }}>{p.values[c.key] ?? "-"}</span>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
