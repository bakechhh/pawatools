import { useState, useEffect } from "react";
import { GET, INSERT, UPSERT } from "../supabase.js";
import { JOBS, JC, EL } from "../constants.js";
import { Pill, Badge, Toast } from "../components/UI.jsx";

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || "";
const HD = { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };
const SB = import.meta.env.VITE_SUPABASE_URL;

async function DEL(table, id) {
  try { const r = await fetch(`${SB}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: HD }); return r.ok; } catch { return false; }
}
async function PATCH(table, id, data) {
  try { const r = await fetch(`${SB}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...HD, Prefer: "return=representation" }, body: JSON.stringify(data) }); return r.ok ? r.json() : null; } catch { return null; }
}

const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d5d0c0", fontSize: 13, background: "#fff", color: "#333", boxSizing: "border-box" };
const selectStyle = { ...inputStyle, appearance: "auto" };
const labelStyle = { fontSize: 11, fontWeight: 700, color: "#5a4010", marginBottom: 3, display: "block" };
const btnStyle = (a) => ({ padding: "10px 24px", borderRadius: 8, border: "none", cursor: a ? "pointer" : "default", background: a ? "linear-gradient(180deg,#f0dca0,#c8a020)" : "#e0e0d8", color: a ? "#5a4010" : "#bbb", fontSize: 14, fontWeight: 700, width: "100%" });

