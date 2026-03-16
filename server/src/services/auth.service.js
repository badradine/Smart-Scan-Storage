import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TokenModel } from '../models/token.model.js';

export class AuthService {
  constructor(db) {
    this.db = db;
    this.tokenModel = new TokenModel(db);
    this.tokenModel.init(); // Créer la table si elle n'existe pas
    
    // Configuration
    this.accessTokenSecret = 'ma-cle-secrete-simple-123';
    this.refreshTokenSecret = process.env.REFRESH_SECRET || 'refresh-secret-key';
    this.accessTokenExpiry = '15m'; // 15 minutes (court)
    this.refreshTokenExpiry = '7d';  // 7 jours (long)
  }

  // Générer les tokens
  generateTokens(user) {
    console.log('🔐 Génération de tokens pour:', user.email);
    console.log('🔑 Secret utilisé:', this.accessTokenSecret);
    
    // Access token (court)
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role 
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    console.log('✅ Access token généré:', accessToken.substring(0, 30) + '...');

    // Refresh token (long) - avec un ID unique
    const refreshToken = uuidv4();
    console.log('✅ Refresh token généré:', refreshToken);
    
    // Sauvegarder le refresh token en base
    this.tokenModel.saveToken(user.id, refreshToken, 7);

    return { accessToken, refreshToken };
  }

  // Vérifier access token
  verifyAccessToken(token) {
    try {
      console.log('🔐 Vérification du token avec secret:', this.accessTokenSecret);
      const decoded = jwt.verify(token, this.accessTokenSecret);
      console.log('✅ Token vérifié pour:', decoded.email);
      console.log('📝 Données du token:', decoded);
      return decoded;
    } catch (error) {
      console.log('❌ Erreur JWT verify:', error.message);
      return null;
    }
  }

  // Vérifier refresh token
  verifyRefreshToken(token) {
    console.log('🔄 Vérification du refresh token:', token);
    const tokenData = this.tokenModel.findValidToken(token);
    
    if (!tokenData) {
      console.log('❌ Refresh token invalide ou expiré');
      return null;
    }
    
    console.log('✅ Refresh token valide, user_id:', tokenData.user_id);
    
    // Récupérer l'utilisateur
    const user = this.db.prepare(`
      SELECT id, email, name, role FROM users WHERE id = ?
    `).get(tokenData.user_id);
    
    console.log('👤 Utilisateur associé:', user ? user.email : 'Non trouvé');
    return user;
  }

  // Rafraîchir l'access token
  refreshAccessToken(refreshToken) {
    console.log('🔄 Tentative de refresh avec token:', refreshToken);
    const user = this.verifyRefreshToken(refreshToken);
    
    if (!user) {
      console.log('❌ Refresh échoué - utilisateur non trouvé');
      return null;
    }
    
    // Générer un nouvel access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );
    
    console.log('✅ Nouvel access token généré pour:', user.email);
    return { accessToken, user };
  }

  // Login
  async login(email, password) {
    console.log('🔑 Tentative de login pour:', email);
    
    // Chercher l'utilisateur
    const user = this.db.prepare(`
      SELECT id, email, password_hash, name, role FROM users WHERE email = ?
    `).get(email);
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return null;
    }
    
    console.log('✅ Utilisateur trouvé:', user.email, 'rôle:', user.role);
    
    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('❌ Mot de passe incorrect pour:', email);
      return null;
    }
    
    console.log('✅ Mot de passe valide');
    
    // Générer les tokens
    const { accessToken, refreshToken } = this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  // Logout (révoquer le refresh token)
  logout(refreshToken) {
    console.log('🚪 Déconnexion, révocation du token:', refreshToken);
    return this.tokenModel.revokeToken(refreshToken);
  }

  // Logout de tous les appareils
  logoutAll(userId) {
    console.log('🚪 Déconnexion de tous les appareils pour user:', userId);
    return this.tokenModel.revokeAllUserTokens(userId);
  }

  // Nettoyage automatique (à appeler périodiquement)
  cleanup() {
    const result = this.tokenModel.cleanupExpiredTokens();
    console.log('🧹 Nettoyage des tokens expirés effectué');
    return result;
  }
}