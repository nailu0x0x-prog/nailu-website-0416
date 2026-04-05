// Vercel Edge Function — プッシュ通知送信
// VAPID keys
const VAPID_PUBLIC  = 'BAAt0XtMqvp_UaxvQg2YkqgZwzqP9pgZbO5lOU3eAynMN-cScO8wDCQgmNJKaQFpEU8raaM4YOq9AaEO7WMfHpo';
const VAPID_PRIVATE = 'N-cScO8wDCQgmNJKaQFpEU8raaM4YOq9AaEO7WMfHpo';
const VAPID_SUBJECT = 'mailto:nailu@example.com';

const SUPA_URL = 'https://tghzvpogpuijbxsrwjgt.supabase.co';
const SUPA_KEY = 'sb_publishable_DL8vjJ-_DsSucvunEJmx_Q_hvEcRcke';
const ADMIN_PW  = 'nairu2026';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.adminPw !== ADMIN_PW) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { title, message } = body;

  // Supabase から全サブスクリプションを取得
  const res = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
    }
  });
  const subscriptions = await res.json();
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  // VAPID JWT生成
  const vapidHeaders = await buildVapidHeaders(VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT);

  let sent = 0;
  const expired = [];

  for (const row of subscriptions) {
    const sub = row.subscription;
    try {
      const payload = JSON.stringify({ title, message });
      const r = await sendPush(sub, payload, vapidHeaders);
      if (r.status === 201 || r.status === 200) {
        sent++;
      } else if (r.status === 410 || r.status === 404) {
        expired.push(row.id);
      }
    } catch (e) { /* skip */ }
  }

  // 期限切れサブスクリプションを削除
  for (const id of expired) {
    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    });
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
}

// ---- Web Push送信 ----
async function sendPush(subscription, payload, vapidHeaders) {
  const endpoint = subscription.endpoint;
  const { p256dh, auth } = subscription.keys;

  // 暗号化
  const encrypted = await encryptPayload(payload, p256dh, auth);

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      ...vapidHeaders,
      ...encrypted.headers,
    },
    body: encrypted.body,
  });
}

// ---- VAPID JWT ----
async function buildVapidHeaders(publicKey, privateKey, subject) {
  const endpoint = 'https://fcm.googleapis.com';
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const claims = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const unsigned = `${header}.${claims}`;

  const privBytes = base64urlToBytes(privateKey);
  const key = await crypto.subtle.importKey(
    'raw', privBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  );
  const sigB64 = bytesToBase64url(new Uint8Array(sig));
  const jwt = `${unsigned}.${sigB64}`;

  return {
    'Authorization': `vapid t=${jwt},k=${publicKey}`,
  };
}

// ---- ペイロード暗号化（RFC 8291 aes128gcm） ----
async function encryptPayload(payload, p256dhB64, authB64) {
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  const clientPubBytes = base64urlToBytes(p256dhB64);
  const clientAuthBytes = base64urlToBytes(authB64);
  const clientPubKey = await crypto.subtle.importKey('raw', clientPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  const sharedSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPubKey }, serverKeys.privateKey, 256);

  // salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF
  const prk = await hkdf(clientAuthBytes, new Uint8Array(sharedSecret), new TextEncoder().encode('Content-Encoding: auth\0'), 32);
  const cek = await hkdf(salt, prk, buildInfo('aesgcm', clientPubBytes, serverPubRaw), 16);
  const nonce = await hkdf(salt, prk, buildInfo('nonce', clientPubBytes, serverPubRaw), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const payloadBytes = new TextEncoder().encode(payload);
  // RFC 8291 padding: 2-byte pad length + payload + pad
  const padded = new Uint8Array(2 + payloadBytes.length + 1);
  padded[0] = 0; padded[1] = 0; // pad length
  padded.set(payloadBytes, 2);
  padded[2 + payloadBytes.length] = 2; // delimiter

  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded));

  // aes128gcm content
  const rs = 4096;
  const header = new Uint8Array(21 + serverPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = serverPubRaw.length;
  header.set(serverPubRaw, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return {
    headers: { 'Content-Length': String(body.length) },
    body,
  };
}

function buildInfo(type, clientPub, serverPub) {
  const enc = new TextEncoder();
  const t = enc.encode(`Content-Encoding: ${type}\0P-256\0`);
  const buf = new Uint8Array(t.length + 2 + clientPub.length + 2 + serverPub.length);
  let i = 0;
  buf.set(t, i); i += t.length;
  new DataView(buf.buffer).setUint16(i, clientPub.length, false); i += 2;
  buf.set(clientPub, i); i += clientPub.length;
  new DataView(buf.buffer).setUint16(i, serverPub.length, false); i += 2;
  buf.set(serverPub, i);
  return buf;
}

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, concat(info, new Uint8Array([1]))));
  return okm.slice(0, len);
}

function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const a of arrays) { out.set(a, i); i += a.length; }
  return out;
}

function base64urlToBytes(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

function bytesToBase64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
