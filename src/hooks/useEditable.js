import { useState, useMemo, useCallback } from "react";

/**
 * @param {object} savedData - { [id]: { col: val, ... }, ... }
 * @param {string} scope - 切り替えごとにリセットするためのスコープキー（例: "1_hp"）
 */
export function useEditable(savedData, scope = "") {
  const [edits, setEdits] = useState({});
  const [lastScope, setLastScope] = useState(scope);

  // スコープが変わったらeditsを自動クリア
  if (scope !== lastScope) {
    setEdits({});
    setLastScope(scope);
  }

  const edit = useCallback((id, col, newVal) => {
    setEdits(prev => {
      const next = { ...prev };
      const key = `${id}::${col}`;
      // savedDataから現在の元値を直接取得
      const orig = savedData?.[id]?.[col] ?? null;
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
  }, [savedData]);

  const getVal = useCallback((id, col) => {
    const key = `${id}::${col}`;
    if (key in edits) return edits[key];
    return savedData?.[id]?.[col] ?? null;
  }, [edits, savedData]);

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
