const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { OAUTH_PROVIDER } = require('../../config/authConstants');

/**
 * Adapter cho OAuth 2.0 (Authorization Code). Mỗi provider có token/userinfo endpoint
 * và profile shape khác nhau; module này chuẩn hóa tất cả về:
 *   { provider, providerUserId, email, emailVerified, fullName, avatarUrl }
 *
 * Dùng global `fetch` (Node >= 18) — không thêm dependency.
 */

const SUPPORTED = {
  google: OAUTH_PROVIDER.GOOGLE,
  facebook: OAUTH_PROVIDER.FACEBOOK,
  github: OAUTH_PROVIDER.GITHUB,
};

/** Provider param (lowercase) có được hỗ trợ không. */
function isSupportedProvider(provider) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED, provider);
}

/** Lấy { clientId, clientSecret } từ env, ném 500 nếu chưa cấu hình. */
function getCredentials(provider) {
  const creds = env.oauth[provider];
  if (!creds || !creds.clientId || !creds.clientSecret) {
    throw new AppError('OAUTH_NOT_CONFIGURED', `OAuth provider "${provider}" chưa được cấu hình.`, 500);
  }
  return creds;
}

/** fetch JSON với timeout; lỗi mạng/parse → 502. */
async function fetchJson(url, options = {}, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new AppError('OAUTH_PROVIDER_ERROR', 'Phản hồi không hợp lệ từ nhà cung cấp.', 502);
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('OAUTH_PROVIDER_ERROR', 'Không thể kết nối tới nhà cung cấp đăng nhập.', 502);
  } finally {
    clearTimeout(timer);
  }
}

/** code sai/hết hạn khi đổi token → 400; lỗi khác từ provider → 502. */
function assertTokenResponse({ ok, body }) {
  if (!ok || !body.access_token) {
    // invalid_grant = code đã dùng/hết hạn/redirectUri sai → lỗi phía client.
    if (body && body.error === 'invalid_grant') {
      throw new AppError('OAUTH_INVALID_CODE', 'Mã uỷ quyền không hợp lệ hoặc đã hết hạn.', 400);
    }
    throw new AppError('OAUTH_PROVIDER_ERROR', 'Không lấy được access token từ nhà cung cấp.', 502);
  }
}

// ---- Google ----
async function googleProfile({ code, redirectUri }) {
  const { clientId, clientSecret } = getCredentials('google');
  const tokenRes = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  assertTokenResponse(tokenRes);

  const { ok, body: p } = await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.body.access_token}` },
  });
  if (!ok || !p.sub) {
    throw new AppError('OAUTH_PROVIDER_ERROR', 'Không lấy được hồ sơ Google.', 502);
  }
  return {
    provider: OAUTH_PROVIDER.GOOGLE,
    providerUserId: String(p.sub),
    email: p.email || null,
    emailVerified: p.email_verified === true,
    fullName: p.name || null,
    avatarUrl: p.picture || null,
  };
}

// ---- Facebook ----
async function facebookProfile({ code, redirectUri }) {
  const { clientId, clientSecret } = getCredentials('facebook');
  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  })}`;
  const tokenRes = await fetchJson(tokenUrl);
  assertTokenResponse(tokenRes);

  const profileUrl = `https://graph.facebook.com/me?${new URLSearchParams({
    fields: 'id,name,email,picture',
    access_token: tokenRes.body.access_token,
  })}`;
  const { ok, body: p } = await fetchJson(profileUrl);
  if (!ok || !p.id) {
    throw new AppError('OAUTH_PROVIDER_ERROR', 'Không lấy được hồ sơ Facebook.', 502);
  }
  return {
    provider: OAUTH_PROVIDER.FACEBOOK,
    providerUserId: String(p.id),
    email: p.email || null,
    // Facebook không trả cờ verified; coi email do Facebook cấp là đã xác thực.
    emailVerified: Boolean(p.email),
    fullName: p.name || null,
    avatarUrl: (p.picture && p.picture.data && p.picture.data.url) || null,
  };
}

// ---- GitHub ----
async function githubProfile({ code, redirectUri }) {
  const { clientId, clientSecret } = getCredentials('github');
  const tokenRes = await fetchJson('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  assertTokenResponse(tokenRes);
  const accessToken = tokenRes.body.access_token;
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'BookingRoom',
  };

  const userRes = await fetchJson('https://api.github.com/user', { headers: authHeaders });
  if (!userRes.ok || !userRes.body.id) {
    throw new AppError('OAUTH_PROVIDER_ERROR', 'Không lấy được hồ sơ GitHub.', 502);
  }
  const u = userRes.body;

  // Email GitHub có thể bị ẩn → lấy email primary + verified qua /user/emails.
  let email = u.email || null;
  let emailVerified = false;
  const emailsRes = await fetchJson('https://api.github.com/user/emails', { headers: authHeaders });
  if (emailsRes.ok && Array.isArray(emailsRes.body)) {
    const primary = emailsRes.body.find((e) => e.primary && e.verified)
      || emailsRes.body.find((e) => e.verified);
    if (primary) {
      email = primary.email;
      emailVerified = true;
    }
  }

  return {
    provider: OAUTH_PROVIDER.GITHUB,
    providerUserId: String(u.id),
    email,
    emailVerified,
    fullName: u.name || u.login || null,
    avatarUrl: u.avatar_url || null,
  };
}

const HANDLERS = {
  google: googleProfile,
  facebook: facebookProfile,
  github: githubProfile,
};

/**
 * Đổi authorization code lấy hồ sơ user đã chuẩn hóa.
 *
 * @param {{ provider: string, code: string, redirectUri: string }} params provider = lowercase
 * @returns {Promise<{ provider, providerUserId, email, emailVerified, fullName, avatarUrl }>}
 */
async function getProfile({ provider, code, redirectUri }) {
  if (!isSupportedProvider(provider)) {
    throw new AppError('OAUTH_PROVIDER_INVALID', 'Nhà cung cấp đăng nhập không được hỗ trợ.', 400);
  }
  return HANDLERS[provider]({ code, redirectUri });
}

module.exports = {
  isSupportedProvider,
  getProfile,
};
