// Modèle pour stocker les refresh tokens en base de données
export class TokenModel {
  constructor(db) {
    this.db = db;
  }

  // Créer la table des tokens
  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Index pour recherche rapide
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);
  }

  // Sauvegarder un refresh token
  saveToken(userId, token, expiresInDays = 7) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const stmt = this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);
    
    return stmt.run(userId, token, expiresAt.toISOString());
  }

  // Trouver un token valide
  findValidToken(token) {
    const stmt = this.db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token = ? 
        AND revoked = FALSE 
        AND expires_at > datetime('now')
    `);
    return stmt.get(token);
  }

  // Révoquer un token (déconnexion)
  revokeToken(token) {
    const stmt = this.db.prepare(`
      UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?
    `);
    return stmt.run(token);
  }

  // Révoquer tous les tokens d'un utilisateur
  revokeAllUserTokens(userId) {
    const stmt = this.db.prepare(`
      UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?
    `);
    return stmt.run(userId);
  }

  // Nettoyer les tokens expirés
  cleanupExpiredTokens() {
    const stmt = this.db.prepare(`
      DELETE FROM refresh_tokens WHERE expires_at < datetime('now')
    `);
    return stmt.run();
  }
}