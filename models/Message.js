const mongoose = require('mongoose');
const crypto = require('crypto');

// Use the key from.env, or a temporary fail-safe for local testing
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);
const IV_LENGTH = 16;

const messageSchema = new mongoose.Schema({
  user: String,
  content: String, // Stores encrypted content
  conversationId: { type: String, default: 'default' }, // For "Conversation Tagging"
  tags: [], // Helper tags for future filtering
  timestamp: { type: Date, default: Date.now }
});

// --- Encryption Middleware (Pre-Save) ---
messageSchema.pre('save', function(next) {
  if (!this.isModified('content')) return next();

  try {
    // Generate a unique IV for every message (Crucial for security)
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(this.content);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Store as "IV:EncryptedData"
    this.content = iv.toString('hex') + ':' + encrypted.toString('hex');
    next();
  } catch (error) {
    next(error);
  }
});

// --- Decryption Middleware (Post-Init) ---
messageSchema.post('init', function(doc) {
  if (doc.content && doc.content.includes(':')) {
    try {
      const textParts = doc.content.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      doc.content = decrypted.toString();
    } catch (error) {
      console.error("Decryption error:", error);
      doc.content = "[Encrypted Content]"; // Fail gracefully
    }
  }
});

module.exports = mongoose.model('Message', messageSchema);