const webpush = require('web-push');

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BFvCl8yYFOBebq3oihDY2Zir0UiyIHJ01wqVEaIUY6_g5U3vf8cAzc_PQQog61fiudehcAem9i0ejnLUqE-BgKE';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'FNgOUapZBzIZEQS_yj7I2lYREAh4dfrEOI-qx7Q0qzU';
const SUPA_URL      = process.env.SUPA_URL          || 'https://tghzvpogpuijbxsrwjgt.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY; // Supabase service_role key（Vercel環境変数に設定必須）
const SUPA_ANON_KEY = process.env.SUPA_ANON_KEY     || 'sb_publishable_DL8vjJ-_DsSucvunEJmx_Q_hvEcRcke';

webpush.setVapidDetails('mailto:nailu@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, title, message } = req.body;
  if (!userId || !title || !message) return res.status(400).json({ error: 'Bad Request' });

  // Supabaseでユーザーがadminかどうかを検証
  // SUPA_SERVICE_KEYが設定されていない場合は通知を拒否
  if (!SUPA_SERVICE_KEY) {
    console.error('SUPA_SERVICE_KEY が設定されていません。Vercel環境変数に追加してください。');
    return res.status(503).json({ error: 'Notification service not configured' });
  }

  const verifyRes = await fetch(`${SUPA_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=role`, {
    headers: {
      'apikey': SUPA_SERVICE_KEY,
      'Authorization': `Bearer ${SUPA_SERVICE_KEY}`
    }
  });
  const users = await verifyRes.json();
  if (!Array.isArray(users) || !users[0] || users[0].role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 全サブスクリプション取得
  const r = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: { 'apikey': SUPA_SERVICE_KEY, 'Authorization': `Bearer ${SUPA_SERVICE_KEY}` }
  });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, message });
  let sent = 0;
  const expired = [];

  for (const row of rows) {
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) expired.push(row.id);
    }
  }

  for (const id of expired) {
    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_SERVICE_KEY, 'Authorization': `Bearer ${SUPA_SERVICE_KEY}` }
    });
  }

  res.status(200).json({ sent });
};
