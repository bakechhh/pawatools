import { useState, useEffect, useMemo, useCallback } from "react";
import { GET, INSERT, UPSERT, saveHistory } from "../supabase.js";
import { JOBS, SKILL_COLS, JC, EL } from "../constants.js";
import { Pill, Badge, Toast, SaveBtn, SaveAllBtn, MemoRow, TS, NumInput } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

export default function SpecialTab() {
  const [items, setItems] = useState([]);
  const [jobF, setJobF] = useState(0);
  const [jobId, setJobId] = useState(1);
  const [smData, setSmData] = useState({});
  const [ld, setLd] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(smData, `special_${jobId}`);

  useEffect(() => { GET("special_moves", "order=job_id,name").then(r => { setItems(r); setLd(false); }); }, []);
  useEffect(() => {
    GET("special_move_data", `job_id=eq.${jobId}`).then(rows => {
      const d = {}; rows.forEach(r => { d[r.special_move_id] = r; }); setSmData(d);
    });
  }, [jobId]);

  const list = useMemo(() => jobF ? items.filter(s => s.job_id === jobF) : items, [items, jobF]);

  const saveRow = useCallback(async (sid) => {
    setSaving(prev => ({ ...prev, [sid]: true }));
    const ex = smData[sid] || {};
    const changes = getEditsFor(sid);
    const p = {
      special_move_id: sid, job_id: jobId,
      satei: ex.satei ?? null,
      exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0,
      exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, contributor: ex.contributor ?? null,
      ...changes,
    };
    if (smData[sid]?.id) {
      await saveHistory("special_move_data", smData[sid].id, smData[sid], p);
      p.id = smData[sid].id;
    }
    const res = smData[sid]?.id ? await UPSERT("special_move_data", p) : await INSERT("special_move_data", p);
    if (res?.length) {
      setSmData(prev => ({ ...prev, [sid]: res[0] }));
      clearEdits(sid);
      flash("✓ 保存完了");
    } else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [sid]: false }));
  }, [smData, jobId, getEditsFor, clearEdits]);

  async function saveAll() {
    if (!dirtyIds.size) return;
    for (const sid of dirtyIds) await saveRow(Number(sid));
    flash(`✓ ${dirtyIds.size}件 一括保存`);
  }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  if (ld) return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>記録:</span>
        {JOBS.map(j => (
          <Pill key={j.id} active={jobId === j.id} onClick={() => setJobId(j.id)} color={JC[j.name]}>
            {j.name}
          </Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>表示:</span>
        <Pill active={jobF === 0} onClick={() => setJobF(0)}>全て</Pill>
        {JOBS.map(j => (
          <Pill key={j.id} active={jobF === j.id} onClick={() => setJobF(j.id)} color={JC[j.name]}>
            {j.name}
          </Pill>
        ))}
      </div>
      <SaveAllBtn count={dirtyIds.size} onClick={saveAll} />
      <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
        <table style={TS.table}>
          <thead>
            <tr>
              <th style={{ ...TS.th("#666"), minWidth: 130, textAlign: "left", paddingLeft: 8 }}>必殺技名</th>
              {SKILL_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>)}
              <th style={{ ...TS.th("#b8860b"), width: 30, fontSize: 9 }}>詳細</th>
              <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => {
              const jb = JOBS.find(j => j.id === s.job_id);
              const dirty = isDirty(s.id);
              const isExp = !!expanded[s.id];
              const cond = getVal(s.id, "notes");
              return [
                <tr key={s.id} style={{ background: dirty ? "#fff8e0" : i % 2 ? "#faf8f2" : "#fff" }}>
                  <td style={{
                    ...TS.td(false), fontWeight: 600, fontSize: 12, color: "#333",
                    paddingLeft: 8, borderRight: "2px solid #d5c89c",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap" }}>
                      <span style={{ whiteSpace: "nowrap" }}>{s.name}</span>
                      {jb && <Badge color={JC[jb.name]}>{jb.name}</Badge>}
                      {s.element && <Badge color={EL[s.element]}>{s.element}</Badge>}
                    </div>
                  </td>
                  {SKILL_COLS.map(c => {
                    const v = getVal(s.id, c.key);
                    const d = isDirty(s.id) && getVal(s.id, c.key) !== (smData[s.id]?.[c.key] ?? null);
                    return (
                      <td key={c.key} style={{ ...TS.td(d), background: d ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                        <NumInput value={v} color={c.color} hasVal={v != null} dirty={d}
                          onChange={nv => edit(s.id, c.key, nv)} />
                      </td>
                    );
                  })}
                  <td style={{ ...TS.td(false), textAlign: "center" }}>
                    <button onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #d5d0c0",
                      cursor: "pointer", fontSize: 11, fontWeight: 700,
                      background: cond ? "#fef3cd" : isExp ? "#eee" : "#fff",
                      color: cond ? "#b8860b" : "#999",
                    }}>
                      {cond ? "⚠" : isExp ? "▲" : "▼"}
                    </button>
                  </td>
                  <td style={{ ...TS.td(false), textAlign: "center" }}>
                    <SaveBtn active={dirty} saving={saving[s.id]} onClick={() => saveRow(s.id)} />
                  </td>
                </tr>,
                isExp && (
                  <MemoRow key={`${s.id}_m`} colSpan={SKILL_COLS.length + 3}
                    condition={getVal(s.id, "notes")} memo={getVal(s.id, "contributor")}
                    onConditionChange={v => edit(s.id, "notes", v)}
                    onMemoChange={v => edit(s.id, "contributor", v)} />
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
