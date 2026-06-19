/**
 * TẠM THỜI — harness test OAuth thủ công. Xóa sau khi test xong.
 * Chạy: node oauth-harness.js  → mở http://localhost:5050
 */
const express = require('express');
const env = require('./config/env');
const authService = require('./services/auth/auth.service');

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;
const redirectUri = (p) => `${BASE}/oauth/${p}/callback`;

const AUTHORIZE = {
    google: (state) =>
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
            client_id: env.oauth.google.clientId,
            redirect_uri: redirectUri('google'),
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'online',
            prompt: 'select_account',
            state,
        }),
    github: (state) =>
        'https://github.com/login/oauth/authorize?' +
        new URLSearchParams({
            client_id: env.oauth.github.clientId,
            redirect_uri: redirectUri('github'),
            scope: 'read:user user:email',
            allow_signup: 'true',
            state,
        }),
    facebook: (state) =>
        'https://www.facebook.com/v19.0/dialog/oauth?' +
        new URLSearchParams({
            client_id: env.oauth.facebook.clientId,
            redirect_uri: redirectUri('facebook'),
            response_type: 'code',
            scope: 'email,public_profile',
            state,
        }),
};

const app = express();

app.get('/', (req, res) => {
    res.send(
        `<h2>OAuth test harness</h2><ul>` +
        `<li><a href="/start/google">Test Google</a></li>` +
        `<li><a href="/start/github">Test GitHub</a></li>` +
        `<li><a href="/start/facebook">Test Facebook</a></li>` +
        `</ul>`,
    );
});

app.get('/start/:provider', (req, res) => {
    const p = req.params.provider;
    if (!AUTHORIZE[p]) return res.status(400).send('provider không hợp lệ');
    const state = Math.random().toString(36).slice(2);
    return res.redirect(AUTHORIZE[p](state));
});

app.get('/oauth/:provider/callback', async (req, res) => {
    const p = req.params.provider;
    const { code, error, error_description: errDesc } = req.query;
    if (error) {
        console.log(`[HARNESS] ${p} callback error: ${error} ${errDesc || ''}`);
        return res.status(400).send(`Provider trả lỗi: ${error} ${errDesc || ''}`);
    }
    if (!code) return res.status(400).send('Thiếu code');
    console.log(`[HARNESS] ${p} nhận code (len ${String(code).length}), đang đổi token...`);
    try {
        const result = await authService.loginWithOAuth({
            provider: p,
            code: String(code),
            redirectUri: redirectUri(p),
            ipAddress: '127.0.0.1',
            userAgent: 'oauth-harness',
        });
        console.log(
            `[HARNESS] ${p} OK -> userId=${result.user.userId} email=${result.user.email} ` +
            `username=${result.user.username} isNewUser=${result.isNewUser}`,
        );
        return res.send(
            `<h3>${p} thành công ✅</h3><pre>${JSON.stringify(
                {
                    user: result.user,
                    isNewUser: result.isNewUser,
                    tokenType: result.tokens.tokenType,
                    hasAccessToken: !!result.tokens.accessToken,
                    hasRefreshToken: !!result.tokens.refreshToken,
                },
                null,
                2,
            )}</pre>`,
        );
    } catch (e) {
        console.log(`[HARNESS] ${p} FAIL status=${e.status} code=${e.code} msg=${e.message}`);
        return res
            .status(e.status || 500)
            .send(`<h3>${p} lỗi ❌</h3><pre>status=${e.status}\ncode=${e.code}\n${e.message}</pre>`);
    }
});

app.listen(PORT, () => console.log(`[HARNESS] listening — mở trình duyệt tại ${BASE}`));