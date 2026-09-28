# @yodogawa404/print-assets

固定サイズの印刷素材（ポスター、フライヤー、写真シートなど、レイアウトが固定されたもの）を React で組み立て、**PDF** と **Retina PNG** に書き出すための Vite プラグイン＋React ツールキットです。

1印刷面＝`pages` 直下の1フォルダ（それぞれに `main.tsx` を持つ）として定義します。プラグインはそれらをハッシュルーターのカタログとしてルーティングし、マークアップからフォーマットを自動検出。本番ビルドのたびにヘッドレスChromium（Playwright）で各ページを描画して `dist/` へ `*.pdf` / `*.png` を生成します。

## できること

- **ページ自動ルーティング。** `pagesDir` に1フォルダ＝1ページ。フォルダ名がそのままルート（パス/ラベル）になり、手動でのルート登録は不要です。
- **印刷用固定キャンバス。** 各ページのキャンバスルートに`data-canvas="page"` と `data-format` を宣言します。`a4`（210×297mm）と
  `square`（2048×2048px）に対応し、mm/px のCSSと切り捨て丸めで出力されます。
- **PDF / PNG 自動書き出し。** ビルド後に Playwright（print メディアのエミュレーション）で各ページを描画し、宣言されたフォーマットに応じて`*.pdf` と `*@2x.png` / `*@2048.png` を生成します。
- **テーマ＋グローバルスタイル。** `themeClass` をエクスポートするthemeモジュールと、全ページへ読み込むスタイル（フォント、`global.css` など）を指定できます。
- **カタログ画面。** ハッシュルーターのカタログですべてのページを一覧・プレビュー。各ページは `/#/<slug>` で直接開けます。
- **既定で最適化。** パッケージのプリバンドルを無効化し、React を明示的にプリバンドル、仮想Route/configモジュールをビルド時に差し込みます。

## インストール

```bash
npm i -D @yodogawa404/print-assets
```

エクスポートは `playwright` をオンデマンドで読み込むため、peerDependency で指定しています。あわせてインストールしてください（`chromium` を使用）:

```bash
npm i -D playwright
npx playwright install chromium
```

## 使い方

### 1. Vite 設定にプラグインを追加

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { printAssets } from '@yodogawa404/print-assets/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    printAssets({
      pagesDir: 'src/pages',
      // theme: './src/theme.ts',       // themeClass をエクスポート（任意）
      // styles: ['./src/global.css'],  // 全ページに読み込むCSS（任意）
    }),
  ],
});
```

### 2. ページを作成

各ページは `pagesDir` の直下に1フォルダ＝1ページとして配置し、`main.tsx`（プラグインがバンドルするコンポーネント）を持ちます。キャンバスルートはフォーマットを読めるよう、プラグインに検出可能な形で置きます:

```tsx
// src/pages/poster/main.tsx
export default function Poster() {
  return (
    <div data-canvas="page" data-format="a4">
      <h1>セールのお知らせ</h1>
    </div>
  );
}
```

対応するフォーマット:

| `data-format` | キャンバスサイズ | 出力ファイル                |
| ------------- | ---------------- | --------------------------- |
| `a4`          | `210mm × 297mm`  | `slug.pdf`, `slug@2x.png`   |
| `square`      | `2048 × 2048px`  | `slug.pdf`, `slug@2048.png` |

### 3. マウントして init

コンシューマー側でCSSを読み込み、`init` を呼び出します:

```ts
import { init } from '@yodogawa404/print-assets/init';

init(document.getElementById('root')!);
```

`init` は指定した要素へ、解決済みの `themeClass` を適用してカタログ（または`window.location.hash` に一致するページ）を描画します。

### 4. エクスポート

プラグインの `closeBundle` が本番ビルド後に自動でエクスポートを実行します:

```bash
npm run build
```

`dist/` に出力されます:

```
dist/
  poster.pdf
  poster@2x.png
  square-card.pdf
  square-card@2048.png
```

書き出し後、印刷アセット以外のビルド出力（HTML/JS/CSS）は削除され、PDF と PNG だけが残ります。

## オプション

| オプション | 型         | 既定 | 説明                                                                                              |
| ---------- | ---------- | ---- | ------------------------------------------------------------------------------------------------- |
| `pagesDir` | `string`   | —    | **必須。** ページごとのサブフォルダを持つルートフォルダ。                                         |
| `theme`    | `string`   | —    | `themeClass` をエクスポートするモジュール（任意）。ブランドトークンはコンシューマー側に生きます。 |
| `styles`   | `string[]` | `[]` | 全ページにグローバルに読み込むCSS（フォント、`global.css` など）。                                |

### 仮想モジュール

プラグインはエンジンに2つの Vite 仮想モジュールを提供します:

- `virtual:print-assets/routes` — 自動生成されるルートテーブル（各ページの`path` / `label` / 遅延解決された `Component`）。
- `virtual:print-assets/config` — 指定したスタイルを読み込み、設定されたtheme から `themeClass` を再エクスポートします。

`init` はこれらを内部でインポートします。

## API

### `printAssets(options)`

Vite プラグインを返します。詳細は [オプション](#オプション) を参照。

### `pageSlugs(pagesDir)`

`pagesDir` からページフォルダをスキャンし、そのスラグ（フォルダ名）を返します。

### `exportPages({ pagesDir, distDir })`（`/export.js`）

プログラムからのエクスポート: 本番ビルドを配信し、各ページを Playwright で開いて解決済みのフォーマット/スケールで PDF/PNG を `distDir` へ書き出します。`closeBundle` から自動で呼ばれます。

## ライセンス

MIT

## 開発について

本パッケージは、LLM（opencode）を使用して開発されています。
