/**
 * Database configuration file
 * 
 * This file contains database connection settings and configuration
 * for different environments (development, test, production).
 */

module.exports = {
  development: {
    url: 'mongodb://localhost:27017/teamhub',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  test: {
    url: 'mongodb://localhost:27017/teamhub_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  production: {
    url: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  }
};
