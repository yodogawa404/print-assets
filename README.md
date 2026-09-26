# @yodogawa404/print-assets

プリント素材（ポスター・フライヤー・請求書等）を、固定サイズの A4 キャンバスで宣言的に組み、
**print CSS から PDF / PNG を書き出す**ための Vite プラグインです。

1 つのプラグインに「file-based routing のページ組立」と「Playwright による PDF / PNG 出力」を
収めています。ブランドトークン（テーマ）は持ちません。

## 特徴

- **1 つの Vite プラグイン**: `printAssets({ pagesDir, theme?, styles? })` を `vite.config.ts` に足すだけ。
- **file-based routing**: `src/pages/*/main.tsx` のフォルダ名 = URL。並び順はユニコード順。
- **print CSS から出力**: PNG も PDF も `media: 'print'` + `deviceScaleFactor: 2` で撮影 → 同一見た目。
- **dist は PNG / PDF だけ**: 出力後に HTML / JS / CSS を削除。
- **ブランド非依存**: 構造スタイル（`.page` キャンバス / `@page`）のみを配布。

## インストール

```bash
npm install @yogodawa404/print-assets
```

初回のみ Playwright の chromium をインストールします（consumer 側の devDependency として `playwright` を追加）。

```bash
npm install -D playwright
npx playwright install chromium
```

## 使い方

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { printAssets } from '@yogodawa404/print-assets/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    printAssets({
      pagesDir: 'src/pages',
      theme: 'src/styles/theme.css.ts',      // 任意: themeClass を export するモジュール
      styles: ['src/styles/global.css.ts'],  // 任意: グローバルに import する CSS
    }),
  ],
});
```

`index.html`（エントリはプラグインが配布します。consumer に glue コードは不要）:

```html
<!doctype html>
<html lang="ja">
  <body>
    <div id="app"></div>
    <script type="module" src="@yogodawa404/print-assets/entrypoint"></script>
  </body>
</html>
```

### ページの追加

`src/pages/` にフォルダを作り、直下の `main.tsx` を default export で実装します。
キャンバスのルートには `data-format` 属性が**必須**です（`a4` または `square`。
欠落・不正値はビルド時にエラーになります）。

```tsx
import { page } from '@yodogawa404/print-assets/page';
import * as s from './poster.css.ts';

export default function PosterPage() {
  return (
    <div className={page} data-canvas="page" data-format="a4">
      <div className={s.canvas}>…</div>
    </div>
  );
}
```

正方形（2048 × 2048 px）で出力する場合は `pageSquare` を使い `data-format="square"` を指定します。

```tsx
import { pageSquare } from '@yodogawa404/print-assets/page';

export default function SquarePage() {
  return (
    <div className={pageSquare} data-canvas="page" data-format="square">
      <div className={s.canvas}>…</div>
    </div>
  );
}
```

- `a4`: A4 PDF + PNG（Retina 2x）を出力
- `square`: 正方形 PDF（2048 × 2048 px）+ PNG（2048 × 2048 px）を出力

### コマンド

```bash
npm run dev      # プレビュー（src/pages/ を編集）
npm run build    # 本番ビルド + print CSS から PDF / PNG を dist/ へ出力
npm run preview  # 注意: dist は PNG / PDF のみのため preview は効かない
```

## テーマ

`theme` オプションに、`createTheme` の `themeClass` を export するモジュールを渡してください。

## peerDependencies

- `react` / `react-dom` `^19`
- `vite` `>=6`
- `playwright` `>=1.40`（consumer の devDependency）

エンジンは prebundle 不可（virtual module を使用）のため、consumer 側に
`optimizeDeps.exclude: ['@yogodawa404/print-assets']` 相当を自動で設定します。

## ライセンス

MIT

## 開発について

本パッケージは、LLM（opencode）を使用して開発されています。
