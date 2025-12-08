const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FarmerTitan Admin API',
      version: '1.0.0',
      description: 'RESTful API for FarmerTitan farm management system',
      contact: {
        name: 'FarmerTitan Team',
        email: 'support@farmertitan.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.farmertitan.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details'
                }
              }
            }
          }
        },
        Farm: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Farm ID'
            },
            name: {
              type: 'string',
              description: 'Farm name'
            },
            location: {
              type: 'string',
              description: 'Farm location'
            },
            area: {
              type: 'number',
              description: 'Farm area in hectares'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Equipment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Equipment ID'
            },
            farm_id: {
              type: 'string',
              format: 'uuid',
              description: 'Associated farm ID'
            },
            make_id: {
              type: 'string',
              format: 'uuid',
              description: 'Equipment make ID'
            },
            model_id: {
              type: 'string',
              format: 'uuid',
              description: 'Equipment model ID'
            },
            type_id: {
              type: 'string',
              format: 'uuid',
              description: 'Equipment type ID'
            },
            trim_id: {
              type: 'string',
              format: 'uuid',
              description: 'Equipment trim ID'
            },
            serial_number: {
              type: 'string',
              description: 'Serial number'
            },
            year: {
              type: 'integer',
              description: 'Manufacturing year'
            },
            status: {
              type: 'string',
              enum: ['active', 'maintenance', 'inactive'],
              description: 'Equipment status'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        EquipmentMake: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Make name (e.g., John Deere, Caterpillar)'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        EquipmentModel: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            make_id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Model name'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Batch: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Batch name'
            },
            description: {
              type: 'string',
              description: 'Batch description'
            },
            quantity: {
              type: 'integer',
              description: 'Number of items in batch'
            },
            qr_codes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'QR code value'
                  },
                  status: {
                    type: 'string',
                    enum: ['active', 'used', 'expired']
                  }
                }
              }
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number'
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page'
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items'
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages'
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'The specified resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'Farms',
        description: 'Farm management operations'
      },
      {
        name: 'Equipment',
        description: 'Equipment inventory management'
      },
      {
        name: 'Catalogs',
        description: 'Equipment catalog endpoints (makes, models, types, trims)'
      },
      {
        name: 'Maintenance',
        description: 'Maintenance schedule management'
      },
      {
        name: 'QR Codes',
        description: 'QR code generation and management'
      },
      {
        name: 'Batches',
        description: 'Production batch tracking'
      },
      {
        name: 'Suppliers',
        description: 'Supplier management'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/app.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
