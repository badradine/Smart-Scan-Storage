// server/src/middleware/validation.js

export const validateDocument = (req, res, next) => {
  const { title, description, category } = req.body;

  const errors = [];

  if (title && title.length > 200) {
    errors.push('Le titre ne peut pas dépasser 200 caractères');
  }

  if (description && description.length > 1000) {
    errors.push('La description ne peut pas dépasser 1000 caractères');
  }

  const validCategories = ['general', 'invoice', 'contract', 'report', 'other'];
  if (category && !validCategories.includes(category)) {
    errors.push('Catégorie invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false, 
      errors,
      message: 'Erreur de validation'
    });
  }

  next();
};

export const validateDocumentUpdate = (req, res, next) => {
  const { title, description, category, status } = req.body;

  const errors = [];

  if (title && title.length > 200) {
    errors.push('Le titre ne peut pas dépasser 200 caractères');
  }

  if (description && description.length > 1000) {
    errors.push('La description ne peut pas dépasser 1000 caractères');
  }

  const validCategories = ['general', 'invoice', 'contract', 'report', 'other'];
  if (category && !validCategories.includes(category)) {
    errors.push('Catégorie invalide');
  }

  const validStatuses = ['processing', 'ready', 'archived'];
  if (status && !validStatuses.includes(status)) {
    errors.push('Statut invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

export const validateUser = (req, res, next) => {
  const { email, name, role } = req.body;

  const errors = [];

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Format d\'email invalide');
    }
  }

  if (name && name.length > 100) {
    errors.push('Le nom ne peut pas dépasser 100 caractères');
  }

  const validRoles = ['admin', 'manager', 'user'];
  if (role && !validRoles.includes(role)) {
    errors.push('Rôle invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};