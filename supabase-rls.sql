-- =========================================================
-- 観測所 — Supabase RLS（行レベルセキュリティ）設定
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください
-- =========================================================

-- RLS を有効化
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE news               ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods              ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items      ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- users テーブル
--   SELECT : 誰でも読める（ログイン・プロフィール表示に必要）
--   INSERT : 誰でも登録できる
--   UPDATE : サービスロールのみ（管理者API経由のみ）
--   DELETE : サービスロールのみ
-- =========================================================
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);

-- =========================================================
-- posts テーブル
--   SELECT : 誰でも読める
--   INSERT : 誰でも投稿できる
--   DELETE : サービスロールのみ（管理者API経由）
-- =========================================================
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (true);

-- =========================================================
-- post_likes テーブル
--   SELECT / INSERT / DELETE : 誰でも（いいね機能に必要）
-- =========================================================
DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON post_likes;
DROP POLICY IF EXISTS "post_likes_delete" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE USING (true);

-- =========================================================
-- news テーブル（管理者のみ書き込み可）
--   SELECT : 誰でも読める
--   INSERT / UPDATE / DELETE : サービスロールのみ
-- =========================================================
DROP POLICY IF EXISTS "news_select" ON news;
CREATE POLICY "news_select" ON news FOR SELECT USING (true);

-- =========================================================
-- settings テーブル（管理者のみ書き込み可）
--   SELECT : 誰でも読める
--   INSERT / UPDATE / DELETE : サービスロールのみ
-- =========================================================
DROP POLICY IF EXISTS "settings_select" ON settings;
CREATE POLICY "settings_select" ON settings FOR SELECT USING (true);

-- =========================================================
-- schedules テーブル（管理者のみ書き込み可）
-- =========================================================
DROP POLICY IF EXISTS "schedules_select" ON schedules;
CREATE POLICY "schedules_select" ON schedules FOR SELECT USING (true);

-- =========================================================
-- goods テーブル（管理者のみ書き込み可）
-- =========================================================
DROP POLICY IF EXISTS "goods_select" ON goods;
CREATE POLICY "goods_select" ON goods FOR SELECT USING (true);

-- =========================================================
-- push_subscriptions テーブル
--   INSERT : 誰でも（通知購読に必要）
--   SELECT / DELETE : サービスロールのみ（通知送信API経由）
-- =========================================================
DROP POLICY IF EXISTS "push_sub_insert" ON push_subscriptions;
CREATE POLICY "push_sub_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);

-- =========================================================
-- gallery_groups / gallery_items テーブル（管理者のみ書き込み可）
-- =========================================================
DROP POLICY IF EXISTS "gallery_groups_select" ON gallery_groups;
DROP POLICY IF EXISTS "gallery_items_select"  ON gallery_items;
CREATE POLICY "gallery_groups_select" ON gallery_groups FOR SELECT USING (true);
CREATE POLICY "gallery_items_select"  ON gallery_items  FOR SELECT USING (true);

-- =========================================================
-- ✅ これで防げること
--   ・他人の role や password を書き換えられない
--   ・おしらせ・スケジュール・グッズをクライアントから書き換えられない
--   ・プッシュ通知の購読一覧を盗み見られない
--
-- ⚠️ 注意: 以下は管理者APIルート（/api/...）から
--   service_role キーで操作する必要があります
--   ・投稿の削除（deletePost）
--   ・アバター画像の更新（uploadAvatar）
--   ・管理画面からの各種書き込み
-- =========================================================
