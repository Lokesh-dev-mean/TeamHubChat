const { PrismaClient } = require('@prisma/client');

// Create a singleton instance of PrismaClient with optimized connection settings
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Optimize connection pool
  __internal: {
    engine: {
      connectionLimit: 20,
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      }
    }
  }
});

// Add middleware for query performance monitoring
prisma.$use(async (params, next) => {
  const start = Date.now();
  try {
    const result = await next(params);
    const duration = Date.now() - start;
    
    // Log slow queries (over 100ms)
    if (duration > 100) {
      console.warn(`🐌 Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
    }
    
    // Log very slow queries (over 1000ms)
    if (duration > 1000) {
      console.error(`🚨 Very slow query: ${params.model}.${params.action} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query failed after ${duration}ms: ${params.model}.${params.action}`, error);
    throw error;
  }
});

// Export the prisma client instance
module.exports = { prisma };
