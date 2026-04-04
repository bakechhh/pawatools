import { useState, useRef, useCallback } from "react";
import { createWorker } from "tesseract.js";
import { Pill } from "./UI.jsx";

// ステータス行のY位置（画像高さに対する比率） - iPhone横画面スクショ基準
const STAT_ROWS = [
  { key: "hp", label: "生命力", yRatio: 0.48 },
  { key: "power", label: "パワー", yRatio: 0.575 },
  { key: "magic", label: "魔力", yRatio: 0.67 },
  { key: "dex", label: "器用さ", yRatio: 0.765 },
  { key: "endurance", label: "耐久力", yRatio: 0.86 },
  // 精神力はスクロールしないと見えないかも
];

// 経験点5列のX位置（画像幅に対する比率）
const EXP_COLS_X = [
  { key: "exp_kinryoku", xStart: 0.565, xEnd: 0.615 },  // 筋力
  { key: "exp_binsoku", xStart: 0.625, xEnd: 0.675 },   // 敏捷
  { key: "exp_gijutsu", xStart: 0.685, xEnd: 0.735 },   // 技術
  { key: "exp_chiryoku", xStart: 0.745, xEnd: 0.795 },   // 知力
  { key: "exp_seishin", xStart: 0.805, xEnd: 0.855 },    // 精神
];

// 査定値の位置（左上のスコア）
const SCORE_REGION = { xStart: 0.065, xEnd: 0.14, yStart: 0.03, yEnd: 0.1 };

// ステータス値（左側パネル、各ステータス下の数値）
const STAT_VALUE_REGIONS = [
  { key: "hp", xStart: 0.04, xEnd: 0.1, yStart: 0.48, yEnd: 0.56 },
  { key: "power", xStart: 0.1, xEnd: 0.16, yStart: 0.48, yEnd: 0.56 },
];

function cropCanvas(img, xStart, yStart, xEnd, yEnd) {
  const c = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const x1 = Math.floor(w * xStart), y1 = Math.floor(h * yStart);
  const cw = Math.floor(w * (xEnd - xStart)), ch = Math.floor(h * (yEnd - yStart));
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d");
  // 高コントラスト化（OCR精度向上）
  ctx.drawImage(img, x1, y1, cw, ch, 0, 0, cw, ch);
  const imageData = ctx.getImageData(0, 0, cw, ch);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
    const bw = gray < 140 ? 0 : 255;
    d[i] = d[i+1] = d[i+2] = bw;
  }
  ctx.putImageData(imageData, 0, 0);
  return c;
}

async function ocrRegion(worker, img, xStart, yStart, xEnd, yEnd) {
  const canvas = cropCanvas(img, xStart, yStart, xEnd, yEnd);
  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
  const { data } = await worker.recognize(blob);
  return data.text.trim();
}

function extractNumber(text) {
  const cleaned = text.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  return parseInt(cleaned, 10);
}

