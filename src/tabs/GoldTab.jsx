import { useState, useEffect, useCallback } from "react";
import { GET } from "../supabase.js";
import { saveRow } from "../helpers/saveRow.js";
import { JOBS, SKILL_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, NumInput, DetailRow, TS } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

const LEVELS = [1, 2];

export default function GoldTab() {
  const [items, setItems] = useState([]);
  const [jobId, setJobId] = useState(1);
  const [level, setLevel] = useState(1);
  const [gData, setGData] = useState({});
  const [ld, setLd] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(gData, `gold_${jobId}_${level}`);

  useEffect(() => { GET("gold_skills", "order=name").then(r => { setItems(r); setLd(false); }); }, []);
  useEffect(() => {
    GET("gold_skill_data", `job_id=eq.${jobId}&level=eq.${level}`).then(rows => {
      const d = {}; rows.forEach(r => { d[r.gold_skill_id] = r; }); setGData(d);
    });
  }, [jobId, level]);

  const doSave = useCallback(async (gid) => {
    setSaving(p => ({ ...p, [gid]: true }));
    const ex = gData[gid] || {};
    const changes = getEditsFor(gid);
    const p = {
      gold_skill_id: gid, job_id: jobId, level,
      satei: ex.satei ?? null, exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0, exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, comments: ex.comments ?? [], conditions: ex.conditions ?? [],
      ...changes,
    };
    const res = await saveRow("gold_skill_data", ex, p);
    if (res?.length) { setGData(prev => ({ ...prev, [gid]: res[0] })); clearEdits(gid); flash("✓ 保存完了"); }
    else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [gid]: false }));
  }, [gData, jobId, level, getEditsFor, clearEdits]);

  async function doSaveAll() { if (!dirtyIds.size) return; for (const gid of dirtyIds) await doSave(Number(gid)); flash(`✓ ${dirtyIds.size}件 一括保存`); }
  function addComment(gid, text) { const ex = gData[gid] || {}; edit(gid, "comments", [...(getVal(gid, "comments") || ex.comments || []), { text, at: new Date().toISOString() }]); }
  function addCondition(gid, cond) { const ex = gData[gid] || {}; const existing = getVal(gid, "conditions") || ex.conditions || []; const item = typeof cond === "string" ? { text: cond, at: new Date().toISOString() } : cond; edit(gid, "conditions", [...existing, item]); }
  function updateConditions(gid, arr) { edit(gid, "conditions", arr); }
  function updateComments(gid, arr) { edit(gid, "comments", arr); }
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2500); }

  if (ld) return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        {JOBS.map(j => <Pill key={j.id} active={jobId === j.id} onClick={() => setJobId(j.id)} color={JC[j.name]}>{j.name}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>Lv:</span>
        {LEVELS.map(lv => <Pill key={lv} active={level === lv} onClick={() => setLevel(lv)} color="#b8860b">Lv{lv}</Pill>)}
      </div>
      <SaveAllBtn count={dirtyIds.size} onClick={doSaveAll} />
      <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
        <table style={TS.table}><thead><tr>
          <th style={{ ...TS.th("#b8860b"), minWidth: 110, textAlign: "left", paddingLeft: 8 }}>金特名</th>
          {SKILL_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>)}
          <th style={{ ...TS.th("#b8860b"), width: 30, fontSize: 9 }}>詳細</th>
          <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
        </tr></thead><tbody>
          {items.map((g, i) => {
            const dirty = isDirty(g.id);
            const isExp = !!expanded[g.id];
            const conds = getVal(g.id, "conditions") || gData[g.id]?.conditions || [];
            const comms = getVal(g.id, "comments") || gData[g.id]?.comments || [];
            const hasDetail = conds.length > 0 || comms.length > 0;
            return [
              <tr key={g.id} style={{ background: dirty ? "#fff8e0" : i % 2 ? "#faf8f2" : "#fff" }}>
                <td style={{ ...TS.td(false), fontWeight: 700, fontSize: 12, color: "#b8860b", paddingLeft: 8, borderRight: "2px solid #d5c89c", whiteSpace: "nowrap" }}>★ {g.name}</td>
                {SKILL_COLS.map(c => {
                  const v = getVal(g.id, c.key);
                  const cellDirty = isDirty(g.id) && v !== (gData[g.id]?.[c.key] ?? null);
                  return <td key={c.key} style={{ ...TS.td(cellDirty), background: cellDirty ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                    <NumInput value={v} color={c.color} hasVal={v != null} dirty={cellDirty} onChange={nv => edit(g.id, c.key, nv)} />
                  </td>;
                })}
                <td style={{ ...TS.td(false), textAlign: "center" }}>
                  <button onClick={() => setExpanded(p => ({ ...p, [g.id]: !p[g.id] }))} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #d5d0c0", cursor: "pointer", fontSize: 10, fontWeight: 700, background: hasDetail ? "#fef3cd" : isExp ? "#eee" : "#fff", color: hasDetail ? "#b8860b" : "#999" }}>{hasDetail ? `⚠${conds.length + comms.length}` : isExp ? "▲" : "▼"}</button>
                </td>
                <td style={{ ...TS.td(false), textAlign: "center" }}><SaveBtn active={dirty} saving={saving[g.id]} onClick={() => doSave(g.id)} /></td>
              </tr>,
              isExp && <DetailRow key={`${g.id}_d`} colSpan={SKILL_COLS.length + 3}
                conditions={conds} comments={comms}
                onAddCondition={c => addCondition(g.id, c)} onAddComment={t => addComment(g.id, t)}
                onUpdateConditions={arr => updateConditions(g.id, arr)} onUpdateComments={arr => updateComments(g.id, arr)} />,
            ];
          })}
        </tbody></table>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
