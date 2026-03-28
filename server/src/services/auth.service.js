import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TokenModel } from '../models/token.model.js';

export class AuthService {
  constructor(db) {
    this.db = db;
    this.tokenModel = new TokenModel(db);
    this.tokenModel.init(); // Créer la table si elle n'existe pas
    
    // ✅ Configuration avec variable d'environnement
    this.accessTokenSecret = process.env.JWT_SECRET || '12345';
    this.refreshTokenSecret = process.env.JWT_SECRET || '12345';
    this.accessTokenExpiry = '7d';
    this.refreshTokenExpiry = '7d';
    
    console.log('🔑 [Auth] Secret JWT chargé:', this.accessTokenSecret);
  }

  // Générer les tokens
  generateTokens(user) {
    console.log('🔐 Génération de tokens pour:', user.email);
    console.log('🔑 Secret utilisé:', this.accessTokenSecret);
    console.log('⏰ Durée access token:', this.accessTokenExpiry);
    
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

    const refreshToken = uuidv4();
    console.log('✅ Refresh token généré:', refreshToken);
    
    this.tokenModel.saveToken(user.id, refreshToken, 7);

    return { accessToken, refreshToken };
  }

  // ✅ NOUVELLE MÉTHODE : INSCRIPTION
  async register(email, password, name) {
    console.log('📝 Tentative d\'inscription pour:', email);
    
    // Vérifier si l'utilisateur existe déjà
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      console.log('❌ Email déjà utilisé:', email);
      return null;
    }
    
    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Créer l'utilisateur
    const result = this.db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'user')
    `).run(email, passwordHash, name || null);
    
    console.log('✅ Utilisateur créé avec ID:', result.lastInsertRowid);
    
    // Générer les tokens
    const { accessToken, refreshToken } = this.generateTokens({
      id: result.lastInsertRowid,
      email,
      role: 'user'
    });
    
    return {
      user: {
        id: result.lastInsertRowid,
        email,
        name: name || null,
        role: 'user'
      },
      accessToken,
      refreshToken
    };
  }

  // ✅ CORRIGÉ : Vérifier access token ET récupérer l'utilisateur de la BDD
  verifyAccessToken(token) {
    try {
      console.log('🔐 Vérification du token avec secret:', this.accessTokenSecret);
      const decoded = jwt.verify(token, this.accessTokenSecret);
      console.log('✅ Token décodé pour ID:', decoded.id);
      
      // 🔑 RÉCUPÉRER L'UTILISATEUR DE LA BASE DE DONNÉES
      const user = this.db.prepare(`
        SELECT id, email, name, role FROM users WHERE id = ?
      `).get(decoded.id);
      
      if (!user) {
        console.log('❌ Utilisateur non trouvé en BDD pour ID:', decoded.id);
        return null;
      }
      
      console.log('✅ Utilisateur trouvé en BDD:', user.email);
      return user;
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
    
    const user = this.db.prepare(`
      SELECT id, email, password_hash, name, role FROM users WHERE email = ?
    `).get(email);
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return null;
    }
    
    console.log('✅ Utilisateur trouvé:', user.email, 'rôle:', user.role);
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('❌ Mot de passe incorrect pour:', email);
      return null;
    }
    
    console.log('✅ Mot de passe valide');
    
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

  // Logout
  logout(refreshToken) {
    console.log('🚪 Déconnexion, révocation du token:', refreshToken);
    return this.tokenModel.revokeToken(refreshToken);
  }

  // Logout de tous les appareils
  logoutAll(userId) {
    console.log('🚪 Déconnexion de tous les appareils pour user:', userId);
    return this.tokenModel.revokeAllUserTokens(userId);
  }

  // Nettoyage automatique
  cleanup() {
    const result = this.tokenModel.cleanupExpiredTokens();
    console.log('🧹 Nettoyage des tokens expirés effectué');
    return result;
  }
}