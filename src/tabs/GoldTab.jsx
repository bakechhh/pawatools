import { useState, useEffect, useMemo, useCallback } from "react";
import { GET, INSERT, UPSERT, saveHistory } from "../supabase.js";
import { JOBS, SKILL_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, MemoRow, TS, NumInput } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

export default function GoldTab() {
  const [items, setItems] = useState([]);
  const [jobId, setJobId] = useState(1);
  const [gData, setGData] = useState({});
  const [ld, setLd] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(gData, `gold_${jobId}`);

  useEffect(() => { GET("gold_skills", "order=name").then(r => { setItems(r); setLd(false); }); }, []);
  useEffect(() => {
    GET("gold_skill_data", `job_id=eq.${jobId}`).then(rows => {
      const d = {}; rows.forEach(r => { d[r.gold_skill_id] = r; }); setGData(d);
    });
  }, [jobId]);

  const saveRow = useCallback(async (gid) => {
    setSaving(prev => ({ ...prev, [gid]: true }));
    const ex = gData[gid] || {};
    const changes = getEditsFor(gid);
    const p = {
      gold_skill_id: gid, job_id: jobId,
      satei: ex.satei ?? null,
      exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0,
      exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, contributor: ex.contributor ?? null,
      ...changes,
    };
    if (gData[gid]?.id) {
      await saveHistory("gold_skill_data", gData[gid].id, gData[gid], p);
      p.id = gData[gid].id;
    }
    const res = gData[gid]?.id ? await UPSERT("gold_skill_data", p) : await INSERT("gold_skill_data", p);
    if (res?.length) {
      setGData(prev => ({ ...prev, [gid]: res[0] }));
      clearEdits(gid);
      flash("✓ 保存完了");
    } else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [gid]: false }));
  }, [gData, jobId, getEditsFor, clearEdits]);

  async function saveAll() {
    if (!dirtyIds.size) return;
    for (const gid of dirtyIds) await saveRow(Number(gid));
    flash(`✓ ${dirtyIds.size}件 一括保存`);
  }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  if (ld) return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {JOBS.map(j => (
          <Pill key={j.id} active={jobId === j.id} onClick={() => setJobId(j.id)} color={JC[j.name]}>
            {j.name}
          </Pill>
        ))}
      </div>
      <SaveAllBtn count={dirtyIds.size} onClick={saveAll} />
      <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
        <table style={TS.table}>
          <thead>
            <tr>
              <th style={{ ...TS.th("#b8860b"), minWidth: 110, textAlign: "left", paddingLeft: 8 }}>金特名</th>
              {SKILL_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>)}
              <th style={{ ...TS.th("#b8860b"), width: 30, fontSize: 9 }}>詳細</th>
              <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g, i) => {
              const dirty = isDirty(g.id);
              const isExp = !!expanded[g.id];
              const cond = getVal(g.id, "notes");
              return [
                <tr key={g.id} style={{ background: dirty ? "#fff8e0" : i % 2 ? "#faf8f2" : "#fff" }}>
                  <td style={{
                    ...TS.td(false), fontWeight: 700, fontSize: 12, color: "#b8860b",
                    paddingLeft: 8, borderRight: "2px solid #d5c89c", whiteSpace: "nowrap",
                  }}>
                    ★ {g.name}
                  </td>
                  {SKILL_COLS.map(c => {
                    const v = getVal(g.id, c.key);
                    const d = isDirty(g.id) && getVal(g.id, c.key) !== (gData[g.id]?.[c.key] ?? null);
                    return (
                      <td key={c.key} style={{ ...TS.td(d), background: d ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                        <NumInput value={v} color={c.color} hasVal={v != null} dirty={d}
                          onChange={nv => edit(g.id, c.key, nv)} />
                      </td>
                    );
                  })}
                  <td style={{ ...TS.td(false), textAlign: "center" }}>
                    <button onClick={() => setExpanded(prev => ({ ...prev, [g.id]: !prev[g.id] }))} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #d5d0c0",
                      cursor: "pointer", fontSize: 11, fontWeight: 700,
                      background: cond ? "#fef3cd" : isExp ? "#eee" : "#fff",
                      color: cond ? "#b8860b" : "#999",
                    }}>
                      {cond ? "⚠" : isExp ? "▲" : "▼"}
                    </button>
                  </td>
                  <td style={{ ...TS.td(false), textAlign: "center" }}>
                    <SaveBtn active={dirty} saving={saving[g.id]} onClick={() => saveRow(g.id)} />
                  </td>
                </tr>,
                isExp && (
                  <MemoRow key={`${g.id}_m`} colSpan={SKILL_COLS.length + 3}
                    condition={getVal(g.id, "notes")} memo={getVal(g.id, "contributor")}
                    onConditionChange={v => edit(g.id, "notes", v)}
                    onMemoChange={v => edit(g.id, "contributor", v)} />
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
