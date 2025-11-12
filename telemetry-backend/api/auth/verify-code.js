// Verify code and issue API token
const { Pool } = require('pg');
const crypto = require('crypto');

// Parse Supabase connection string
const { URL } = require('url');
const dbUrl = new URL(process.env.POSTGRES_URL);

const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  database: dbUrl.pathname.split('/')[1],
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code } = request.body;

    // Validate inputs
    if (!email || !code) {
      return response.status(400).json({ error: 'Email and code are required' });
    }

    // Hash the provided code
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // Get stored code from database
    const result = await pool.query(
      `SELECT code_hash, expires_at, attempts, verified
       FROM gati_verification_codes
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return response.status(400).json({
        error: 'No verification code found. Please request a new code.'
      });
    }

    const record = result.rows[0];

    // Check if already verified
    if (record.verified) {
      return response.status(400).json({
        error: 'Email already verified. Please use your existing API key.'
      });
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      return response.status(400).json({
        error: 'Verification code expired. Please request a new code.'
      });
    }

    // Check attempt limit
    if (record.attempts >= 5) {
      return response.status(429).json({
        error: 'Too many failed attempts. Please request a new code.'
      });
    }

    // Verify code
    if (hashedCode !== record.code_hash) {
      // Increment attempts
      await pool.query(
        `UPDATE gati_verification_codes
         SET attempts = attempts + 1
         WHERE email = $1`,
        [email.toLowerCase()]
      );

      return response.status(400).json({
        error: 'Invalid verification code',
        attemptsRemaining: 5 - (record.attempts + 1)
      });
    }

    // Code is valid! Generate API token
    const apiToken = crypto.randomBytes(32).toString('hex');

    // Store user and token
    await pool.query(
      `INSERT INTO gati_users (email, api_token, created_at, last_active)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET api_token = $2, last_active = NOW()`,
      [email.toLowerCase(), apiToken]
    );

    // Mark code as verified
    await pool.query(
      `UPDATE gati_verification_codes
       SET verified = true
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    return response.status(200).json({
      success: true,
      message: 'Email verified successfully',
      apiToken: apiToken,
      email: email.toLowerCase()
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
