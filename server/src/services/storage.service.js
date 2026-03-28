import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuration AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-3',
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: process.env.S3_ENDPOINT ? true : false
});

const bucketName = process.env.S3_BUCKET_NAME || 'smart-scan-storage';

// Vérifier/créer le bucket
export const ensureBucketExists = async () => {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log(`✅ Bucket ${bucketName} existe déjà`);
  } catch (error) {
    if (error.code === 'NotFound') {
      console.log(`📦 Création du bucket ${bucketName}...`);
      try {
        await s3.createBucket({ Bucket: bucketName }).promise();
        console.log(`✅ Bucket ${bucketName} créé`);
      } catch (createError) {
        console.error('❌ Erreur création bucket:', createError);
      }
    } else {
      console.error('❌ Erreur bucket:', error);
    }
  }
};

// Configuration multer pour S3
export const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      const userFolder = `users/${req.user.id}`;
      const fullPath = `${userFolder}/${uniqueName}`;
      cb(null, fullPath);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        originalName: file.originalname,
        userId: req.user.id.toString(),
        mimetype: file.mimetype
      });
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 20
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.tiff', '.tif', 
      '.bmp', '.webp', '.pdf', '.doc', '.docx', '.txt'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  }
});

// Générer une URL signée pour téléchargement
export const generateSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: expiresIn
    };
    
    const url = await s3.getSignedUrlPromise('getObject', params);
    return { success: true, url };
  } catch (error) {
    console.error('❌ Erreur génération URL signée:', error);
    return { success: false, error: error.message };
  }
};

// Supprimer un fichier de S3
export const deleteFileFromS3 = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };
    
    await s3.deleteObject(params).promise();
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur suppression fichier:', error);
    return { success: false, error: error.message };
  }
};

// Initialisation
export const initStorage = async () => {
  await ensureBucketExists();
};

export default {
  uploadS3,
  generateSignedUrl,
  deleteFileFromS3,
  initStorage
};