import { useState, useEffect, useCallback, useRef } from "react";
import { GET } from "../supabase.js";
import { saveRow } from "../helpers/saveRow.js";
import { JOBS, STATS, DATA_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, NumInput, DetailRow, TS } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

// 範囲コピーパネル
function CopyPanel({ cap, getVal, edit, saved, onFlash }) {
  const [open, setOpen] = useState(false);
  const [srcRow, setSrcRow] = useState("");
  const [dstFrom, setDstFrom] = useState("");
  const [dstTo, setDstTo] = useState("");

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      padding: "5px 12px", borderRadius: 6, border: "1px solid #d5d0c0",
      background: "#faf8f2", color: "#8b7340", fontSize: 11, fontWeight: 600,
      cursor: "pointer",
    }}>📋 範囲コピー</button>
  );

  function doCopy() {
    const src = Number(srcRow);
    const from = Number(dstFrom);
    const to = Number(dstTo);
    if (isNaN(src) || isNaN(from) || isNaN(to) || from > to || src < 0 || to > cap) {
      onFlash("範囲が不正です"); return;
    }
    const srcData = saved[src] || {};
    const expCols = ["exp_kinryoku", "exp_binsoku", "exp_gijutsu", "exp_chiryoku", "exp_seishin"];
    let count = 0;
    for (let v = from; v <= to; v++) {
      if (v === src) continue;
      expCols.forEach(col => {
        const val = getVal(src, col);
        if (val != null) { edit(v, col, val); }
      });
      count++;
    }
    onFlash(`✓ ${src}行目の経験点を ${from}~${to} にコピー (${count}行)`);
  }

  const numInput = { width: 56, height: 30, textAlign: "center", fontSize: 13, fontWeight: 600, borderRadius: 5, border: "1px solid #d5d0c0", background: "#fff", color: "#333" };

  return (
    <div style={{ background: "#f5f0e0", border: "1px solid #d5c89c", borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5a4010" }}>📋 範囲コピー</span>
        <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}>✕ 閉じる</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
        <span style={{ color: "#5a4010", fontWeight: 600 }}>行</span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={srcRow} onChange={e => setSrcRow(e.target.value)} placeholder="元" style={numInput} />
        <span style={{ color: "#888" }}>→</span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={dstFrom} onChange={e => setDstFrom(e.target.value)} placeholder="開始" style={numInput} />
        <span style={{ color: "#888" }}>~</span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={dstTo} onChange={e => setDstTo(e.target.value)} placeholder="終了" style={numInput} />
        <button onClick={doCopy} disabled={!srcRow || !dstFrom || !dstTo} style={{
          padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12,
          background: srcRow && dstFrom && dstTo ? "#b8860b" : "#ddd",
          color: srcRow && dstFrom && dstTo ? "#fff" : "#bbb", cursor: srcRow && dstFrom && dstTo ? "pointer" : "default",
        }}>コピー</button>
      </div>
      <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
        例: 行7 → 8~20 にコピー（入力済み・編集中の値がコピーされます。保存前なので確認してから一括保存してください）
      </div>
    </div>
  );
}

// 表示範囲フィルタ
function RangeFilter({ cap, range, setRange, savedCount, onJumpToData }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: "#888" }}>表示:</span>
      <Pill active={range === "all"} onClick={() => setRange("all")}>全て (0~{cap})</Pill>
      <Pill active={range === "low"} onClick={() => setRange("low")}>0~30</Pill>
      <Pill active={range === "mid"} onClick={() => setRange("mid")}>31~60</Pill>
      <Pill active={range === "high"} onClick={() => setRange("high")}>61~{cap}</Pill>
      <Pill active={range === "filled"} onClick={() => setRange("filled")}>入力済 ({savedCount})</Pill>
    </div>
  );
}

