import { UPSERT, saveHistory } from "../supabase.js";

/**
 * 行を保存する共通処理
 * @param {string} table - テーブル名
 * @param {object} existing - 既存のDB上のデータ（なければ{}）
 * @param {object} payload - 保存するデータ
 * @returns {object|null} 保存結果
 */
export async function saveRow(table, existing, payload) {
  // 既存データがある場合は履歴に保存
  if (existing?.id) {
    await saveHistory(table, existing.id, existing, payload);
    payload.id = existing.id;
  }
  return UPSERT(table, payload);
}
