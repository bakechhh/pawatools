"""
パワアド OCR キャリブレーションツール
=====================================
スクショ上でドラッグして各数値の読み取り領域を指定。
設定は ocr_regions.json に保存され、ocr_video.py が自動で使用。

使い方:
  python ocr_calibrate.py screenshot.jpg
"""

import sys
import json
from pathlib import Path
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk, ImageDraw

CONFIG_PATH = Path(__file__).parent / "ocr_regions.json"

# 定義する領域のリスト
REGIONS = [
    ("score", "査定スコア", "#e74c3c"),
    ("exp_kinryoku", "筋力コスト", "#c0392b"),
    ("exp_binsoku", "敏捷コスト", "#2471a3"),
    ("exp_gijutsu", "技術コスト", "#d4880f"),
    ("exp_chiryoku", "知力コスト", "#7d3c98"),
    ("exp_seishin", "精神コスト", "#1e8449"),
]

# オプション: 複数行分を一括定義したい場合
MULTI_ROW_REGIONS = [
    ("row_hp", "生命力の行全体 (5列)", "#ff6b6b"),
    ("row_power", "パワーの行全体 (5列)", "#ffa502"),
    ("row_magic", "魔力の行全体 (5列)", "#a29bfe"),
    ("row_dex", "器用さの行全体 (5列)", "#55efc4"),
    ("row_endurance", "耐久力の行全体 (5列)", "#81ecec"),
]


