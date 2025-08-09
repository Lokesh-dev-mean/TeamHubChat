const { PrismaClient } = require('@prisma/client');

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient();

// Add middleware for logging if needed
// prisma.$use(async (params, next) => {
//   const before = Date.now();
//   const result = await next(params);
//   const after = Date.now();
//   console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
//   return result;
// });

// Export the prisma client instance
module.exports = prisma;
