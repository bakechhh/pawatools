import { useState, useEffect, useCallback } from "react";
import { GET, UPSERT, saveHistory } from "../supabase.js";
import { JOBS, STATS, DATA_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, MemoRow, TS, NumInput } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

export default function BaseStatTab() {
  const [jobId, setJobId] = useState(1);
  const [statKey, setStatKey] = useState("hp");
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState({});

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(saved, true);

  const job = JOBS.find(j => j.id === jobId);
  const stat = STATS.find(s => s.key === statKey);
  const cap = job?.[stat?.cap] || 0;

  useEffect(() => {
    setLoading(true); clearEdits(); setExpanded({});
    GET("base_stat_costs", `job_id=eq.${jobId}&stat_type=eq.${statKey}&order=stat_value.asc`).then(rows => {
      const d = {}; rows.forEach(r => { d[r.stat_value] = r; });
      setSaved(d); setLoading(false);
    });
  }, [jobId, statKey]);

  const saveRow = useCallback(async (val) => {
    setSaving(prev => ({ ...prev, [val]: true }));
    const existing = saved[val] || {};
    const changes = getEditsFor(val);
    const payload = {
      job_id: jobId, stat_type: statKey, stat_value: val,
      satei_delta: existing.satei_delta ?? null,
      exp_kinryoku: existing.exp_kinryoku ?? 0,
      exp_binsoku: existing.exp_binsoku ?? 0,
      exp_gijutsu: existing.exp_gijutsu ?? 0,
      exp_chiryoku: existing.exp_chiryoku ?? 0,
      exp_seishin: existing.exp_seishin ?? 0,
      notes: existing.notes ?? null,
      contributor: existing.contributor ?? null,
      ...changes,
    };
    if (saved[val]?.id) await saveHistory("base_stat_costs", saved[val].id, saved[val], payload);
    const res = await UPSERT("base_stat_costs", payload);
    if (res?.length) {
      setSaved(prev => ({ ...prev, [val]: res[0] }));
      clearEdits(val);
      flash(`✓ ${stat.label}=${val} 保存`);
    } else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [val]: false }));
  }, [saved, jobId, statKey, getEditsFor, clearEdits, stat]);

  async function saveAll() {
    if (!dirtyIds.size) return;
    flash("一括保存中...");
    for (const v of dirtyIds) await saveRow(Number(v));
    flash(`✓ ${dirtyIds.size}件 一括保存完了`);
  }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  return (
    <div>
      {/* ジョブ選択 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {JOBS.map(j => (
          <Pill key={j.id} active={jobId === j.id} color={JC[j.name]}
            onClick={() => { setJobId(j.id); clearEdits(); }}>
            {j.name}
          </Pill>
        ))}
      </div>

      {/* 能力種タブ */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8, flexWrap: "wrap" }}>
        {STATS.map(s => (
          <button key={s.key} onClick={() => { setStatKey(s.key); clearEdits(); }} style={{
            padding: "5px 10px", fontSize: 11, cursor: "pointer", borderRadius: 6, minWidth: 54,
            textAlign: "center",
            border: statKey === s.key ? "2px solid #c8a020" : "1px solid #d5d0c0",
            background: statKey === s.key ? "linear-gradient(180deg,#fdf6e3,#f0dca0)" : "#faf8f2",
            color: statKey === s.key ? "#5a4010" : "#999",
            fontWeight: statKey === s.key ? 700 : 400,
          }}>
            <div>{s.label}</div>
            <div style={{ fontSize: 9, opacity: 0.7 }}>~{job?.[s.cap]}</div>
          </button>
        ))}
      </div>

      {/* ステータスバー */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 12px", marginBottom: 8, borderRadius: 8,
        background: "#3d3528", border: "2px solid #8b7340",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f0d880" }}>
          {job?.name} › {stat?.label} (0~{cap})
        </span>
        <span style={{ fontSize: 10, color: "#f0d88088" }}>
          {Object.keys(saved).length}件登録済
        </span>
      </div>

      <SaveAllBtn count={dirtyIds.size} onClick={saveAll} />

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>
      ) : (
        <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
          <table style={TS.table}>
            <thead>
              <tr>
                <th style={{ ...TS.th("#666"), width: 38, position: "sticky", left: 0, background: "#f8f4e8", zIndex: 2 }}>値</th>
                {DATA_COLS.map(c => (
                  <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>
                ))}
                <th style={{ ...TS.th("#b8860b"), width: 30, fontSize: 9 }}>詳細</th>
                <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cap + 1 }, (_, i) => i).map(val => {
                const dirty = isDirty(val);
                const isExp = !!expanded[val];
                const cond = getVal(val, "notes");
                return [
                  <tr key={val} style={{ background: dirty ? "#fff8e0" : val % 2 ? "#faf8f2" : "#fff" }}>
                    <td style={{
                      ...TS.td(false), textAlign: "center", fontWeight: 700, fontSize: 12,
                      color: val === cap ? "#c0392b" : val === 0 ? "#bbb" : "#333",
                      position: "sticky", left: 0,
                      background: dirty ? "#fff8e0" : val % 2 ? "#faf8f2" : "#fff",
                      zIndex: 1, borderRight: "2px solid #d5c89c",
                    }}>
                      {val}
                    </td>
                    {DATA_COLS.map(c => {
                      const v = getVal(val, c.key);
                      const d = isDirty(val) && getVal(val, c.key) !== (saved[val]?.[c.key] ?? null);
                      return (
                        <td key={c.key} style={{ ...TS.td(d), background: d ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                          <NumInput value={v} color={c.color} hasVal={v != null} dirty={d}
                            onChange={nv => edit(val, c.key, nv)} />
                        </td>
                      );
                    })}
                    <td style={{ ...TS.td(false), textAlign: "center" }}>
                      <button onClick={() => setExpanded(prev => ({ ...prev, [val]: !prev[val] }))} style={{
                        width: 24, height: 24, borderRadius: 4, border: "1px solid #d5d0c0",
                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                        background: cond ? "#fef3cd" : isExp ? "#eee" : "#fff",
                        color: cond ? "#b8860b" : "#999",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {cond ? "⚠" : isExp ? "▲" : "▼"}
                      </button>
                    </td>
                    <td style={{ ...TS.td(false), textAlign: "center" }}>
                      <SaveBtn active={dirty} saving={saving[val]} onClick={() => saveRow(val)} />
                    </td>
                  </tr>,
                  isExp && (
                    <MemoRow key={`${val}_m`} colSpan={DATA_COLS.length + 3}
                      condition={getVal(val, "notes")} memo={getVal(val, "contributor")}
                      onConditionChange={v => edit(val, "notes", v)}
                      onMemoChange={v => edit(val, "contributor", v)} />
                  ),
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