function EditableItem({ item, fields, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState({});

  function startEdit() { setEditing(true); const v = {}; fields.forEach(f => { v[f.key] = item[f.key] ?? ""; }); setVals(v); }

  return editing ? (
    <div style={{ padding: "6px 8px", background: "#fffde8", borderBottom: "1px solid #eee", borderRadius: 4, marginBottom: 2 }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
        {fields.map(f => (
          <div key={f.key} style={{ flex: f.flex || 1, minWidth: 80 }}>
            <label style={{ fontSize: 9, color: "#888" }}>{f.label}</label>
            {f.type === "select" ? (
              <select value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }}>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button onClick={() => setEditing(false)} style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: 11, cursor: "pointer" }}>キャンセル</button>
        <button onClick={() => { onSave(vals); setEditing(false); }} style={{ padding: "3px 10px", borderRadius: 4, border: "none", background: "#27ae60", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>保存</button>
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", padding: "4px 8px", borderBottom: "1px solid #eee", gap: 4 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        {item._display}
      </div>
      <button onClick={startEdit} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, border: "1px solid #ddd", background: "#fff", color: "#888", cursor: "pointer" }}>編集</button>
      <button onClick={() => { if (confirm(`「${item.name}」を削除しますか？`)) onDelete(); }} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, border: "1px solid #c0392b44", background: "#fff", color: "#c0392b", cursor: "pointer" }}>削除</button>
    </div>
  );
}

export default function AdminTab() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);
  const [passErr, setPassErr] = useState(false);
  const [mode, setMode] = useState("skill");
  const [cats, setCats] = useState([]);
  const [toast, setToast] = useState("");

  const [skName, setSkName] = useState(""); const [skGrade, setSkGrade] = useState(""); const [skCatId, setSkCatId] = useState(""); const [skNote, setSkNote] = useState("");
  const [gsName, setGsName] = useState(""); const [gsSource, setGsSource] = useState("event_chara"); const [gsNote, setGsNote] = useState("");
  const [smName, setSmName] = useState(""); const [smJobId, setSmJobId] = useState(""); const [smElement, setSmElement] = useState(""); const [smSource, setSmSource] = useState(""); const [smNote, setSmNote] = useState("");

  const [existingSkills, setExistingSkills] = useState([]);
  const [existingGold, setExistingGold] = useState([]);
  const [existingSpecial, setExistingSpecial] = useState([]);

  useEffect(() => { GET("skill_categories", "order=sort_order").then(setCats); }, []);
  useEffect(() => { if (authed) loadExisting(); }, [authed, mode]);

  async function loadExisting() {
    if (mode === "skill") setExistingSkills(await GET("skills", "order=category_id,name"));
    else if (mode === "gold") setExistingGold(await GET("gold_skills", "order=name"));
    else setExistingSpecial(await GET("special_moves", "order=job_id,name"));
  }

  function tryAuth() {
    if (!ADMIN_PASS) { flash("管理パスワードが未設定"); return; }
    if (pass === ADMIN_PASS) { setAuthed(true); setPassErr(false); } else { setPassErr(true); flash("パスワードが違います"); }
  }
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2500); }

  async function addSkill() { if (!skName.trim() || !skCatId) { flash("名前とカテゴリは必須"); return; } const res = await INSERT("skills", { name: skName.trim(), grade: skGrade || null, category_id: Number(skCatId), notes: skNote || null }); if (res?.length) { flash(`✓「${skName}」追加`); setSkName(""); setSkGrade(""); setSkNote(""); loadExisting(); } else flash("追加失敗"); }
  async function addGold() { if (!gsName.trim()) { flash("名前は必須"); return; } const res = await INSERT("gold_skills", { name: gsName.trim(), obtain_source: gsSource || null, notes: gsNote || null }); if (res?.length) { flash(`✓「${gsName}」追加`); setGsName(""); setGsNote(""); loadExisting(); } else flash("追加失敗"); }
  async function addSpecial() { if (!smName.trim() || !smJobId) { flash("名前とジョブは必須"); return; } const res = await INSERT("special_moves", { name: smName.trim(), job_id: Number(smJobId), element: smElement || null, obtain_source: smSource || null, notes: smNote || null }); if (res?.length) { flash(`✓「${smName}」追加`); setSmName(""); setSmElement(""); setSmSource(""); setSmNote(""); loadExisting(); } else flash("追加失敗"); }

  if (!authed) return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#5a4010", marginBottom: 16 }}>🔒 管理者ログイン</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>マスターデータの管理には管理パスワードが必要です</div>
      <div style={{ maxWidth: 280, margin: "0 auto" }}>
        <input type="password" value={pass} onChange={e => { setPass(e.target.value); setPassErr(false); }} onKeyDown={e => { if (e.key === "Enter") tryAuth(); }} placeholder="管理パスワード"
          style={{ ...inputStyle, textAlign: "center", fontSize: 16, marginBottom: 12, border: passErr ? "2px solid #c0392b" : "1px solid #d5d0c0" }} />
        <button onClick={tryAuth} style={btnStyle(!!pass.trim())}>ログイン</button>
      </div>
      <Toast msg={toast} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#5a4010" }}>🔓 マスターデータ管理</div>
        <button onClick={() => setAuthed(false)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, border: "1px solid #d5d0c0", background: "#faf8f2", color: "#888", cursor: "pointer" }}>ログアウト</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <Pill active={mode === "skill"} onClick={() => setMode("skill")}>スキル</Pill>
        <Pill active={mode === "gold"} onClick={() => setMode("gold")}>金特</Pill>
        <Pill active={mode === "special"} onClick={() => setMode("special")}>必殺技</Pill>
      </div>

      {/* スキル */}
      {mode === "skill" && (
        <div style={{ background: "#faf8f2", borderRadius: 8, padding: 14, border: "1px solid #e0d8c0", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5a4010", marginBottom: 10 }}>スキル追加</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div><label style={labelStyle}>スキル名 *</label><input value={skName} onChange={e => setSkName(e.target.value)} placeholder="例: 物理攻撃" style={inputStyle} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>等級</label><select value={skGrade} onChange={e => setSkGrade(e.target.value)} style={selectStyle}><option value="">なし</option><option value="○">○</option><option value="◎">◎</option></select></div>
              <div style={{ flex: 2 }}><label style={labelStyle}>カテゴリ *</label><select value={skCatId} onChange={e => setSkCatId(e.target.value)} style={selectStyle}><option value="">選択...</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div><label style={labelStyle}>メモ</label><input value={skNote} onChange={e => setSkNote(e.target.value)} placeholder="任意メモ" style={inputStyle} /></div>
            <button onClick={addSkill} style={btnStyle(skName.trim() && skCatId)}>追加</button>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#888", fontWeight: 700 }}>登録済み ({existingSkills.length}件)</div>
          <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
            {existingSkills.map(s => (
              <EditableItem key={s.id} item={{ ...s, _display: <><span style={{ fontWeight: 600 }}>{s.name}{s.grade || ""}</span><span style={{ fontSize: 10, color: "#aaa", marginLeft: 4 }}>{cats.find(c => c.id === s.category_id)?.name}</span></> }}
                fields={[
                  { key: "name", label: "名前", flex: 2 },
                  { key: "grade", label: "等級", type: "select", options: [{ value: "", label: "なし" }, { value: "○", label: "○" }, { value: "◎", label: "◎" }] },
                  { key: "category_id", label: "カテゴリ", type: "select", options: cats.map(c => ({ value: String(c.id), label: c.name })) },
                  { key: "notes", label: "メモ" },
                ]}
                onSave={async (vals) => { const r = await PATCH("skills", s.id, { ...vals, category_id: Number(vals.category_id), grade: vals.grade || null, notes: vals.notes || null }); if (r) { flash("✓ 更新"); loadExisting(); } else flash("更新失敗"); }}
                onDelete={async () => { if (await DEL("skills", s.id)) { flash("✓ 削除"); loadExisting(); } else flash("削除失敗"); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 金特 */}
      {mode === "gold" && (
        <div style={{ background: "#faf8f2", borderRadius: 8, padding: 14, border: "1px solid #e0d8c0", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#b8860b", marginBottom: 10 }}>金特追加</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div><label style={labelStyle}>金特名 *</label><input value={gsName} onChange={e => setGsName(e.target.value)} placeholder="例: 怪力" style={inputStyle} /></div>
            <div><label style={labelStyle}>入手元</label><select value={gsSource} onChange={e => setGsSource(e.target.value)} style={selectStyle}><option value="event_chara">イベキャラ</option><option value="scenario">シナリオ</option><option value="both">両方</option></select></div>
            <div><label style={labelStyle}>メモ</label><input value={gsNote} onChange={e => setGsNote(e.target.value)} placeholder="例: 共通" style={inputStyle} /></div>
            <button onClick={addGold} style={btnStyle(!!gsName.trim())}>追加</button>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#888", fontWeight: 700 }}>登録済み ({existingGold.length}件)</div>
          <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
            {existingGold.map(g => (
              <EditableItem key={g.id} item={{ ...g, _display: <><span style={{ color: "#b8860b", fontWeight: 600 }}>★ {g.name}</span>{g.obtain_source && <Badge color={g.obtain_source === "scenario" ? "#c0392b" : "#2471a3"}>{g.obtain_source === "scenario" ? "シナリオ" : "イベキャラ"}</Badge>}{g.notes && <span style={{ fontSize: 10, color: "#aaa" }}>{g.notes}</span>}</> }}
                fields={[
                  { key: "name", label: "名前", flex: 2 },
                  { key: "obtain_source", label: "入手元", type: "select", options: [{ value: "event_chara", label: "イベキャラ" }, { value: "scenario", label: "シナリオ" }, { value: "both", label: "両方" }] },
                  { key: "notes", label: "メモ" },
                ]}
                onSave={async (vals) => { const r = await PATCH("gold_skills", g.id, { ...vals, notes: vals.notes || null }); if (r) { flash("✓ 更新"); loadExisting(); } else flash("更新失敗"); }}
                onDelete={async () => { if (await DEL("gold_skills", g.id)) { flash("✓ 削除"); loadExisting(); } else flash("削除失敗"); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 必殺技 */}
      {mode === "special" && (
        <div style={{ background: "#faf8f2", borderRadius: 8, padding: 14, border: "1px solid #e0d8c0", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5a4010", marginBottom: 10 }}>必殺技追加</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div><label style={labelStyle}>必殺技名 *</label><input value={smName} onChange={e => setSmName(e.target.value)} placeholder="例: 火連斬" style={inputStyle} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>ジョブ *</label><select value={smJobId} onChange={e => setSmJobId(e.target.value)} style={selectStyle}><option value="">選択...</option>{JOBS.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>属性</label><select value={smElement} onChange={e => setSmElement(e.target.value)} style={selectStyle}><option value="">なし</option><option value="火">火</option><option value="風">風</option><option value="水">水</option></select></div>
            </div>
            <div><label style={labelStyle}>入手元</label><select value={smSource} onChange={e => setSmSource(e.target.value)} style={selectStyle}><option value="">不明</option><option value="scenario">シナリオ</option><option value="event_chara">イベキャラ</option></select></div>
            <div><label style={labelStyle}>メモ</label><input value={smNote} onChange={e => setSmNote(e.target.value)} placeholder="例: 初級" style={inputStyle} /></div>
            <button onClick={addSpecial} style={btnStyle(smName.trim() && smJobId)}>追加</button>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#888", fontWeight: 700 }}>登録済み ({existingSpecial.length}件)</div>
          <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 4 }}>
            {existingSpecial.map(s => {
              const jb = JOBS.find(j => j.id === s.job_id);
              return (
                <EditableItem key={s.id} item={{ ...s, _display: <><span style={{ fontWeight: 600 }}>{s.name}</span>{jb && <Badge color={JC[jb.name]}>{jb.name}</Badge>}{s.element && <Badge color={EL[s.element]}>{s.element}</Badge>}</> }}
                  fields={[
                    { key: "name", label: "名前", flex: 2 },
                    { key: "job_id", label: "ジョブ", type: "select", options: JOBS.map(j => ({ value: String(j.id), label: j.name })) },
                    { key: "element", label: "属性", type: "select", options: [{ value: "", label: "なし" }, { value: "火", label: "火" }, { value: "風", label: "風" }, { value: "水", label: "水" }] },
                    { key: "notes", label: "メモ" },
                  ]}
                  onSave={async (vals) => { const r = await PATCH("special_moves", s.id, { ...vals, job_id: Number(vals.job_id), element: vals.element || null, notes: vals.notes || null }); if (r) { flash("✓ 更新"); loadExisting(); } else flash("更新失敗"); }}
                  onDelete={async () => { if (await DEL("special_moves", s.id)) { flash("✓ 削除"); loadExisting(); } else flash("削除失敗"); }}
                />
              );
            })}
          </div>
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}
