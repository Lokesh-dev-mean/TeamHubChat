const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TeamHub Communication Platform API',
      version: '1.0.0',
      description: 'Multi-tenant communication platform with OAuth support',
      contact: {
        name: 'TeamHub API Support',
        email: 'support@teamhub.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            displayName: {
              type: 'string',
              description: 'User display name'
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'User avatar URL'
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Associated tenant/organization ID'
            },
            tenant: {
              $ref: '#/components/schemas/Tenant'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          }
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Tenant unique identifier'
            },
            name: {
              type: 'string',
              description: 'Organization name'
            },
            domain: {
              type: 'string',
              description: 'Organization domain'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Tenant creation timestamp'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                token: {
                  type: 'string',
                  description: 'JWT authentication token'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi
};