class CalibrationApp:
    def __init__(self, image_path):
        self.root = tk.Tk()
        self.root.title("パワアド OCR キャリブレーション")

        # 画像読み込み
        self.orig_image = Image.open(image_path)
        self.img_w, self.img_h = self.orig_image.size

        # 画面に収まるようにスケール
        screen_w = self.root.winfo_screenwidth() - 100
        screen_h = self.root.winfo_screenheight() - 200
        self.scale = min(screen_w / self.img_w, screen_h / self.img_h, 1.0)
        self.disp_w = int(self.img_w * self.scale)
        self.disp_h = int(self.img_h * self.scale)

        self.display_image = self.orig_image.resize((self.disp_w, self.disp_h), Image.LANCZOS)

        # モード: "single" (1セルずつ) or "row" (行全体)
        self.mode = "single"
        self.all_regions = REGIONS.copy()
        self.current_idx = 0
        self.regions_data = {}  # key -> (x1, y1, x2, y2) in original image coords

        # 既存設定があれば読み込み
        if CONFIG_PATH.exists():
            try:
                with open(CONFIG_PATH) as f:
                    self.regions_data = json.load(f)
            except:
                pass

        # ドラッグ状態
        self.drag_start = None
        self.drag_rect_id = None

        self._build_ui()

    def _build_ui(self):
        # 上部フレーム: モード切替 + 指示
        top = tk.Frame(self.root, bg="#3d3528")
        top.pack(fill=tk.X)

        tk.Label(top, text="パワアド OCR キャリブレーション", font=("", 14, "bold"),
                 fg="#f0d880", bg="#3d3528").pack(side=tk.LEFT, padx=10, pady=5)

        # モード切替
        mode_frame = tk.Frame(top, bg="#3d3528")
        mode_frame.pack(side=tk.RIGHT, padx=10)

        self.mode_var = tk.StringVar(value="single")
        tk.Radiobutton(mode_frame, text="1セルずつ", variable=self.mode_var, value="single",
                       command=self._switch_mode, bg="#3d3528", fg="#f0d880",
                       selectcolor="#5a4010", activebackground="#3d3528").pack(side=tk.LEFT)
        tk.Radiobutton(mode_frame, text="行全体", variable=self.mode_var, value="row",
                       command=self._switch_mode, bg="#3d3528", fg="#f0d880",
                       selectcolor="#5a4010", activebackground="#3d3528").pack(side=tk.LEFT)

        # 指示ラベル
        self.instruction = tk.Label(self.root, text="", font=("", 12, "bold"),
                                     fg="#5a4010", bg="#fdf8e8", pady=8)
        self.instruction.pack(fill=tk.X)

        # キャンバス
        canvas_frame = tk.Frame(self.root)
        canvas_frame.pack(fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(canvas_frame, width=self.disp_w, height=self.disp_h,
                                cursor="crosshair")
        self.canvas.pack()

        self.tk_image = ImageTk.PhotoImage(self.display_image)
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)

        # マウスイベント
        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)

        # 下部ボタン
        bottom = tk.Frame(self.root, bg="#faf8f2")
        bottom.pack(fill=tk.X, pady=5)

        tk.Button(bottom, text="← やり直し", command=self._undo,
                  font=("", 10), padx=10).pack(side=tk.LEFT, padx=5)
        tk.Button(bottom, text="スキップ →", command=self._skip,
                  font=("", 10), padx=10).pack(side=tk.LEFT, padx=5)
        tk.Button(bottom, text="テスト OCR", command=self._test_ocr,
                  font=("", 10, "bold"), bg="#2471a3", fg="white", padx=15).pack(side=tk.LEFT, padx=5)
        tk.Button(bottom, text="保存して終了", command=self._save_and_quit,
                  font=("", 11, "bold"), bg="#27ae60", fg="white", padx=20).pack(side=tk.RIGHT, padx=10)

        # ステータスバー
        self.status = tk.Label(self.root, text="", font=("", 9), fg="#888", bg="#faf8f2", anchor=tk.W)
        self.status.pack(fill=tk.X, padx=10)

        self._update_instruction()
        self._draw_existing_regions()

    def _switch_mode(self):
        self.mode = self.mode_var.get()
        if self.mode == "single":
            self.all_regions = REGIONS.copy()
        else:
            self.all_regions = MULTI_ROW_REGIONS.copy()
        self.current_idx = 0
        self._update_instruction()

    def _update_instruction(self):
        if self.current_idx >= len(self.all_regions):
            self.instruction.config(text="全ての領域を指定しました。「保存して終了」を押してください。",
                                     fg="#27ae60")
        else:
            key, label, color = self.all_regions[self.current_idx]
            existing = "✓" if key in self.regions_data else ""
            self.instruction.config(
                text=f"({self.current_idx+1}/{len(self.all_regions)}) "
                     f"ドラッグで「{label}」の領域を指定 {existing}",
                fg=color)

        done = sum(1 for k, _, _ in self.all_regions if k in self.regions_data)
        self.status.config(text=f"設定済み: {done}/{len(self.all_regions)} | "
                                f"画像: {self.img_w}x{self.img_h} | "
                                f"設定ファイル: {CONFIG_PATH.name}")

    def _draw_existing_regions(self):
        """既存の設定済み領域を描画"""
        for key, label, color in self.all_regions:
            if key in self.regions_data:
                r = self.regions_data[key]
                x1 = r['x1'] * self.scale
                y1 = r['y1'] * self.scale
                x2 = r['x2'] * self.scale
                y2 = r['y2'] * self.scale
                self.canvas.create_rectangle(x1, y1, x2, y2, outline=color, width=2,
                                              dash=(4, 2), tags="region")
                self.canvas.create_text(x1 + 3, y1 + 2, text=label, anchor=tk.NW,
                                         fill=color, font=("", 8, "bold"), tags="region")

    def _on_press(self, event):
        self.drag_start = (event.x, event.y)
        if self.drag_rect_id:
            self.canvas.delete(self.drag_rect_id)

    def _on_drag(self, event):
        if not self.drag_start:
            return
        if self.drag_rect_id:
            self.canvas.delete(self.drag_rect_id)

        color = "#c8a020"
        if self.current_idx < len(self.all_regions):
            color = self.all_regions[self.current_idx][2]

        self.drag_rect_id = self.canvas.create_rectangle(
            self.drag_start[0], self.drag_start[1], event.x, event.y,
            outline=color, width=2)

    def _on_release(self, event):
        if not self.drag_start:
            return
        if self.current_idx >= len(self.all_regions):
            return

        x1, y1 = self.drag_start
        x2, y2 = event.x, event.y

        # 最小サイズチェック
        if abs(x2 - x1) < 5 or abs(y2 - y1) < 5:
            if self.drag_rect_id:
                self.canvas.delete(self.drag_rect_id)
            return

        # 正規化（左上が小さくなるように）
        x1, x2 = min(x1, x2), max(x1, x2)
        y1, y2 = min(y1, y2), max(y1, y2)

        # 表示座標 → 元画像座標に変換
        key, label, color = self.all_regions[self.current_idx]
        self.regions_data[key] = {
            'x1': int(x1 / self.scale),
            'y1': int(y1 / self.scale),
            'x2': int(x2 / self.scale),
            'y2': int(y2 / self.scale),
            'label': label,
        }

        # ラベル描画
        if self.drag_rect_id:
            self.canvas.delete(self.drag_rect_id)
        self.canvas.create_rectangle(x1, y1, x2, y2, outline=color, width=2,
                                      dash=(4, 2), tags="region")
        self.canvas.create_text(x1 + 3, y1 + 2, text=label, anchor=tk.NW,
                                 fill=color, font=("", 8, "bold"), tags="region")

        self.drag_start = None
        self.current_idx += 1
        self._update_instruction()

    def _undo(self):
        if self.current_idx > 0:
            self.current_idx -= 1
            key = self.all_regions[self.current_idx][0]
            if key in self.regions_data:
                del self.regions_data[key]
            # 再描画
            self.canvas.delete("region")
            self.tk_image = ImageTk.PhotoImage(self.display_image)
            self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)
            self._draw_existing_regions()
            self._update_instruction()

    def _skip(self):
        if self.current_idx < len(self.all_regions):
            self.current_idx += 1
            self._update_instruction()

    def _test_ocr(self):
        """設定済みの領域でOCRテスト"""
        if not self.regions_data:
            messagebox.showinfo("テスト", "先に領域を指定してください")
            return

        try:
            import cv2
            import easyocr
            reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            img = cv2.imread(sys.argv[1])

            results = []
            for key in self.regions_data:
                r = self.regions_data[key]
                crop = img[r['y1']:r['y2'], r['x1']:r['x2']]
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                big = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
                _, bw = cv2.threshold(big, 150, 255, cv2.THRESH_BINARY_INV)
                ocr_result = reader.readtext(bw, detail=0, allowlist='0123456789')
                val = ocr_result[0] if ocr_result else "(検出なし=0)"
                results.append(f"{r.get('label', key)}: {val}")

            messagebox.showinfo("OCRテスト結果", "\n".join(results))
        except Exception as e:
            messagebox.showerror("エラー", str(e))

    def _save_and_quit(self):
        if not self.regions_data:
            if not messagebox.askyesno("確認", "領域が未設定ですが終了しますか？"):
                return

        # 保存
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(self.regions_data, f, ensure_ascii=False, indent=2)

        print(f"設定保存: {CONFIG_PATH}")
        for key, data in self.regions_data.items():
            label = data.get('label', key)
            print(f"  {label}: ({data['x1']},{data['y1']}) - ({data['x2']},{data['y2']})")

        self.root.destroy()

    def run(self):
        self.root.mainloop()


def main():
    if len(sys.argv) < 2:
        print("使い方: python ocr_calibrate.py screenshot.jpg")
        print("  スクショ上でドラッグして読み取り領域を指定します。")
        print(f"  設定は {CONFIG_PATH} に保存されます。")
        sys.exit(1)

    image_path = sys.argv[1]
    if not Path(image_path).exists():
        print(f"エラー: ファイルが見つかりません: {image_path}")
        sys.exit(1)

    app = CalibrationApp(image_path)
    app.run()


if __name__ == '__main__':
    main()
