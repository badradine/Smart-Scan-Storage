import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

process.env.JWT_SECRET = 'test_secret_12345';
process.env.NODE_ENV = 'test';