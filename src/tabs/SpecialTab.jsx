import { useState, useEffect, useMemo, useCallback } from "react";
import { GET } from "../supabase.js";
import { saveRow } from "../helpers/saveRow.js";
import { JOBS, SKILL_COLS, JC, EL } from "../constants.js";
import { Pill, Badge, Toast, SaveBtn, SaveAllBtn, NumInput, DetailRow, TS } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

const GRADES = [
  { level: 1, label: "Lv1", color: "#666" },
  { level: 2, label: "Lv2", color: "#b8860b" },
];

export default function SpecialTab() {
  const [items, setItems] = useState([]);
  const [jobF, setJobF] = useState(0);
  const [jobId, setJobId] = useState(1);
  const [smData1, setSmData1] = useState({});
  const [smData2, setSmData2] = useState({});
  const [ld, setLd] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});

  const allData = useMemo(() => {
    const d = {};
    Object.entries(smData1).forEach(([k, v]) => { d[`1_${k}`] = v; });
    Object.entries(smData2).forEach(([k, v]) => { d[`2_${k}`] = v; });
    return d;
  }, [smData1, smData2]);

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(allData, `special_${jobId}_all`);

  useEffect(() => { GET("special_moves", "order=job_id,name").then(r => { setItems(r); setLd(false); }); }, []);
  useEffect(() => {
    Promise.all([
      GET("special_move_data", `job_id=eq.${jobId}&level=eq.1`),
      GET("special_move_data", `job_id=eq.${jobId}&level=eq.2`),
    ]).then(([r1, r2]) => {
      const d1 = {}; r1.forEach(r => { d1[r.special_move_id] = r; });
      const d2 = {}; r2.forEach(r => { d2[r.special_move_id] = r; });
      setSmData1(d1); setSmData2(d2);
    });
  }, [jobId]);

  const list = useMemo(() => jobF ? items.filter(s => s.job_id === jobF) : items, [items, jobF]);

  const doSave = useCallback(async (lv, sid) => {
    const key = `${lv}_${sid}`;
    setSaving(p => ({ ...p, [key]: true }));
    const ex = (lv === 1 ? smData1 : smData2)[sid] || {};
    const changes = getEditsFor(key);
    const p = {
      special_move_id: sid, job_id: jobId, level: lv,
      satei: ex.satei ?? null, exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0, exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, comments: ex.comments ?? [], conditions: ex.conditions ?? [],
      ...changes,
    };
    const res = await saveRow("special_move_data", ex, p);
    if (res?.length) {
      if (lv === 1) setSmData1(prev => ({ ...prev, [sid]: res[0] }));
      else setSmData2(prev => ({ ...prev, [sid]: res[0] }));
      clearEdits(key);
      flash("✓ 保存完了");
    } else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [key]: false }));
  }, [smData1, smData2, jobId, getEditsFor, clearEdits]);

  async function doSaveAll() {
    if (!dirtyIds.size) return;
    for (const k of dirtyIds) {
      const [lv, sid] = k.split("_");
      await doSave(Number(lv), Number(sid));
    }
    flash(`✓ ${dirtyIds.size}件 一括保存`);
  }

  function addCondition(key, cond) {
    const existing = getVal(key, "conditions") || allData[key]?.conditions || [];
    const item = typeof cond === "string" ? { text: cond, at: new Date().toISOString() } : cond;
    edit(key, "conditions", [...existing, item]);
  }
  function updateConditions(key, arr) { edit(key, "conditions", arr); }
  function addComment(key, text) { edit(key, "comments", [...(getVal(key, "comments") || allData[key]?.comments || []), { text, at: new Date().toISOString() }]); }
  function updateComments(key, arr) { edit(key, "comments", arr); }
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2500); }

  if (ld) return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>記録:</span>
        {JOBS.map(j => <Pill key={j.id} active={jobId === j.id} onClick={() => setJobId(j.id)} color={JC[j.name]}>{j.name}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>表示:</span>
        <Pill active={jobF === 0} onClick={() => setJobF(0)}>全て</Pill>
        {JOBS.map(j => <Pill key={j.id} active={jobF === j.id} onClick={() => setJobF(j.id)} color={JC[j.name]}>{j.name}</Pill>)}
      </div>
      <SaveAllBtn count={dirtyIds.size} onClick={doSaveAll} />
      <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
        <table style={TS.table}><thead><tr>
          <th style={{ ...TS.th("#666"), minWidth: 100, textAlign: "left", paddingLeft: 8 }}>必殺技名</th>
          <th style={{ ...TS.th("#666"), width: 26, fontSize: 10 }}>Lv</th>
          {SKILL_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>)}
          <th style={{ ...TS.th("#b8860b"), width: 26, fontSize: 9 }}>詳細</th>
          <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
        </tr></thead><tbody>
          {list.map((s, si) => {
            const jb = JOBS.find(j => j.id === s.job_id);
            return GRADES.map((gr, li) => {
              const key = `${gr.level}_${s.id}`;
              const dirty = isDirty(key);
              const isExp = !!expanded[key];
              const conds = getVal(key, "conditions") || allData[key]?.conditions || [];
              const comms = getVal(key, "comments") || allData[key]?.comments || [];
              const hasDetail = conds.length > 0 || comms.length > 0;
              return [
                <tr key={key} style={{ background: dirty ? "#fff8e0" : si % 2 ? "#faf8f2" : "#fff" }}>
                  {li === 0 && (
                    <td rowSpan={2} style={{ ...TS.td(false), fontWeight: 600, fontSize: 12, color: "#333", paddingLeft: 8, borderRight: "2px solid #d5c89c", verticalAlign: "middle", borderBottom: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span>{s.name}</span>
                        {jb && <Badge color={JC[jb.name]}>{jb.name}</Badge>}
                        {s.element && <Badge color={EL[s.element]}>{s.element}</Badge>}
                      </div>
                    </td>
                  )}
                  <td style={{ ...TS.td(false), textAlign: "center", fontSize: 11, fontWeight: 600, color: gr.color, padding: "2px 0" }}>{gr.label}</td>
                  {SKILL_COLS.map(c => {
                    const v = getVal(key, c.key);
                    const cellDirty = isDirty(key) && v !== (allData[key]?.[c.key] ?? null);
                    return <td key={c.key} style={{ ...TS.td(cellDirty), background: cellDirty ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                      <NumInput value={v} color={c.color} hasVal={v != null} dirty={cellDirty} onChange={nv => edit(key, c.key, nv)} />
                    </td>;
                  })}
                  <td style={{ ...TS.td(false), textAlign: "center" }}>
                    <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #d5d0c0", cursor: "pointer", fontSize: 10, fontWeight: 700, background: hasDetail ? "#fef3cd" : isExp ? "#eee" : "#fff", color: hasDetail ? "#b8860b" : "#999" }}>{hasDetail ? `${conds.length + comms.length}` : isExp ? "▲" : "▼"}</button>
                  </td>
                  <td style={{ ...TS.td(false), textAlign: "center" }}><SaveBtn active={dirty} saving={saving[key]} onClick={() => doSave(gr.level, s.id)} /></td>
                </tr>,
                isExp && <DetailRow key={`${key}_d`} colSpan={SKILL_COLS.length + 4}
                  conditions={conds} comments={comms}
                  onAddCondition={c => addCondition(key, c)} onAddComment={t => addComment(key, t)}
                  onUpdateConditions={arr => updateConditions(key, arr)} onUpdateComments={arr => updateComments(key, arr)} />,
              ];
            });
          })}
        </tbody></table>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
