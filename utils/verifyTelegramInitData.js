import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN; // Your actual bot token

export function verifyTelegramInitData(initDataString) {
  const parsed = Object.fromEntries(new URLSearchParams(initDataString));
  const hash = parsed.hash;
  delete parsed.hash;

  const dataCheckString = Object.keys(parsed)
    .sort()
    .map(key => `${key}=${parsed[key]}`)
    .join('\n');

  const secret = crypto
    .createHash('sha256')
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return computedHash === hash ? parsed : null;
}
