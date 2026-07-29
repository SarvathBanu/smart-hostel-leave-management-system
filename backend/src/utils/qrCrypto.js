import crypto from 'crypto';

const CRYPTO_SECRET = process.env.JWT_SECRET || 'supersecretkeyhlmsjwt2026';

/**
 * Generate a cryptographically signed QR pass token
 * @param {string} passId - The unique pass UUID
 * @param {string} studentRegisterNumber - Student registration ID
 * @param {string} expiryTimestamp - When this QR code token expires
 * @returns {string} - The URL-safe cryptographically signed token
 */
export function generateSignedQRToken(passId, studentRegisterNumber, expiryTimestamp) {
  const data = `${passId}:${studentRegisterNumber}:${expiryTimestamp}`;
  const signature = crypto
    .createHmac('sha256', CRYPTO_SECRET)
    .update(data)
    .digest('hex');

  // Return base64 URL-safe token containing fields + signature
  const payload = {
    passId,
    registerNumber: studentRegisterNumber,
    expiry: expiryTimestamp,
    sig: signature
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Verify a signed QR pass token
 * @param {string} token - The base64url encoded token
 * @returns {object|null} - Decoded payload if signature is valid, or null
 */
export function verifySignedQRToken(token) {
  try {
    const jsonStr = Buffer.from(token, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr);

    if (!payload || !payload.passId || !payload.registerNumber || !payload.expiry || !payload.sig) {
      return null;
    }

    const expectedData = `${payload.passId}:${payload.registerNumber}:${payload.expiry}`;
    const expectedSignature = crypto
      .createHmac('sha256', CRYPTO_SECRET)
      .update(expectedData)
      .digest('hex');

    if (payload.sig !== expectedSignature) {
      return null; // Signature mismatch
    }

    return payload; // Valid signature
  } catch (err) {
    return null;
  }
}
