"""
パワプロアドベンチャーズ スクショ/動画 OCR ツール
=================================================
iPhone画面録画から査定値と経験点コストを自動抽出

使い方:
  動画:     python ocr_video.py video.mp4
  画像2枚:  python ocr_video.py before.jpg after.jpg
  フォルダ:  python ocr_video.py ./screenshots/

オプション:
  --stat hp|power|magic|dex|endurance  (対象ステータス, デフォルト: 全行)
  --job 1|2|3|4                         (役職ID, デフォルト: 1=剣士)
  --output csv|json|supabase            (出力形式, デフォルト: csv)
  --supabase-url URL                    (Supabase URL)
  --supabase-key KEY                    (Supabase anon key)
  --debug                               (デバッグ画像を保存)
"""

import sys
import os
import json
import csv
import argparse
from pathlib import Path

import cv2
import numpy as np

# EasyOCR (lazy load - heavy import)
_reader = None
def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    return _reader

# ============================================================
# 画面レイアウト定数 (iPhone横画面スクショ基準)
# ============================================================

# 査定スコア位置
SCORE_REGION = (0.02, 0.25, 0.1, 0.17)  # x1, x2, y1, y2 (比率)

# 経験点テーブルの各行Y位置 (比率)
STAT_ROWS = {
    'hp':        (0.39, 0.455),
    'power':     (0.47, 0.535),
    'magic':     (0.55, 0.615),
    'dex':       (0.63, 0.695),
    'endurance': (0.71, 0.775),
}

STAT_LABELS = {
    'hp': '生命力', 'power': 'パワー', 'magic': '魔力',
    'dex': '器用さ', 'endurance': '耐久力',
}

# 経験点5列のX位置 (ストリップ内ピクセル座標 → セル分割用)
STRIP_X = (0.55, 0.92)  # ストリップのX範囲
CELL_EDGES = [162, 236, 309, 383, 456, 530]  # 5セルの境界

EXP_LABELS = ['exp_kinryoku', 'exp_binsoku', 'exp_gijutsu', 'exp_chiryoku', 'exp_seishin']
EXP_LABELS_JA = ['筋力', '敏捷', '技術', '知力', '精神']

# ステータス値の左側パネル位置 (各ステータスの現在値)
# 左側パネルの数字位置 (G 39 のような表示)
STAT_VALUE_REGIONS = {
    'hp':        (0.035, 0.085, 0.49, 0.56),
    'power':     (0.095, 0.145, 0.49, 0.56),
    'magic':     (0.155, 0.205, 0.49, 0.56),
    'dex':       (0.215, 0.265, 0.49, 0.56),
    'endurance': (0.275, 0.325, 0.49, 0.56),
    # 'spirit':  (0.335, 0.385, 0.49, 0.56),  # 精神力
}

# ============================================================
# OCR関数
# ============================================================

def ocr_score(img):
    """査定スコアを読み取り"""
    h, w = img.shape[:2]
    x1, x2, y1, y2 = SCORE_REGION
    crop = img[int(h*y1):int(h*y2), int(w*x1):int(w*x2)]
    results = get_reader().readtext(crop, detail=0, allowlist='0123456789')
    if results:
        try:
            return int(results[0])
        except ValueError:
            pass
    return None


