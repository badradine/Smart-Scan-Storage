export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  // POST /api/auth/register
  register = async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      const result = await this.authService.register(email, password, name);
      
      if (!result) {
        return res.status(400).json({
          success: false,
          error: 'Erreur lors de l\'inscription'
        });
      }

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  };

  // POST /api/auth/login
  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      const result = await this.authService.login(email, password);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  };

  // POST /api/auth/refresh
  refresh = (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token requis'
        });
      }

      const result = this.authService.refreshAccessToken(refreshToken);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token invalide ou expiré'
        });
      }

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  };

  // POST /api/auth/logout
  logout = (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        this.authService.logout(refreshToken);
      }

      res.json({
        success: true,
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  };

  // POST /api/auth/logout-all
  logoutAll = (req, res) => {
    try {
      const userId = req.user.id;
      this.authService.logoutAll(userId);
      
      res.json({
        success: true,
        message: 'Déconnecté de tous les appareils'
      });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  };

  // GET /api/auth/me
  me = (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  };
}