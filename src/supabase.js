const SB = import.meta.env.VITE_SUPABASE_URL;
const AK = import.meta.env.VITE_SUPABASE_ANON_KEY;
const HD = { apikey: AK, Authorization: `Bearer ${AK}`, "Content-Type": "application/json" };

export async function GET(t, q = "") {
  try { const r = await fetch(`${SB}/rest/v1/${t}?${q}`, { headers: HD }); return r.ok ? r.json() : []; }
  catch { return []; }
}

export async function UPSERT(t, d) {
  try {
    const r = await fetch(`${SB}/rest/v1/${t}`, {
      method: "POST",
      headers: { ...HD, Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify(d),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

export async function INSERT(t, d) {
  try {
    const r = await fetch(`${SB}/rest/v1/${t}`, {
      method: "POST",
      headers: { ...HD, Prefer: "return=representation" },
      body: JSON.stringify(d),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

export async function saveHistory(tableName, recordId, oldData, newData, reason) {
  return INSERT("data_history", {
    table_name: tableName,
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
    change_reason: reason || null,
  });
}