export default function ScreenshotOCR({ statKey, onResult, onClose }) {
  const [img1, setImg1] = useState(null); // before screenshot
  const [img2, setImg2] = useState(null); // after screenshot
  const [preview1, setPreview1] = useState(null);
  const [preview2, setPreview2] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [manualEdit, setManualEdit] = useState({});
  const img1Ref = useRef(null);
  const img2Ref = useRef(null);

  const statRow = STAT_ROWS.find(r => r.key === statKey);
  const rowHeight = 0.07; // 各行の高さ比率

  function handleFile(file, setImg, setPreview, ref) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    const image = new Image();
    image.onload = () => { if (ref === img1Ref) setImg1(image); else setImg2(image); };
    image.src = url;
  }

  const doOCR = useCallback(async () => {
    if (!img1Ref.current && !img1) { return; }
    const imgBefore = img1;
    const imgAfter = img2;
    if (!imgBefore) return;

    setProcessing(true);
    setProgress("OCRエンジン起動中...");

    try {
      const worker = await createWorker("eng", 1, {
        logger: m => { if (m.status === "recognizing text") setProgress(`認識中... ${Math.round((m.progress || 0) * 100)}%`); },
      });

      // 1. 査定値を読み取り（before）
      setProgress("査定値を読み取り中（取得前）...");
      const scoreText1 = await ocrRegion(worker, imgBefore, SCORE_REGION.xStart, SCORE_REGION.yStart, SCORE_REGION.xEnd, SCORE_REGION.yEnd);
      const score1 = extractNumber(scoreText1);

      // 2. 査定値を読み取り（after）
      let score2 = null;
      if (imgAfter) {
        setProgress("査定値を読み取り中（取得後）...");
        const scoreText2 = await ocrRegion(worker, imgAfter, SCORE_REGION.xStart, SCORE_REGION.yStart, SCORE_REGION.xEnd, SCORE_REGION.yEnd);
        score2 = extractNumber(scoreText2);
      }

      // 3. 経験点を読み取り（beforeの該当行）
      if (!statRow) { setProgress("ステータス行が見つかりません"); setProcessing(false); return; }

      setProgress(`${statRow.label}の経験点を読み取り中...`);
      const yStart = statRow.yRatio - rowHeight / 2;
      const yEnd = statRow.yRatio + rowHeight / 2;

      const expValues = {};
      for (const col of EXP_COLS_X) {
        const text = await ocrRegion(worker, imgBefore, col.xStart, yStart, col.xEnd, yEnd);
        expValues[col.key] = extractNumber(text);
      }

      // 4. ステータス値を読み取り（左側パネルから現在の数値）
      // 左側パネルの数値位置はステータスによって異なるので、全体的にOCR
      // 簡略化：ユーザーに手動確認させる

      await worker.terminate();

      const r = {
        score1, score2,
        satei_delta: (score1 != null && score2 != null) ? score2 - score1 : null,
        ...expValues,
      };
      setResult(r);
      setManualEdit(r);
      setProgress("完了");
    } catch (e) {
      setProgress(`エラー: ${e.message}`);
    }
    setProcessing(false);
  }, [img1, img2, statRow]);

  function handleApply() {
    onResult(manualEdit);
    onClose();
  }

  const fileInputStyle = {
    width: "100%", padding: "12px", borderRadius: 8, border: "2px dashed #d5c89c",
    background: "#fdf8e8", textAlign: "center", cursor: "pointer", fontSize: 12, color: "#8b7340",
  };

  const numEdit = (key, label, color) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36 }}>{label}</span>
      <input type="text" inputMode="numeric"
        value={manualEdit[key] != null ? String(manualEdit[key]) : ""}
        onChange={e => {
          const v = e.target.value;
          setManualEdit(p => ({ ...p, [key]: v === "" ? null : parseInt(v, 10) || 0 }));
        }}
        style={{
          flex: 1, height: 36, textAlign: "center", fontSize: 16, fontWeight: 700,
          border: `2px solid ${color}`, borderRadius: 6, color, background: "#fff",
        }}
      />
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto",
        background: "#faf8f2", borderRadius: "16px 16px 0 0", padding: "16px 16px 24px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#5a4010" }}>スクショ読み取り</div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 16, border: "none",
            background: "#e0d8c0", color: "#666", fontSize: 18, cursor: "pointer", lineHeight: "32px",
          }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
          {statRow?.label || "ステータス"}の能力アップ画面のスクショ2枚（+ボタン押す前と後）をアップロードしてください。
          査定値の差分と経験点コストを自動で読み取ります。
        </div>

        {/* 画像アップロード */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 4, textAlign: "center" }}>取得前</div>
            <label style={fileInputStyle}>
              {preview1 ? <img src={preview1} style={{ width: "100%", borderRadius: 6 }} alt="" /> : "タップして画像選択"}
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0], setImg1, setPreview1, img1Ref)} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 4, textAlign: "center" }}>取得後</div>
            <label style={fileInputStyle}>
              {preview2 ? <img src={preview2} style={{ width: "100%", borderRadius: 6 }} alt="" /> : "タップして画像選択"}
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0], setImg2, setPreview2, img2Ref)} />
            </label>
          </div>
        </div>

        {/* OCR実行 */}
        <button onClick={doOCR} disabled={!img1 || processing} style={{
          width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
          background: img1 && !processing ? "#b8860b" : "#ddd",
          color: img1 && !processing ? "#fff" : "#999",
          fontSize: 14, fontWeight: 700, cursor: img1 && !processing ? "pointer" : "default",
          marginBottom: 8,
        }}>
          {processing ? progress : "読み取り開始"}
        </button>

        {/* 結果表示・修正 */}
        {result && (
          <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #d5c89c" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#5a4010", marginBottom: 8 }}>
              読み取り結果（修正可能）
            </div>

            {/* ステータス値入力 */}
            <div style={{ background: "#fdf8e8", borderRadius: 6, padding: "8px 10px", marginBottom: 10, border: "1px solid #d5c89c" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#5a4010", marginBottom: 4 }}>
                {statRow?.label || "ステータス"}の値（何から上がった？）
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" inputMode="numeric"
                  value={manualEdit.statValue != null ? String(manualEdit.statValue) : ""}
                  onChange={e => setManualEdit(p => ({ ...p, statValue: e.target.value === "" ? null : parseInt(e.target.value, 10) || 0 }))}
                  placeholder="例: 40"
                  style={{ width: 80, height: 40, textAlign: "center", fontSize: 20, fontWeight: 700, border: "2px solid #c8a020", borderRadius: 8, color: "#5a4010", background: "#fff" }}
                />
                <span style={{ fontSize: 12, color: "#888" }}>に上がった時の経験点コスト</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>査定（前）</div>
                <input type="text" inputMode="numeric"
                  value={manualEdit.score1 != null ? String(manualEdit.score1) : ""}
                  onChange={e => setManualEdit(p => ({ ...p, score1: parseInt(e.target.value, 10) || null, satei_delta: p.score2 != null && parseInt(e.target.value, 10) ? p.score2 - parseInt(e.target.value, 10) : p.satei_delta }))}
                  style={{ width: "100%", height: 36, textAlign: "center", fontSize: 16, fontWeight: 700, border: "2px solid #999", borderRadius: 6, color: "#333", background: "#fff" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>査定（後）</div>
                <input type="text" inputMode="numeric"
                  value={manualEdit.score2 != null ? String(manualEdit.score2) : ""}
                  onChange={e => setManualEdit(p => ({ ...p, score2: parseInt(e.target.value, 10) || null, satei_delta: parseInt(e.target.value, 10) && p.score1 != null ? parseInt(e.target.value, 10) - p.score1 : p.satei_delta }))}
                  style={{ width: "100%", height: 36, textAlign: "center", fontSize: 16, fontWeight: 700, border: "2px solid #999", borderRadius: 6, color: "#333", background: "#fff" }}
                />
              </div>
              <div style={{ width: 70, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>差分</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: manualEdit.satei_delta > 0 ? "#b8860b" : "#999", lineHeight: "36px" }}>
                  {manualEdit.satei_delta != null ? (manualEdit.satei_delta > 0 ? `+${manualEdit.satei_delta}` : manualEdit.satei_delta) : "-"}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>経験点コスト</div>
            {numEdit("exp_kinryoku", "筋力", "#c0392b")}
            {numEdit("exp_binsoku", "敏捷", "#2471a3")}
            {numEdit("exp_gijutsu", "技術", "#d4880f")}
            {numEdit("exp_chiryoku", "知力", "#7d3c98")}
            {numEdit("exp_seishin", "精神", "#1e8449")}

            <button onClick={handleApply} style={{
              width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 10, border: "none",
              background: "linear-gradient(180deg,#f0dca0,#c8a020)", color: "#5a4010",
              fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>反映する</button>
          </div>
        )}
      </div>
    </div>
  );
}
