import { useState, useEffect, useCallback, useRef } from "react";
import { GET } from "../supabase.js";
import { saveRow } from "../helpers/saveRow.js";
import { JOBS, STATS, DATA_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, NumInput, DetailRow, StatSequentialModal, TS } from "../components/UI.jsx";
import ScreenshotOCR from "../components/ScreenshotOCR.jsx";
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
function RangeFilter({ cap, range, setRange, savedCount }) {
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

// 集計パネル
function CalcPanel({ cap, savedCount, calcRange }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("0");
  const [to, setTo] = useState(String(cap));
  const [result, setResult] = useState(null);
  const [presets, setPresets] = useState([]);

  function doCalc(f, t) {
    const ff = Number(f), tt = Number(t);
    if (isNaN(ff) || isNaN(tt) || ff > tt) return;
    setResult({ ...calcRange(ff, tt), from: ff, to: tt });
  }

  function addPreset() {
    if (!result) return;
    setPresets(p => [...p, { ...result }]);
  }

  function removePreset(i) {
    setPresets(p => p.filter((_, idx) => idx !== i));
  }

  // プリセット同士の合算
  const presetSum = presets.reduce((acc, p) => ({
    satei: acc.satei + p.satei, kinryoku: acc.kinryoku + p.kinryoku, binsoku: acc.binsoku + p.binsoku,
    gijutsu: acc.gijutsu + p.gijutsu, chiryoku: acc.chiryoku + p.chiryoku, seishin: acc.seishin + p.seishin,
    total: acc.total + p.total,
  }), { satei: 0, kinryoku: 0, binsoku: 0, gijutsu: 0, chiryoku: 0, seishin: 0, total: 0 });

  const ni = { width: 52, height: 28, textAlign: "center", fontSize: 13, fontWeight: 600, borderRadius: 5, border: "1px solid #d5d0c0", background: "#fff", color: "#333" };

  function ResultRow({ label, r, color, onRemove }) {
    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #eee" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: color || "#5a4010", minWidth: 60 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#b8860b" }}>査定{r.satei}</span>
        <span style={{ fontSize: 10, color: "#c0392b" }}>筋{r.kinryoku}</span>
        <span style={{ fontSize: 10, color: "#2471a3" }}>敏{r.binsoku}</span>
        <span style={{ fontSize: 10, color: "#d4880f" }}>技{r.gijutsu}</span>
        <span style={{ fontSize: 10, color: "#7d3c98" }}>知{r.chiryoku}</span>
        <span style={{ fontSize: 10, color: "#1e8449" }}>精{r.seishin}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#333" }}>計{r.total}</span>
        {onRemove && <button onClick={onRemove} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid #ddd", background: "#fff", color: "#c0392b", cursor: "pointer" }}>✕</button>}
      </div>
    );
  }

  if (!open) return (
    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
      <button onClick={() => { setOpen(true); doCalc("0", String(cap)); }} style={{
        padding: "5px 12px", borderRadius: 6, border: "1px solid #d5d0c0",
        background: "#faf8f2", color: "#8b7340", fontSize: 11, fontWeight: 600, cursor: "pointer",
      }}>📊 集計</button>
      {savedCount > 0 && (() => {
        const all = calcRange(0, cap);
        return <span style={{ fontSize: 11, color: "#888" }}>全体: 査定{all.satei} / 経験点{all.total}</span>;
      })()}
    </div>
  );

  return (
    <div style={{ background: "#f8f4e8", border: "1px solid #d5c89c", borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5a4010" }}>📊 集計</span>
        <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}>✕ 閉じる</button>
      </div>

      {/* 範囲指定 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={from} onChange={e => setFrom(e.target.value)} style={ni} />
        <span style={{ color: "#888" }}>~</span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={to} onChange={e => setTo(e.target.value)} style={ni} />
        <button onClick={() => doCalc(from, to)} style={{
          padding: "5px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12,
          background: "#b8860b", color: "#fff", cursor: "pointer",
        }}>計算</button>
        {/* プリセットボタン */}
        <button onClick={() => { setFrom("0"); setTo(String(cap)); doCalc("0", String(cap)); }}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d5d0c0", background: "#fff", color: "#888", fontSize: 10, cursor: "pointer" }}>全範囲</button>
        <button onClick={() => { setFrom("0"); setTo("30"); doCalc("0", "30"); }}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d5d0c0", background: "#fff", color: "#888", fontSize: 10, cursor: "pointer" }}>0~30</button>
        <button onClick={() => { setFrom("31"); setTo("60"); doCalc("31", "60"); }}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d5d0c0", background: "#fff", color: "#888", fontSize: 10, cursor: "pointer" }}>31~60</button>
        <button onClick={() => { setFrom("61"); setTo(String(cap)); doCalc("61", String(cap)); }}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #d5d0c0", background: "#fff", color: "#888", fontSize: 10, cursor: "pointer" }}>61~{cap}</button>
      </div>

      {/* 結果 */}
      {result && (
        <div style={{ marginBottom: 6 }}>
          <ResultRow label={`${result.from}~${result.to}`} r={result} />
          <button onClick={addPreset} style={{
            marginTop: 4, padding: "3px 10px", borderRadius: 4, border: "1px solid #d5d0c0",
            background: "#fff", color: "#5a4010", fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>＋ この結果をストックに追加</button>
        </div>
      )}

      {/* ストック（複数範囲の結果を溜めて合算） */}
      {presets.length > 0 && (
        <div style={{ borderTop: "1px solid #e0d8c0", paddingTop: 6, marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>ストック:</div>
          {presets.map((p, i) => (
            <ResultRow key={i} label={`${p.from}~${p.to}`} r={p} onRemove={() => removePreset(i)} />
          ))}
          {presets.length >= 2 && (
            <ResultRow label="合算" r={presetSum} color="#27ae60" />
          )}
        </div>
      )}
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
  const [seqModal, setSeqModal] = useState(null); // { startVal }
  const [showOCR, setShowOCR] = useState(false);

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

  const doSave = useCallback(async (val, forcedChanges = null) => {
    setSaving(p => ({ ...p, [val]: true }));
    const ex = saved[val] || {};
    const changes = forcedChanges ?? getEditsFor(val);
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
    edit(val, "comments", [...(getVal(val, "comments") || ex.comments || []), { text, at: new Date().toISOString() }]);
  }
  function addCondition(val, cond) {
    const ex = saved[val] || {};
    const existing = getVal(val, "conditions") || ex.conditions || [];
    const item = typeof cond === "string" ? { text: cond, at: new Date().toISOString() } : cond;
    edit(val, "conditions", [...existing, item]);
  }
  function updateConditions(val, arr) { edit(val, "conditions", arr); }
  function updateComments(val, arr) { edit(val, "comments", arr); }

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

  // 集計用（CalcPanelから使う）
  function calcRange(from, to) {
    const zero = { satei: 0, kinryoku: 0, binsoku: 0, gijutsu: 0, chiryoku: 0, seishin: 0 };
    for (let v = from; v <= to; v++) {
      const r = saved[v];
      if (!r) continue;
      zero.satei += r.satei_delta || 0;
      zero.kinryoku += r.exp_kinryoku || 0;
      zero.binsoku += r.exp_binsoku || 0;
      zero.gijutsu += r.exp_gijutsu || 0;
      zero.chiryoku += r.exp_chiryoku || 0;
      zero.seishin += r.exp_seishin || 0;
    }
    zero.total = zero.kinryoku + zero.binsoku + zero.gijutsu + zero.chiryoku + zero.seishin;
    return zero;
  }

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", marginBottom: 4, borderRadius: 8, background: "#3d3528", border: "2px solid #8b7340" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f0d880" }}>{job?.name} › {stat?.label} (0~{cap})</span>
        <span style={{ fontSize: 10, color: "#f0d88088" }}>{savedCount}件登録済</span>
      </div>

      {/* 集計パネル */}
      {!loading && <CalcPanel cap={cap} savedCount={savedCount} calcRange={calcRange} />}

      {!loading && (
        <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
          <button onClick={() => setSeqModal({ startVal: 0 })} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "linear-gradient(180deg,#f0dca0,#c8a020)", color: "#5a4010",
            fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}>連続入力</button>
          <button onClick={() => setShowOCR(true)} style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: "linear-gradient(180deg,#a0d0f0,#2471a3)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}>スクショ読取</button>
          <CopyPanel cap={cap} getVal={getVal} edit={edit} saved={saved} onFlash={flash} />
        </div>
      )}
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
                    <td onClick={() => setSeqModal({ startVal: val })} style={{
                      ...TS.td(false), textAlign: "center", fontWeight: 700, fontSize: 12,
                      color: val === cap ? "#c0392b" : val === 0 ? "#bbb" : "#333",
                      borderRight: "2px solid #d5c89c",
                      background: dirty ? "#fff8e0" : hasData ? "#e8f5e8" : "inherit",
                      cursor: "pointer", userSelect: "none",
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
                    onAddCondition={c => addCondition(val, c)} onAddComment={t => addComment(val, t)}
                    onUpdateConditions={arr => updateConditions(val, arr)} onUpdateComments={arr => updateComments(val, arr)} />,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      {showOCR && (
        <ScreenshotOCR statKey={statKey} onClose={() => setShowOCR(false)}
          onResult={(r) => {
            if (r.statValue != null) {
              const sv = r.statValue;
              if (r.satei_delta != null) edit(sv, "satei_delta", r.satei_delta);
              if (r.exp_kinryoku != null) edit(sv, "exp_kinryoku", r.exp_kinryoku);
              if (r.exp_binsoku != null) edit(sv, "exp_binsoku", r.exp_binsoku);
              if (r.exp_gijutsu != null) edit(sv, "exp_gijutsu", r.exp_gijutsu);
              if (r.exp_chiryoku != null) edit(sv, "exp_chiryoku", r.exp_chiryoku);
              if (r.exp_seishin != null) edit(sv, "exp_seishin", r.exp_seishin);
              flash(`✓ ${stat.label}=${sv} にOCR結果を反映（未保存）`);
            } else {
              flash("ステータス値が未入力です");
            }
          }}
        />
      )}
      {seqModal && (
        <StatSequentialModal
          cols={DATA_COLS}
          currentVal={seqModal.startVal}
          cap={cap}
          getVal={getVal}
          onEdit={edit}
          onSave={doSave}
          onClose={() => setSeqModal(null)}
        />
      )}
      <Toast msg={toast} />
    </div>
  );
}
