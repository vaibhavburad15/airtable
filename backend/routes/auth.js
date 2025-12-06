const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const router = express.Router();
const AIRTABLE_CLIENT_ID = process.env.AIRTABLE_CLIENT_ID;
const AIRTABLE_CLIENT_SECRET = process.env.AIRTABLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.REDIRECT_URI || 'http:localhost:5000/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log('Client ID present?', !!AIRTABLE_CLIENT_ID);
console.log('Client Secret present?', !!AIRTABLE_CLIENT_SECRET);
console.log('Redirect URI is', REDIRECT_URI);
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}
function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}
router.get('/login', (req, res) => {
  const scope =
    'data.records:read data.records:write schema.bases:read';
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  res.cookie('airtable_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.cookie('airtable_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  const authUrl =
    `https://airtable.com/oauth2/v1/authorize` +
    `?client_id=${encodeURIComponent(AIRTABLE_CLIENT_ID)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;
  console.log('Airtable auth URL:', authUrl);
  res.redirect(authUrl);
});
router.get('/callback', async (req, res) => {
  const { code, error: oauthError, error_description, state } = req.query;
  console.log('OAuth callback query:', req.query);
  const storedState = req.cookies ? req.cookies['airtable_oauth_state'] : null;
  const codeVerifier = req.cookies ? req.cookies['airtable_code_verifier'] : null;
  if (oauthError) {
    return res.status(400).json({
      error: 'OAuth provider returned an error',
      providerError: oauthError,
      providerDescription: error_description || null,
    });
  }
  if (!state || !storedState || state !== storedState) {
    return res.status(400).json({
      error: 'Invalid OAuth state',
      receivedState: state || null,
      storedState: storedState || null,
    });
  }
  res.clearCookie('airtable_oauth_state');
  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code in callback',
      query: req.query,
    });
  }
  if (!codeVerifier) {
    return res.status(400).json({
      error: 'Missing PKCE code_verifier in cookies',
    });
  }
  res.clearCookie('airtable_code_verifier');
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('client_id', AIRTABLE_CLIENT_ID);
    params.append('code_verifier', codeVerifier);
    const basicAuth = Buffer.from(
      `${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`
    ).toString('base64');
    const tokenResponse = await axios.post(
      'https://login.airtable.com/oauth2/v1/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );
    const { access_token, refresh_token } = tokenResponse.data;
    const airtableUserId = crypto
      .createHash('sha256')
      .update(access_token)
      .digest('hex');
    const user = await User.findOneAndUpdate(
      { airtableUserId },
      {
        airtableUserId,
        profile: { airtableUserId }, 
        accessToken: access_token,
        refreshToken: refresh_token,
        loginTimestamp: new Date(),
      },
      { upsert: true, new: true }
    );
    const redirectUrl = `${FRONTEND_URL}/dashboard?userId=${user._id}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth error message:', error.message);
    if (error.response) {
      console.error('OAuth error status:', error.response.status);
      console.error(
        'OAuth error data:',
        JSON.stringify(error.response.data, null, 2)
      );
      return res
        .status(error.response.status)
        .json({ error: 'OAuth failed', details: error.response.data });
    }
    console.error(error);
    return res
      .status(500)
      .json({ error: 'OAuth failed', details: error.message });
  }
});
module.exports = router;
