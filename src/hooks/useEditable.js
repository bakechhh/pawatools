import { useState, useMemo, useCallback } from "react";

export function useEditable(savedData, scope = "") {
  const [edits, setEdits] = useState({});
  const [lastScope, setLastScope] = useState(scope);
  if (scope !== lastScope) { setEdits({}); setLastScope(scope); }

  const edit = useCallback((id, col, newVal) => {
    setEdits(prev => {
      const next = { ...prev };
      const key = `${id}::${col}`;
      const orig = savedData?.[id]?.[col] ?? null;
      const same = newVal === orig
        || (newVal == null && orig == null)
        || (newVal === 0 && (orig === 0 || orig == null))
        || (newVal === "" && (orig === "" || orig == null));
      if (same) { delete next[key]; } else { next[key] = newVal; }
      return next;
    });
  }, [savedData]);

  const getVal = useCallback((id, col) => {
    const key = `${id}::${col}`;
    if (key in edits) return edits[key];
    return savedData?.[id]?.[col] ?? null;
  }, [edits, savedData]);

  const isDirty = useCallback((id) => {
    const p = `${id}::`;
    return Object.keys(edits).some(k => k.startsWith(p));
  }, [edits]);

  const dirtyIds = useMemo(() => {
    const s = new Set();
    Object.keys(edits).forEach(k => s.add(k.split("::")[0]));
    return s;
  }, [edits]);

  const clearEdits = useCallback((id) => {
    if (id != null) {
      const p = `${id}::`;
      setEdits(prev => { const n = { ...prev }; Object.keys(n).forEach(k => { if (k.startsWith(p)) delete n[k]; }); return n; });
    } else { setEdits({}); }
  }, []);

  const getEditsFor = useCallback((id) => {
    const p = `${id}::`;
    const r = {};
    Object.keys(edits).forEach(k => { if (k.startsWith(p)) r[k.split("::")[1]] = edits[k]; });
    return r;
  }, [edits]);

  return { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor, edits };
}
