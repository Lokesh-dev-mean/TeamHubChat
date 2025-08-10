const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
const envSuffix = process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : '';
const envPath = path.resolve(__dirname, `../.env${envSuffix}`);
dotenv.config({ path: envPath });

// Load environment-specific configuration
const env = process.env.NODE_ENV || 'development';
const config = require(`./env/${env}`);

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(
  envVar => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Export configuration
module.exports = config;

