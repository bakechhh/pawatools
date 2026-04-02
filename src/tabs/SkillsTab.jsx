import { useState, useEffect, useMemo, useCallback } from "react";
import { GET, INSERT, UPSERT, saveHistory } from "../supabase.js";
import { JOBS, SKILL_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, MemoRow, TS, NumInput } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

export default function SkillsTab() {
  const [skills, setSkills] = useState([]);
  const [cats, setCats] = useState([]);
  const [catF, setCatF] = useState(0);
  const [jobId, setJobId] = useState(1);
  const [ld, setLd] = useState(true);
  const [sData, setSData] = useState({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(sData, true);

  useEffect(() => {
    Promise.all([
      GET("skills", "order=category_id,name"),
      GET("skill_categories", "order=sort_order"),
    ]).then(([s, c]) => { setSkills(s); setCats(c); setLd(false); });
  }, []);

  useEffect(() => {
    clearEdits();
    GET("skill_data", `job_id=eq.${jobId}`).then(rows => {
      const d = {}; rows.forEach(r => { d[r.skill_id] = r; }); setSData(d);
    });
  }, [jobId]);

  const list = useMemo(() => catF ? skills.filter(s => s.category_id === catF) : skills, [skills, catF]);

  const saveRow = useCallback(async (sid) => {
    setSaving(prev => ({ ...prev, [sid]: true }));
    const ex = sData[sid] || {};
    const changes = getEditsFor(sid);
    const p = {
      skill_id: sid, job_id: jobId,
      satei: ex.satei ?? null, satei_variable: ex.satei_variable ?? false,
      satei_note: ex.satei_note ?? null,
      exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0,
      exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, contributor: ex.contributor ?? null,
      ...changes,
    };
    if (sData[sid]?.id) {
      await saveHistory("skill_data", sData[sid].id, sData[sid], p);
      p.id = sData[sid].id;
    }
    const res = sData[sid]?.id ? await UPSERT("skill_data", p) : await INSERT("skill_data", p);
    if (res?.length) {
      setSData(prev => ({ ...prev, [sid]: res[0] }));
      clearEdits(sid);
      flash("✓ 保存完了");
    } else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [sid]: false }));
  }, [sData, jobId, getEditsFor, clearEdits]);

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
        {JOBS.map(j => (
          <Pill key={j.id} active={jobId === j.id} onClick={() => setJobId(j.id)} color={JC[j.name]}>
            {j.name}
          </Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
        <Pill active={catF === 0} onClick={() => setCatF(0)}>全て</Pill>
        {cats.map(c => (
          <Pill key={c.id} active={catF === c.id} onClick={() => setCatF(c.id)}>{c.name}</Pill>
        ))}
      </div>
      <SaveAllBtn count={dirtyIds.size} onClick={saveAll} />
      <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
        <table style={TS.table}>
          <thead>
            <tr>
              <th style={{ ...TS.th("#666"), minWidth: 110, textAlign: "left", paddingLeft: 8 }}>スキル名</th>
              {SKILL_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>)}
              <th style={{ ...TS.th("#b8860b"), width: 30, fontSize: 9 }}>詳細</th>
              <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => {
              const dirty = isDirty(s.id);
              const isExp = !!expanded[s.id];
              const cond = getVal(s.id, "satei_note");
              return [
                <tr key={s.id} style={{ background: dirty ? "#fff8e0" : i % 2 ? "#faf8f2" : "#fff" }}>
                  <td style={{
                    ...TS.td(false), fontWeight: 600, fontSize: 12, color: "#333",
                    paddingLeft: 8, borderRight: "2px solid #d5c89c", whiteSpace: "nowrap",
                  }}>
                    {s.name}{s.grade || ""}
                  </td>
                  {SKILL_COLS.map(c => {
                    const v = getVal(s.id, c.key);
                    const d = isDirty(s.id) && getVal(s.id, c.key) !== (sData[s.id]?.[c.key] ?? null);
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
                    condition={getVal(s.id, "satei_note")} memo={getVal(s.id, "notes")}
                    onConditionChange={v => edit(s.id, "satei_note", v)}
                    onMemoChange={v => edit(s.id, "notes", v)} />
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
