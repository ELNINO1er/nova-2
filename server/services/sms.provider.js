const isProduction = process.env.NODE_ENV === 'production';

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SMS provider failed (${res.status}) ${text}`.trim());
  }
  return res.json().catch(() => ({}));
}

async function sendViaTwilio(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!configured(sid) || !configured(token) || !configured(from)) {
    throw new Error('Twilio SMS configuration incomplete.');
  }

  const params = new URLSearchParams({ To: to, From: from, Body: message });
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Twilio SMS failed (${res.status}) ${text}`.trim());
  }
  return res.json().catch(() => ({}));
}

async function sendViaWebhook(to, message) {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!configured(url)) throw new Error('SMS_WEBHOOK_URL is required.');
  const token = process.env.SMS_WEBHOOK_TOKEN;
  const headers = configured(token) ? { Authorization: `Bearer ${token}` } : {};
  return postJson(url, { to, message, channel: 'sms', source: 'nova' }, headers);
}

export async function sendSms(to, message) {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

  if (provider === 'twilio') return sendViaTwilio(to, message);
  if (provider === 'webhook') return sendViaWebhook(to, message);

  if (isProduction) {
    throw new Error('SMS_PROVIDER must be configured in production.');
  }

  console.info(`[sms:dev] ${to} ${message}`);
  return { ok: true, provider: 'dev-console' };
}