def ocr_exp_row(img, stat_key):
    """指定ステータスの経験点コスト5列を読み取り"""
    h, w = img.shape[:2]
    y1r, y2r = STAT_ROWS[stat_key]
    y1, y2 = int(h * y1r), int(h * y2r)
    strip = img[y1:y2, int(w * STRIP_X[0]):int(w * STRIP_X[1])]

    # 2倍に拡大してOCR精度向上
    big = cv2.resize(strip, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    results = get_reader().readtext(big, detail=1, allowlist='0123456789')

    vals = [0] * 5
    for item in results:
        x_center = (item[0][0][0] + item[0][2][0]) / 2 / 2  # /2 for upscale
        for ci in range(5):
            if CELL_EDGES[ci] <= x_center < CELL_EDGES[ci + 1]:
                try:
                    vals[ci] = int(item[1])
                except ValueError:
                    pass
                break
    return dict(zip(EXP_LABELS, vals))


def ocr_frame(img, stat_keys=None):
    """1フレーム分のOCR (スコア + 全ステータス行)"""
    score = ocr_score(img)
    if stat_keys is None:
        stat_keys = list(STAT_ROWS.keys())

    rows = {}
    for sk in stat_keys:
        rows[sk] = ocr_exp_row(img, sk)

    return {'score': score, 'rows': rows}


# ============================================================
# 動画処理
# ============================================================

def detect_score_changes(video_path, stat_keys=None, debug=False):
    """動画からスコア変化を検出して経験点を抽出"""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"エラー: 動画を開けません: {video_path}")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total / fps if fps > 0 else 0
    print(f"動画: {video_path}")
    print(f"  FPS: {fps:.1f}, フレーム数: {total}, 長さ: {duration:.1f}秒")

    if stat_keys is None:
        stat_keys = list(STAT_ROWS.keys())

    results = []
    prev_score = None
    prev_frame = None
    frame_idx = 0
    # 毎フレームは重いので0.5秒ごとにサンプリング
    sample_interval = max(1, int(fps * 0.5))

    print(f"  サンプリング間隔: {sample_interval}フレーム ({sample_interval/fps:.2f}秒)")
    print(f"  対象ステータス: {', '.join(STAT_LABELS[k] for k in stat_keys)}")
    print()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_interval != 0:
            frame_idx += 1
            continue

        score = ocr_score(frame)
        time_sec = frame_idx / fps

        if score is not None:
            if prev_score is not None and score != prev_score:
                satei_delta = score - prev_score
                print(f"  [{time_sec:.1f}s] 査定変化検出: {prev_score} → {score} (差分: {satei_delta:+d})")

                # 変化前のフレームから経験点を読み取り
                if prev_frame is not None:
                    for sk in stat_keys:
                        exp = ocr_exp_row(prev_frame, sk)
                        # 全部0でなければ記録
                        if any(v != 0 for v in exp.values()):
                            result = {
                                'time': round(time_sec, 1),
                                'score_before': prev_score,
                                'score_after': score,
                                'satei_delta': satei_delta,
                                'stat_type': sk,
                                **exp,
                            }
                            results.append(result)
                            exp_str = ' '.join(f"{EXP_LABELS_JA[i]}={v}" for i, v in enumerate(exp.values()))
                            print(f"    {STAT_LABELS[sk]}: {exp_str}")

                            if debug:
                                debug_dir = Path(video_path).parent / '_ocr_debug'
                                debug_dir.mkdir(exist_ok=True)
                                cv2.imwrite(str(debug_dir / f"frame_{frame_idx}_before.png"), prev_frame)
                                cv2.imwrite(str(debug_dir / f"frame_{frame_idx}_after.png"), frame)

            prev_score = score
            prev_frame = frame.copy()

        frame_idx += 1
        # 進捗表示
        if frame_idx % (sample_interval * 20) == 0:
            pct = frame_idx / total * 100 if total > 0 else 0
            print(f"  進捗: {pct:.0f}% ({frame_idx}/{total})")

    cap.release()
    print(f"\n完了: {len(results)}件のデータを検出")
    return results


def process_image_pair(before_path, after_path, stat_keys=None):
    """画像2枚から差分を計算"""
    img1 = cv2.imread(str(before_path))
    img2 = cv2.imread(str(after_path))

    if img1 is None:
        print(f"エラー: 画像を開けません: {before_path}")
        return []
    if img2 is None:
        print(f"エラー: 画像を開けません: {after_path}")
        return []

    if stat_keys is None:
        stat_keys = list(STAT_ROWS.keys())

    score1 = ocr_score(img1)
    score2 = ocr_score(img2)
    print(f"査定: {score1} → {score2}", end="")
    if score1 and score2:
        print(f" (差分: {score2-score1:+d})")
    else:
        print()

    results = []
    for sk in stat_keys:
        exp = ocr_exp_row(img1, sk)
        if any(v != 0 for v in exp.values()):
            result = {
                'score_before': score1,
                'score_after': score2,
                'satei_delta': (score2 - score1) if score1 and score2 else None,
                'stat_type': sk,
                **exp,
            }
            results.append(result)
            exp_str = ' '.join(f"{EXP_LABELS_JA[i]}={v}" for i, v in enumerate(exp.values()))
            print(f"  {STAT_LABELS[sk]}: {exp_str}")

    return results


