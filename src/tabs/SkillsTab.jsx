import { useState, useEffect, useMemo, useCallback } from "react";
import { GET, UPSERT } from "../supabase.js";
import { saveRow } from "../helpers/saveRow.js";
import { JOBS, SKILL_COLS, JC } from "../constants.js";
import { Pill, Toast, SaveBtn, SaveAllBtn, NumInput, DetailRow, SkillInputModal, BulkImportPanel, TS } from "../components/UI.jsx";
import { useEditable } from "../hooks/useEditable.js";

// スキル集計パネル
function SkillCalcPanel({ list, sData, getVal }) {
  const [open, setOpen] = useState(false);

  const calc = useMemo(() => {
    const r = { satei: 0, kinryoku: 0, binsoku: 0, gijutsu: 0, chiryoku: 0, seishin: 0, count: 0 };
    list.forEach(s => {
      const v = k => getVal(s.id, k) ?? sData[s.id]?.[k] ?? null;
      if (v("satei") != null) { r.satei += v("satei") || 0; r.count++; }
      r.kinryoku += v("exp_kinryoku") || 0;
      r.binsoku += v("exp_binsoku") || 0;
      r.gijutsu += v("exp_gijutsu") || 0;
      r.chiryoku += v("exp_chiryoku") || 0;
      r.seishin += v("exp_seishin") || 0;
    });
    r.total = r.kinryoku + r.binsoku + r.gijutsu + r.chiryoku + r.seishin;
    return r;
  }, [list, sData, getVal]);

  if (!open) return (
    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
      <button onClick={() => setOpen(true)} style={{
        padding: "5px 12px", borderRadius: 6, border: "1px solid #d5d0c0",
        background: "#faf8f2", color: "#8b7340", fontSize: 11, fontWeight: 600, cursor: "pointer",
      }}>集計</button>
      {calc.count > 0 && <span style={{ fontSize: 11, color: "#888" }}>査定{calc.satei} / 経験点{calc.total} ({calc.count}件)</span>}
    </div>
  );

  return (
    <div style={{ background: "#f8f4e8", border: "1px solid #d5c89c", borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5a4010" }}>集計 ({calc.count}件入力済)</span>
        <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
        <span style={{ fontWeight: 700, color: "#b8860b" }}>査定 {calc.satei}</span>
        <span style={{ color: "#c0392b" }}>筋力 {calc.kinryoku}</span>
        <span style={{ color: "#2471a3" }}>敏捷 {calc.binsoku}</span>
        <span style={{ color: "#d4880f" }}>技術 {calc.gijutsu}</span>
        <span style={{ color: "#7d3c98" }}>知力 {calc.chiryoku}</span>
        <span style={{ color: "#1e8449" }}>精神 {calc.seishin}</span>
        <span style={{ fontWeight: 700, color: "#333" }}>経験点計 {calc.total}</span>
      </div>
    </div>
  );
}

// 役職間比較モーダル
function JobCompareModal({ skill, onClose }) {
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(JOBS.map(j =>
      GET("skill_data", `skill_id=eq.${skill.id}&job_id=eq.${j.id}`).then(rows => ({ jobId: j.id, data: rows[0] || null }))
    )).then(results => {
      const d = {};
      results.forEach(r => { d[r.jobId] = r.data; });
      setAllData(d);
      setLoading(false);
    });
  }, [skill.id]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "90%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto",
        background: "#faf8f2", borderRadius: 12, padding: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#5a4010" }}>{skill.name}{skill.grade || ""} 役職比較</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 14, border: "none", background: "#e0d8c0", color: "#666", fontSize: 16, cursor: "pointer" }}>×</button>
        </div>
        {loading ? <div style={{ textAlign: "center", padding: 20, color: "#999" }}>読み込み中...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>
              <th style={{ padding: 6, textAlign: "left", borderBottom: "2px solid #d5c89c", fontSize: 11 }}>役職</th>
              {SKILL_COLS.map(c => <th key={c.key} style={{ padding: 4, textAlign: "center", borderBottom: "2px solid #d5c89c", color: c.color, fontSize: 10 }}>{c.label}</th>)}
            </tr></thead>
            <tbody>
              {JOBS.map(j => {
                const d = allData[j.id];
                return (
                  <tr key={j.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "6px 4px", fontWeight: 700, color: JC[j.name], fontSize: 12 }}>{j.name}</td>
                    {SKILL_COLS.map(c => (
                      <td key={c.key} style={{ padding: 4, textAlign: "center", fontWeight: d?.[c.key] != null ? 700 : 400, color: d?.[c.key] != null ? c.color : "#ccc", background: d?.[c.key] != null ? c.bg : "transparent" }}>
                        {d?.[c.key] != null ? d[c.key] : "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// 役職間コピーモーダル
function RoleCopyModal({ jobId, sData, onClose, onDone }) {
  const [targets, setTargets] = useState({});
  const [copying, setCopying] = useState(false);

  const filledSkills = Object.entries(sData).filter(([, d]) => d?.satei != null);
  const currentJob = JOBS.find(j => j.id === jobId);
  const otherJobs = JOBS.filter(j => j.id !== jobId);

  const toggle = (id) => setTargets(p => ({ ...p, [id]: !p[id] }));
  const selectedCount = Object.values(targets).filter(Boolean).length;

  async function doCopy() {
    setCopying(true);
    let count = 0;
    for (const [skillId, data] of filledSkills) {
      for (const job of otherJobs) {
        if (!targets[job.id]) continue;
        const payload = {
          skill_id: Number(skillId), job_id: job.id,
          satei: data.satei, exp_kinryoku: data.exp_kinryoku || 0,
          exp_binsoku: data.exp_binsoku || 0, exp_gijutsu: data.exp_gijutsu || 0,
          exp_chiryoku: data.exp_chiryoku || 0, exp_seishin: data.exp_seishin || 0,
          notes: data.notes || null, comments: data.comments || [], conditions: data.conditions || [],
        };
        await UPSERT("skill_data", payload);
        count++;
      }
    }
    setCopying(false);
    onDone(count);
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "90%", maxWidth: 400, background: "#faf8f2", borderRadius: 12, padding: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#5a4010" }}>他役職にコピー</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 14, border: "none", background: "#e0d8c0", color: "#666", fontSize: 16, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: "#8b7340", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: JC[currentJob.name] }}>{currentJob.name}</span> のスキルデータ
          <span style={{ fontWeight: 700 }}> {filledSkills.length}件</span> を選択した役職にコピーします。
        </div>

        {filledSkills.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 12 }}>コピーできるデータがありません</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {otherJobs.map(j => (
                <label key={j.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  background: targets[j.id] ? "#fff8e0" : "#fff", border: `1px solid ${targets[j.id] ? JC[j.name] : "#d5d0c0"}`,
                  borderRadius: 8, cursor: "pointer", transition: "all .15s",
                }}>
                  <input type="checkbox" checked={!!targets[j.id]} onChange={() => toggle(j.id)} />
                  <span style={{ fontWeight: 700, color: JC[j.name], fontSize: 13 }}>{j.name}</span>
                </label>
              ))}
            </div>
            <button onClick={doCopy} disabled={selectedCount === 0 || copying} style={{
              width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
              background: selectedCount > 0 && !copying ? "linear-gradient(180deg,#f0dca0,#c8a020)" : "#ddd",
              color: selectedCount > 0 && !copying ? "#5a4010" : "#999",
              fontSize: 13, fontWeight: 700, cursor: selectedCount > 0 && !copying ? "pointer" : "default",
            }}>
              {copying ? "コピー中..." : `${selectedCount}役職にコピー (${filledSkills.length * selectedCount}件)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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
  const [modalSkill, setModalSkill] = useState(null);
  const [compareSkill, setCompareSkill] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "filled" | "empty"
  const [seqMode, setSeqMode] = useState(false);
  const [seqIdx, setSeqIdx] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor } = useEditable(sData, `skill_${jobId}`);

  useEffect(() => { Promise.all([GET("skills", "order=sort_order.asc.nullsfirst,category_id,name"), GET("skill_categories", "order=sort_order")]).then(([s, c]) => { setSkills(s); setCats(c); setLd(false); }); }, []);
  useEffect(() => { GET("skill_data", `job_id=eq.${jobId}`).then(rows => { const d = {}; rows.forEach(r => { d[r.skill_id] = r; }); setSData(d); }); }, [jobId]);

  const list = useMemo(() => {
    let arr = skills;
    if (catF) arr = arr.filter(s => s.category_id === catF);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(s => s.name.toLowerCase().includes(q) || (s.grade || "").includes(q));
    }
    if (filter === "filled") arr = arr.filter(s => sData[s.id]?.satei != null || isDirty(s.id));
    if (filter === "empty") arr = arr.filter(s => sData[s.id]?.satei == null && !isDirty(s.id));
    return arr;
  }, [skills, catF, search, filter, sData, isDirty]);

  const filledCount = useMemo(() => skills.filter(s => sData[s.id]?.satei != null).length, [skills, sData]);

  const doSave = useCallback(async (sid) => {
    setSaving(p => ({ ...p, [sid]: true }));
    const ex = sData[sid] || {};
    const changes = getEditsFor(sid);
    const p = {
      skill_id: sid, job_id: jobId,
      satei: ex.satei ?? null, exp_kinryoku: ex.exp_kinryoku ?? 0, exp_binsoku: ex.exp_binsoku ?? 0,
      exp_gijutsu: ex.exp_gijutsu ?? 0, exp_chiryoku: ex.exp_chiryoku ?? 0, exp_seishin: ex.exp_seishin ?? 0,
      notes: ex.notes ?? null, comments: ex.comments ?? [], conditions: ex.conditions ?? [],
      ...changes,
    };
    const res = await saveRow("skill_data", ex, p);
    if (res?.length) { setSData(prev => ({ ...prev, [sid]: res[0] })); clearEdits(sid); flash("✓ 保存完了"); }
    else { flash("保存失敗"); }
    setSaving(prev => ({ ...prev, [sid]: false }));
  }, [sData, jobId, getEditsFor, clearEdits]);

  async function doSaveAll() { if (!dirtyIds.size) return; for (const sid of dirtyIds) await doSave(Number(sid)); flash(`✓ ${dirtyIds.size}件 一括保存`); }

  function addCondition(sid, cond) {
    const ex = sData[sid] || {};
    const existing = getVal(sid, "conditions") || ex.conditions || [];
    // cond can be string (legacy) or { text, effect, at }
    const item = typeof cond === "string" ? { text: cond, at: new Date().toISOString() } : cond;
    edit(sid, "conditions", [...existing, item]);
  }
  function updateConditions(sid, arr) { edit(sid, "conditions", arr); }
  function addComment(sid, text) { const ex = sData[sid] || {}; edit(sid, "comments", [...(getVal(sid, "comments") || ex.comments || []), { text, at: new Date().toISOString() }]); }
  function updateComments(sid, arr) { edit(sid, "comments", arr); }

  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2500); }

  // 連続入力: 現在のスキルにモーダルを開いて、反映後に次へ
  function seqNext() {
    if (seqIdx < list.length - 1) {
      setSeqIdx(seqIdx + 1);
      setModalSkill(list[seqIdx + 1]);
    } else {
      setSeqMode(false);
      setModalSkill(null);
      flash("✓ 連続入力完了");
    }
  }

  function startSeqMode() {
    setSeqMode(true);
    setSeqIdx(0);
    if (list.length > 0) setModalSkill(list[0]);
  }

  if (ld) return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        {JOBS.map(j => <Pill key={j.id} active={jobId === j.id} onClick={() => setJobId(j.id)} color={JC[j.name]}>{j.name}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
        <Pill active={catF === 0} onClick={() => setCatF(0)}>全て</Pill>
        {cats.map(c => <Pill key={c.id} active={catF === c.id} onClick={() => setCatF(c.id)}>{c.name}</Pill>)}
      </div>

      {/* 検索 + フィルタ + 連続入力 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="スキル検索..."
          style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid #d5d0c0", fontSize: 12, background: "#fff", color: "#333" }} />
        <div style={{ display: "flex", gap: 2 }}>
          <Pill active={filter === "all"} onClick={() => setFilter("all")}>全て</Pill>
          <Pill active={filter === "filled"} onClick={() => setFilter("filled")}>入力済({filledCount})</Pill>
          <Pill active={filter === "empty"} onClick={() => setFilter("empty")}>未入力</Pill>
        </div>
        <button onClick={startSeqMode} style={{
          padding: "6px 14px", borderRadius: 8, border: "none",
          background: "linear-gradient(180deg,#f0dca0,#c8a020)", color: "#5a4010",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>連続入力</button>
        <button onClick={() => setShowImport(!showImport)} style={{
          padding: "6px 10px", borderRadius: 6, border: "1px solid #d5d0c0",
          background: "#faf8f2", color: "#8b7340", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>一括入力</button>
        <button onClick={() => setShowCopy(true)} style={{
          padding: "6px 10px", borderRadius: 6, border: "1px solid #d5d0c0",
          background: "#faf8f2", color: "#8b7340", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>他役職にコピー</button>
      </div>

      {/* 一括インポート */}
      {showImport && (
        <BulkImportPanel cols={SKILL_COLS} onClose={() => setShowImport(false)}
          onImport={(rows) => {
            let count = 0;
            rows.forEach(r => {
              const sk = skills.find(s => s.name === r.name || `${s.name}${s.grade || ""}` === r.name);
              if (!sk) return;
              Object.entries(r.values).forEach(([key, val]) => { edit(sk.id, key, val); });
              count++;
            });
            flash(`✓ ${count}件 反映（未保存）`);
          }}
        />
      )}

      {/* 集計パネル */}
      <SkillCalcPanel list={list} sData={sData} getVal={getVal} />

      <SaveAllBtn count={dirtyIds.size} onClick={doSaveAll} />
      <div style={{ overflowX: "auto", border: "2px solid #d5c89c", borderRadius: 8, background: "#fff" }}>
        <table style={TS.table}><thead><tr>
          <th style={{ ...TS.th("#666"), minWidth: 110, textAlign: "left", paddingLeft: 8 }}>スキル名</th>
          {SKILL_COLS.map(c => <th key={c.key} style={{ ...TS.th(c.color), width: 50 }}>{c.label}</th>)}
          <th style={{ ...TS.th("#2471a3"), width: 26, fontSize: 8 }}>比較</th>
          <th style={{ ...TS.th("#b8860b"), width: 26, fontSize: 9 }}>詳細</th>
          <th style={{ ...TS.th("#27ae60"), width: 42 }}>保存</th>
        </tr></thead><tbody>
          {list.map((s, i) => {
            const dirty = isDirty(s.id);
            const isExp = !!expanded[s.id];
            const conds = getVal(s.id, "conditions") || sData[s.id]?.conditions || [];
            const comms = getVal(s.id, "comments") || sData[s.id]?.comments || [];
            const hasDetail = conds.length > 0 || comms.length > 0;
            return [
              <tr key={s.id} style={{ background: dirty ? "#fff8e0" : i % 2 ? "#faf8f2" : "#fff" }}>
                <td onClick={() => setModalSkill(s)} style={{ ...TS.td(false), fontWeight: 600, fontSize: 12, color: "#333", paddingLeft: 8, borderRight: "2px solid #d5c89c", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>{s.name}{s.grade || ""}</td>
                {SKILL_COLS.map(c => {
                  const v = getVal(s.id, c.key);
                  const cellDirty = isDirty(s.id) && v !== (sData[s.id]?.[c.key] ?? null);
                  return <td key={c.key} style={{ ...TS.td(cellDirty), background: cellDirty ? "#fff8e0" : v != null ? c.bg : "transparent" }}>
                    <NumInput value={v} color={c.color} hasVal={v != null} dirty={cellDirty} onChange={nv => edit(s.id, c.key, nv)} />
                  </td>;
                })}
                <td style={{ ...TS.td(false), textAlign: "center" }}>
                  <button onClick={() => setCompareSkill(s)} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #d5d0c0", cursor: "pointer", fontSize: 9, background: "#eaf2f8", color: "#2471a3", fontWeight: 700 }}>⇔</button>
                </td>
                <td style={{ ...TS.td(false), textAlign: "center" }}>
                  <button onClick={() => setExpanded(p => ({ ...p, [s.id]: !p[s.id] }))} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #d5d0c0", cursor: "pointer", fontSize: 10, fontWeight: 700, background: hasDetail ? "#fef3cd" : isExp ? "#eee" : "#fff", color: hasDetail ? "#b8860b" : "#999" }}>{hasDetail ? `${conds.length + comms.length}` : isExp ? "▲" : "▼"}</button>
                </td>
                <td style={{ ...TS.td(false), textAlign: "center" }}><SaveBtn active={dirty} saving={saving[s.id]} onClick={() => doSave(s.id)} /></td>
              </tr>,
              isExp && <DetailRow key={`${s.id}_d`} colSpan={SKILL_COLS.length + 4}
                conditions={conds} comments={comms}
                onAddCondition={c => addCondition(s.id, c)} onAddComment={t => addComment(s.id, t)}
                onUpdateConditions={arr => updateConditions(s.id, arr)} onUpdateComments={arr => updateComments(s.id, arr)} />,
            ];
          })}
        </tbody></table>
      </div>
      {modalSkill && (
        <SkillInputModal
          skill={modalSkill}
          cols={SKILL_COLS}
          getVal={(key) => getVal(modalSkill.id, key)}
          onEdit={(key, val) => edit(modalSkill.id, key, val)}
          onClose={() => {
            setModalSkill(null);
            if (seqMode) setSeqMode(false);
          }}
          onNext={seqMode ? () => {
            if (isDirty(modalSkill.id)) doSave(modalSkill.id);
            seqNext();
          } : null}
          seqMode={seqMode}
          seqCurrent={seqIdx + 1}
          seqTotal={list.length}
        />
      )}
      {compareSkill && <JobCompareModal skill={compareSkill} onClose={() => setCompareSkill(null)} />}
      {showCopy && <RoleCopyModal jobId={jobId} sData={sData} onClose={() => setShowCopy(false)} onDone={(count) => { setShowCopy(false); flash(`✓ ${count}件コピー完了`); }} />}
      <Toast msg={toast} />
    </div>
  );
}
