import { useState, useMemo, useCallback, useEffect } from "react";

const DRAFT_PREFIX = "pawatools_draft_";

export function useEditable(savedData, scope = "") {
  // Load draft from localStorage on scope change
  const [edits, setEdits] = useState(() => {
    try { const d = localStorage.getItem(DRAFT_PREFIX + scope); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const [lastScope, setLastScope] = useState(scope);
  if (scope !== lastScope) {
    // Save current edits before switching
    if (Object.keys(edits).length > 0) {
      try { localStorage.setItem(DRAFT_PREFIX + lastScope, JSON.stringify(edits)); } catch {}
    }
    // Load new scope's draft
    let loaded = {};
    try { const d = localStorage.getItem(DRAFT_PREFIX + scope); if (d) loaded = JSON.parse(d); } catch {}
    setEdits(loaded);
    setLastScope(scope);
  }

  // Auto-save drafts to localStorage
  useEffect(() => {
    if (Object.keys(edits).length > 0) {
      try { localStorage.setItem(DRAFT_PREFIX + scope, JSON.stringify(edits)); } catch {}
    } else {
      try { localStorage.removeItem(DRAFT_PREFIX + scope); } catch {}
    }
  }, [edits, scope]);

  const edit = useCallback((id, col, newVal) => {
    setEdits(prev => {
      const next = { ...prev };
      const key = `${id}::${col}`;
      const orig = savedData?.[id]?.[col] ?? null;
      const same = newVal === orig
        || (newVal == null && orig == null)
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
      setEdits(prev => {
        const n = { ...prev }; Object.keys(n).forEach(k => { if (k.startsWith(p)) delete n[k]; });
        return n;
      });
    } else {
      setEdits({});
      try { localStorage.removeItem(DRAFT_PREFIX + scope); } catch {}
    }
  }, [scope]);

  const getEditsFor = useCallback((id) => {
    const p = `${id}::`;
    const r = {};
    Object.keys(edits).forEach(k => { if (k.startsWith(p)) r[k.split("::")[1]] = edits[k]; });
    return r;
  }, [edits]);

  return { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor, edits };
}
