# ⚔️ pawaadtools - パワアド 査定DB

パワプロアドベンチャーズの査定値・必要経験点をみんなで集めるデータベース。

## 機能
- **基本能力** — ジョブ×能力種ごとに0〜上限の経験点・査定を記録
- **スキル** — 全スキルの査定・経験点をジョブ別に記録
- **必殺技** — ジョブ別の査定・経験点を記録
- **金特** — ジョブ別の査定・経験点を記録
- **条件分岐メモ** — HP依存・冒険者基礎値依存などを記録
- **履歴保存** — 上書き時に旧データをバックアップ

## 技術構成
- Vite + React
- Supabase (PostgreSQL)
- Netlify

## ローカル開発
```bash
npm install
npm run dev
```

## デプロイ
Netlify GitHub連携で `main` pushで自動デプロイ。
- Build command: `npm run build`
- Publish directory: `dist`