export default function BaseStatTab() {
  const [jobId, setJobId] = useState(1);
  const [statKey, setStatKey] = useState("hp");
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});
  const [range, setRange] = useState("all");

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(saved, `${jobId}_${statKey}`);
  const job = JOBS.find(j => j.id === jobId);
  const stat = STATS.find(s => s.key === statKey);
  const cap = job?.[stat?.cap] || 0;

  useEffect(() => {
    setLoading(true); setExpanded({}); setRange("all");
    GET("base_stat_costs", `job_id=eq.${jobId}&stat_type=eq.${statKey}&order=stat_value.asc`).then(rows => {
      const d = {}; rows.forEach(r => { d[r.stat_value] = r; }); setSaved(d); setLoading(false);
    });
  }, [jobId, statKey]);

  const doSave = useCallback(async (val) => {
    setSaving(p => ({ ...p, [val]: true }));
    const ex = saved[val] || {};
    const changes = getEditsFor(val);
    const payload = {
      job_id: jobId, stat_type: statKey, stat_value: val,
      satei_delta: ex.satei_delta ?? null,
      exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0,
      exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, contributor: ex.contributor ?? null,
      comments: ex.comments ?? [], conditions: ex.conditions ?? [],
      ...changes,
    };
    const res = await saveRow("base_stat_costs", ex, payload);
    if (res?.length) {
      setSaved(p => ({ ...p, [val]: res[0] })); clearEdits(val);
      flash(`✓ ${stat.label}=${val} 保存`);
    } else { flash("保存失敗"); }
    setSaving(p => ({ ...p, [val]: false }));
  }, [saved, jobId, statKey, getEditsFor, clearEdits, stat]);

  async function doSaveAll() {
    if (!dirtyIds.size) return;
    flash("一括保存中...");
    for (const v of dirtyIds) await doSave(Number(v));
    flash(`✓ ${dirtyIds.size}件 一括保存完了`);
  }

  function addComment(val, text) {
    const ex = saved[val] || {};
    edit(val, "comments", [...(ex.comments || []), { text, at: new Date().toISOString() }]);
  }
  function addCondition(val, text) {
    const ex = saved[val] || {};
    edit(val, "conditions", [...(ex.conditions || []), { text, at: new Date().toISOString() }]);
  }

  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2500); }

  const getConditions = (val) => getVal(val, "conditions") || saved[val]?.conditions || [];
  const getComments = (val) => getVal(val, "comments") || saved[val]?.comments || [];

  // 表示する行をフィルタ
  const allRows = Array.from({ length: cap + 1 }, (_, i) => i);
  const visibleRows = allRows.filter(v => {
    if (range === "all") return true;
    if (range === "low") return v <= 30;
    if (range === "mid") return v >= 31 && v <= 60;
    if (range === "high") return v >= 61;
    if (range === "filled") return !!saved[v] || isDirty(v);
    return true;
  });

  const savedCount = Object.keys(saved).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {JOBS.map(j => <Pill key={j.id} active={jobId === j.id} color={JC[j.name]} onClick={() => setJobId(j.id)}>{j.name}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 8, flexWrap: "wrap" }}>
        {STATS.map(s => (
          <button key={s.key} onClick={() => setStatKey(s.key)} style={{
            padding: "5px 10px", fontSize: 11, cursor: "pointer", borderRadius: 6, minWidth: 54, textAlign: "center",
            border: statKey === s.key ? "2px solid #c8a020" : "1px solid #d5d0c0",
            background: statKey === s.key ? "linear-gradient(180deg,#fdf6e3,#f0dca0)" : "#faf8f2",
            color: statKey === s.key ? "#5a4010" : "#999", fontWeight: statKey === s.key ? 700 : 400,
          }}><div>{s.label}</div><div style={{ fontSize: 9, opacity: 0.7 }}>~{job?.[s.cap]}</div></button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", marginBottom: 8, borderRadius: 8, background: "#3d3528", border: "2px solid #8b7340" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f0d880" }}>{job?.name} › {stat?.label} (0~{cap})</span>
        <span style={{ fontSize: 10, color: "#f0d88088" }}>{savedCount}件登録済</span>
      </div>

      {!loading && <CopyPanel cap={cap} getVal={getVal} edit={edit} saved={saved} onFlash={flash} />}
      {!loading && <RangeFilter cap={cap} range={range} setRange={setRange} savedCount={savedCount} />}

      <SaveAllBtn count={dirtyIds.size} onClick={doSaveAll} />

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div> : (
        <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
          <table style={TS.table}>
            <thead><tr>
              <th style={{ ...TS.th("#666"), width: 38, position: "sticky", top: 0, zIndex: 3, background: "#f8f4e8" }}>値</th>
              {DATA_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50, position: "sticky", top: 0, zIndex: 3, background: "#f8f4e8" }}>{c.label}</th>)}
              <th style={{ ...TS.th("#b8860b"), width: 30, fontSize: 9, position: "sticky", top: 0, zIndex: 3, background: "#f8f4e8" }}>詳細</th>
              <th style={{ ...TS.th("#27ae60"), width: 42, position: "sticky", top: 0, zIndex: 3, background: "#f8f4e8" }}>保存</th>
            </tr></thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr><td colSpan={DATA_COLS.length + 3} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>
                  該当するデータがありません
                </td></tr>
              )}
              {visibleRows.map(val => {
                const dirty = isDirty(val);
                const isExp = !!expanded[val];
                const conds = getConditions(val);
                const comms = getComments(val);
                const hasDetail = conds.length > 0 || comms.length > 0;
                const hasData = !!saved[val];
                return [
                  <tr key={val} style={{
                    background: dirty ? "#fff8e0" : hasData ? "#f0faf0" : val % 2 ? "#faf8f2" : "#fff",
                  }}>
                    <td style={{
                      ...TS.td(false), textAlign: "center", fontWeight: 700, fontSize: 12,
                      color: val === cap ? "#c0392b" : val === 0 ? "#bbb" : "#333",
                      borderRight: "2px solid #d5c89c",
                      background: dirty ? "#fff8e0" : hasData ? "#e8f5e8" : "inherit",
                    }}>
                      {val}
                      {hasData && !dirty && <span style={{ fontSize: 8, color: "#27ae60", display: "block" }}>✓</span>}
                    </td>
                    {DATA_COLS.map(c => {
                      const v = getVal(val, c.key);
                      const cellDirty = isDirty(val) && v !== (saved[val]?.[c.key] ?? null);
                      return <td key={c.key} style={{ ...TS.td(cellDirty), background: cellDirty ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                        <NumInput value={v} color={c.color} hasVal={v != null} dirty={cellDirty} onChange={nv => edit(val, c.key, nv)} />
                      </td>;
                    })}
                    <td style={{ ...TS.td(false), textAlign: "center" }}>
                      <button onClick={() => setExpanded(p => ({ ...p, [val]: !p[val] }))} style={{
                        width: 24, height: 24, borderRadius: 4, border: "1px solid #d5d0c0", cursor: "pointer",
                        fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                        background: hasDetail ? "#fef3cd" : isExp ? "#eee" : "#fff",
                        color: hasDetail ? "#b8860b" : "#999",
                      }}>{hasDetail ? `⚠${conds.length + comms.length}` : isExp ? "▲" : "▼"}</button>
                    </td>
                    <td style={{ ...TS.td(false), textAlign: "center" }}>
                      <SaveBtn active={dirty} saving={saving[val]} onClick={() => doSave(val)} />
                    </td>
                  </tr>,
                  isExp && <DetailRow key={`${val}_d`} colSpan={DATA_COLS.length + 3}
                    conditions={conds} comments={comms}
                    onAddCondition={t => addCondition(val, t)} onAddComment={t => addComment(val, t)} />,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}
