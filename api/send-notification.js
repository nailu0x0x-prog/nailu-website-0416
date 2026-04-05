const webpush = require('web-push');

const VAPID_PUBLIC  = 'BFvCl8yYFOBebq3oihDY2Zir0UiyIHJ01wqVEaIUY6_g5U3vf8cAzc_PQQog61fiudehcAem9i0ejnLUqE-BgKE';
const VAPID_PRIVATE = 'FNgOUapZBzIZEQS_yj7I2lYREAh4dfrEOI-qx7Q0qzU';
const ADMIN_PW      = 'nairu2026';
const SUPA_URL      = 'https://tghzvpogpuijbxsrwjgt.supabase.co';
const SUPA_KEY      = 'sb_publishable_DL8vjJ-_DsSucvunEJmx_Q_hvEcRcke';

webpush.setVapidDetails('mailto:nailu@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { adminPw, title, message } = req.body;
  if (adminPw !== ADMIN_PW) return res.status(401).json({ error: 'Unauthorized' });

  // Supabase から全サブスクリプション取得
  const r = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
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

  // 期限切れ削除
  for (const id of expired) {
    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    });
  }

  res.status(200).json({ sent });
};