def process_folder(folder_path, stat_keys=None):
    """フォルダ内の画像を時系列で処理（ファイル名順）"""
    folder = Path(folder_path)
    images = sorted(folder.glob("*.jpg")) + sorted(folder.glob("*.JPG")) + \
             sorted(folder.glob("*.png")) + sorted(folder.glob("*.PNG"))

    if len(images) < 2:
        print(f"エラー: 画像が2枚以上必要です ({len(images)}枚)")
        return []

    print(f"フォルダ: {folder}")
    print(f"  画像: {len(images)}枚")

    all_results = []
    for i in range(len(images) - 1):
        print(f"\n--- {images[i].name} → {images[i+1].name} ---")
        results = process_image_pair(images[i], images[i+1], stat_keys)
        all_results.extend(results)

    return all_results


# ============================================================
# 出力
# ============================================================

def output_csv(results, path):
    if not results:
        return
    keys = list(results[0].keys())
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        w.writerows(results)
    print(f"\nCSV出力: {path} ({len(results)}件)")


def output_json(results, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nJSON出力: {path} ({len(results)}件)")


def upload_supabase(results, url, key, job_id, stat_type=None):
    """Supabaseに直接アップロード"""
    import requests
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates',
    }

    count = 0
    for r in results:
        st = stat_type or r.get('stat_type', 'hp')
        # stat_valueが必要だが、OCRからは取れない場合がある
        # ユーザーに確認が必要
        if 'stat_value' not in r:
            print(f"  警告: stat_valueが不明 (satei_delta={r.get('satei_delta')})")
            continue

        payload = {
            'job_id': job_id,
            'stat_type': st,
            'stat_value': r['stat_value'],
            'satei_delta': r.get('satei_delta'),
            'exp_kinryoku': r.get('exp_kinryoku', 0),
            'exp_binsoku': r.get('exp_binsoku', 0),
            'exp_gijutsu': r.get('exp_gijutsu', 0),
            'exp_chiryoku': r.get('exp_chiryoku', 0),
            'exp_seishin': r.get('exp_seishin', 0),
        }

        resp = requests.post(f'{url}/rest/v1/base_stat_costs', headers=headers, json=payload)
        if resp.ok:
            count += 1
        else:
            print(f"  エラー: {resp.status_code} {resp.text[:100]}")

    print(f"\nSupabase: {count}/{len(results)}件 アップロード完了")


# ============================================================
# メイン
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='パワアド スクショ/動画 OCR')
    parser.add_argument('input', nargs='+', help='動画ファイル, 画像2枚, またはフォルダ')
    parser.add_argument('--stat', choices=list(STAT_ROWS.keys()), nargs='*', help='対象ステータス')
    parser.add_argument('--job', type=int, default=1, help='役職ID (1=剣士, 2=弓使い, 3=魔法使い, 4=魔闘士)')
    parser.add_argument('--output', choices=['csv', 'json', 'supabase'], default='csv')
    parser.add_argument('--supabase-url', help='Supabase URL')
    parser.add_argument('--supabase-key', help='Supabase anon key')
    parser.add_argument('--debug', action='store_true', help='デバッグ画像を保存')
    args = parser.parse_args()

    stat_keys = args.stat if args.stat else None
    inputs = [Path(p) for p in args.input]

    print("=" * 50)
    print("パワアド OCR ツール")
    print("=" * 50)

    results = []

    if len(inputs) == 1:
        p = inputs[0]
        if p.is_dir():
            results = process_folder(p, stat_keys)
        elif p.suffix.lower() in ('.mp4', '.mov', '.avi', '.mkv'):
            results = detect_score_changes(p, stat_keys, debug=args.debug)
        else:
            print(f"エラー: 動画かフォルダを指定してください: {p}")
            return
    elif len(inputs) == 2:
        results = process_image_pair(inputs[0], inputs[1], stat_keys)
    else:
        # 複数画像を時系列として処理
        for i in range(len(inputs) - 1):
            r = process_image_pair(inputs[i], inputs[i+1], stat_keys)
            results.extend(r)

    if not results:
        print("\nデータが検出されませんでした")
        return

    # 出力
    out_base = inputs[0].stem if inputs[0].is_file() else inputs[0].name
    if args.output == 'csv':
        output_csv(results, f'{out_base}_ocr.csv')
    elif args.output == 'json':
        output_json(results, f'{out_base}_ocr.json')
    elif args.output == 'supabase':
        if not args.supabase_url or not args.supabase_key:
            print("エラー: --supabase-url と --supabase-key が必要です")
            return
        upload_supabase(results, args.supabase_url, args.supabase_key, args.job)


if __name__ == '__main__':
    main()
