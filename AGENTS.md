# AGENTS.md — @yogodawa404/print-assets（エンジン）

プリント素材生成エンジンの公開 OSS パッケージ。consumer リポジトリ
（`assets-plate`）では npm workspaces で本パッケージを参照し、`dist/` の
プリコンパイル JS を使います。

## 役割

- 構造スタイル（`.page` 固定キャンバス / `@page`）+ virtual module routing +
  closeBundle export のみ。
- **prebundle 不可**（virtual module 使用）。`optimizeDeps.exclude` を plugin の
  `config()` フックで設定し、react 系は `optimizeDeps.include` で prebundle を強制する。

## コマンド

```bash
npm run build   # このパッケージ単体の precompile（tsc → dist/ + css コピー）
```

エンジン本体を変更したら、consumer 側で `npm run build:engine` を実行してから検証する
（consumer は `packages/print-assets/dist/` を参照）。

## ディレクトリ構成

```
src/
  vite-plugin.ts   # printAssets({ pagesDir, theme?, styles? })
                   #   virtual:print-assets/routes（pagesDir/*/main.tsx を glob）
                   #   virtual:print-assets/config（theme + styles 注入）
                   #   transformIndexHtml: entrypoint の script src を絶対パスに書換
                   #   config(): optimizeDeps の exclude / include
                   #   closeBundle: exportPages を実行
  entrypoint.tsx   # index.html から直接 import。consumer に glue 不要
  App.tsx          # file-based hash routing + 画面専用カタログ
  page.css / page.ts  # .page 固定キャンバス（構造のみ）
  print.css        # @page { size:A4; margin:0 } + print 用ステージ除去
  export.ts        # Playwright: served → print → Retina 2x → dist の HTML/JS/CSS 削除
  types.ts / virtual.d.ts / css.d.ts
scripts/build.mjs  # tsc で precompile + page.css / print.css を dist へコピー
```

## 重要：設計・規約

- **ブランドを持たない**。`page.css` / `print.css` / routing は構造のみ。
- **プリコンパイル JS を配布**（tsc で JSX→`createElement`、react は external）。
  実ランタイムは consumer の react 19（peerDependencies `^19`）。
- **virtual module と dev / build**:
  - prebundle 不可 → plugin の `config()` で `optimizeDeps.exclude: ['@yogodawa404/print-assets']`
  - exclude すると react 系が走査されないため、`optimizeDeps.include` で
    `react` / `react-dom` / `react-dom/client` / `react/jsx-runtime` / `react/jsx-dev-runtime`
    を prebundle 強制（これをしないと dev で `createRoot` の named export エラーになる）。
  - HTML の script src（`@yogodawa404/print-assets/entrypoint`）は
    `transformIndexHtml` が絶対パスに書換（しないと dev で 404 / SPA fallback に落ちる）。
- **固定キャンバス**: `.page`（A4 `210mm × 297mm`）と `.page-square`（`2048 × 2048 px`）の 2 種。
  PDF も PNG も `media: 'print'` から撮る。PNG は A4 が `deviceScaleFactor: 2`、square は `1`。
- **data-format（必須）**: 各ページのキャンバスルートに `data-format="a4" | "square"` を宣言する。
  欠落・不正値は export が throw する。export は属性を読んで PNG 解像度と PDF サイズを切り替える
  （square の PDF は `@page { size:2048px 2048px }` を注入して撮る）。
- **print 時のステージ余白**: ステージの余白は App が**インラインスタイル**で当てるため、
  `print.css` の `html [data-stage] { padding:0; gap:0 }` は `!important` 必須。
  これが無いとインライン余白が残り、PDF が**白紙 1 枚目＋2 枚目にずれて出力**される
  （修正済み。ステージ余白の実装方式を変えたら要再確認）。
- **dist は PNG / PDF だけ**: export 後に HTML / JS / CSS / assets を全削除
  （`keepOnlyAssets`）。`vite preview` は効かなくなる点に注意。
- **Playwright 分離**: 常用 Chrome / 実プロファイルには触れない。
  バンドルの chromium（`channel: 'chrome'` を使わない）を一時プロファイルで起動。

## 公開

- `npm pack` で配布物を確認する（`files: ["dist"]` のみ）。
  consumer の `src/` やフォントは含めない。
- ライセンスは MIT。
