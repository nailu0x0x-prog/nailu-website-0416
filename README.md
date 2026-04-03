# ないる 観測所 - PWA

## ファイル構成
```
nairu-pwa/
├── index.html      ← メインのアプリ
├── manifest.json   ← PWA設定ファイル
├── sw.js           ← オフライン対応（Service Worker）
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Vercelで公開する手順

### 1. GitHubにアップロード
1. https://github.com にアクセスしてログイン
2. 右上の「+」→「New repository」をクリック
3. Repository name: `nairu-site` と入力
4. 「Create repository」をクリック
5. 「uploading an existing file」をクリック
6. このフォルダの中身を全部ドラッグ&ドロップ
7. 「Commit changes」をクリック

### 2. Vercelと連携
1. https://vercel.com にアクセス
2. 「Sign Up」→「Continue with GitHub」でログイン
3. 「Add New Project」をクリック
4. `nairu-site` を選んで「Deploy」をクリック
5. 数秒で公開完了！URLが発行されるよ

### 3. スマホでインストール
- **Android**: ブラウザでサイトを開く → 「ホーム画面に追加」バナーが出る → タップ
- **iPhone**: Safariでサイトを開く → 共有ボタン → 「ホーム画面に追加」

## 管理者ログイン
パスワード: `nairu2026`
※本番運用前に変更してね！

## カスタマイズ
- `index.html` の `ADMIN_PW` でパスワード変更
- プロフィール情報は `pg-home` 内を編集
- SNSリンクは `href=` 部分を変更
