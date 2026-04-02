import { useState, useMemo, useCallback, useRef, useEffect } from "react";

export function useEditable(savedData) {
  const [edits, setEdits] = useState({});
  const savedRef = useRef(savedData);
  useEffect(() => { savedRef.current = savedData; }, [savedData]);

  const edit = useCallback((id, col, newVal) => {
    const orig = savedRef.current?.[id]?.[col] ?? null;
    setEdits(prev => {
      const next = { ...prev };
      const key = `${id}::${col}`;
      const same = newVal === orig
        || (newVal == null && orig == null)
        || (newVal === 0 && (orig === 0 || orig == null))
        || (newVal === "" && (orig === "" || orig == null));
      if (same) {
        delete next[key];
      } else {
        next[key] = newVal;
      }
      return next;
    });
  }, []);

  const getVal = useCallback((id, col) => {
    const key = `${id}::${col}`;
    if (key in edits) return edits[key];
    return savedRef.current?.[id]?.[col] ?? null;
  }, [edits]);

  const isDirty = useCallback((id) => {
    const prefix = `${id}::`;
    return Object.keys(edits).some(k => k.startsWith(prefix));
  }, [edits]);

  const dirtyIds = useMemo(() => {
    const s = new Set();
    Object.keys(edits).forEach(k => { s.add(k.split("::")[0]); });
    return s;
  }, [edits]);

  const clearEdits = useCallback((id) => {
    if (id != null) {
      const prefix = `${id}::`;
      setEdits(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (k.startsWith(prefix)) delete next[k]; });
        return next;
      });
    } else {
      setEdits({});
    }
  }, []);

  const getEditsFor = useCallback((id) => {
    const prefix = `${id}::`;
    const result = {};
    Object.keys(edits).forEach(k => {
      if (k.startsWith(prefix)) { result[k.split("::")[1]] = edits[k]; }
    });
    return result;
  }, [edits]);

  return { edit, getVal, isDirty, dirtyIds, clearEdits, getEditsFor, edits };
}
