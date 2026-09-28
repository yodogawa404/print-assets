# @yodogawa404/print-assets — エージェント向けガイド

このドキュメントは `@yodogawa404/print-assets`（Vite プラグイン＋React の印刷素材ツールキット）を変更する際の規則とよくある落とし穴をまとめたものです。
コードを書く前に必ず読んでください。

## 何をするパッケージか

固定サイズの印刷素材（ポスター、フライヤー、写真シート、SNS用バナー）をReact で組み立て、Vite でビルドした後、ヘッドレス Chromium（Playwright）で描画して **PDF / Retina PNG** を `dist/` へ書き出すためのツールです。

1印刷面＝`pagesDir` 直下の1フォルダ＝1ページ。各ページにはルートコンポーネント（`main.tsx`）を持ちます。ページはフォルダ名（スラッグ）から自動でルーティングされ、ハッシュルーターの「カタログ画面」で一覧・プレビューできます。

## リポジトリ構成

```
scripts/build.mjs   # 配布ビルド: tsc で JS + .d.ts を出力し、CSS を dist へコピー
src/
  index.ts          # printAssets (vite-plugin) / pageSlugs (export) を再エクスポート
  vite-plugin.ts    # Vite プラグイン本体（仮想モジュール生成、closeBundle で exportPages）
  export.ts         # 本番ビルドを Playwright で配信し PDF/PNG を書き出す
  App.tsx           # ハッシュルーターのカタログ＋テーマ適用（init から使う）
  init.tsx          # init(): themeClass を取り込み createRoot で描画
  types.ts          # PrintRoute（仮想ルート型）
  virtual.d.ts      # 仮想モジュールの型宣言
  page.css          # キャンバス固定サイズ（a4 / square）のCSS
  print.css         # 印刷用（@page A4、ステージ余白の除去）
```

配布物（`dist/`）は tsc と `scripts/build.mjs` で生成します。`dist/` の中身を直接書き換えないでください。生成物です。

## ビルド／チェックコマンド

```bash
npm run build          # tsc → dist/ へ JS + .d.ts + page.css + print.css を出力
npm run format         # prettier --write
npm run format:check   # prettier --check
```

- ビルドは `scripts/build.mjs`（`npx tsc -p tsconfig.json` の後に CSS をコピー）。
- フォーマットは既定の Prettier 設定（`.prettierrc`）に従うこと。コミット前に`npm run format:check` が通ることを確認する。

## 設計の不変条件

- **固定サイズのキャンバス。** 各ページのルートは `data-canvas="page"` を持ち、`data-format` で `a4`（`210mm × 297mm`）または `square`（`2048 × 2048px`）を宣言する。サイズは印刷 CSS（`page.css`）で mm/px ベースの固定値として定義され、出力時は切り捨てて端数を丸める。
- **フォーマットはマークアップから自動判定。** `export.ts` は最初のページを開いて`data-format` を読み取り、それに応じてビューポート/スケール/出力ファイル名を変える。`pagesDir` 内のスラッグ→フォーマットの手動登録は存在しない。
- **出力規約。** A4 は `slug.pdf` と `slug@2x.png`、square は `slug.pdf` と`slug@2048.png`。エクスポート後に `dist/` からアセット以外（HTML/JS/CSS）を削除し、PNG/PDF だけを残す。
- **仮想モジュール。** プラグインは `virtual:print-assets/routes` と`virtual:print-assets/config` を差し込む。`init` / `App` はこれを直接利用する。仮想モジュールはプリバンドルできないため、`configureServer`/オプティマイズ設定でReact を明示的に prebundle している。
- **theme はコンシューマー側。** `themeClass`（ブランドトークン）は利用側のモジュールがエクスポートし、プラグインはそれを `themeClass` として仮想`config` 経由で再エクスポートするだけ。テーマの実体を当パッケージに持たせない。
- **エクスポートは Playwright 依存。** `export.ts` は `node:http` の静的サーバーで`dist/` を配信し、`playwright`（peerDependency、オンデマンド import）で chromium を立ち上げる。テストには使わず、ビルド後の書き出し専用。

## 変更時の注意

- **公開 API を変えるとき**は `src/index.ts` の再エクスポートと `package.json` の`exports` マップ（`.`, `./init`, `./vite-plugin`, `./page.css`, `./print.css`）を必ず揃える。CSS を増やしたら `scripts/build.mjs` のコピー処理にも追加する。
- `src/*.tsx` は `.js` 拡張子付きの相対 import を使う（ESM / NodeNext 整合）。兄弟 `.js` / `.tsx` はビルド後 `dist/` に同名 `.js` として出るので、import は`./App.js` のように `.js` に解決する。
- 仮想モジュール名（`virtual:print-assets/*`）や仮想型（`virtual.d.ts`）は仮想モジュールを持つ各所で二重に管理されている。変更時は `vite-plugin.ts` の`ROUTES`/`CONFIG` 定数、`virtual.d.ts`、利用側（`init`/`App`）をまとめて更新する。
- **不要な機能を追加しない。** このパッケージは「固定キャンバス＋印刷CSS＋Playwright書き出し」という狭い責務を意図的に保っている。ページごとのテーマ、フォーマットの拡張、レイアウトエンジンなどの自由度はコンシューマー側で解決する。
- Vite のバージョンは peerDependency（`>=6`）。Vite の内部API（`createServer` のポート折衝、`optimizeDeps.exclude/include`、仮想モジュールの NUL プレフィックス規約）に依存しているため、Vite の破壊的変更には敏感になること。

## プルリク / コミット

- 変更は最小構成の単一スコープを保つ。目的外のリファクタリングは混ぜない。
- フォーマットは `prettier` に任せる（手動整形しない）。
- `README.md` / `AGENTS.md` は実際の挙動とズレないよう、API や出力規約を変更したときはこのファイルとあわせて更新する。
