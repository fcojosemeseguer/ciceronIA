/**
 * Swagger/OpenAPI documentation configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CiceronAI Backend API',
      version: '1.0.0',
      description: 'REST API for debate competition management with AI evaluation',
      contact: {
        name: 'CiceronAI',
        url: 'https://github.com/anomalyco/opencode',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.ciceron-ai.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        DebateConfig: {
          type: 'object',
          properties: {
            teamAName: { type: 'string', example: 'Team Alpha' },
            teamBName: { type: 'string', example: 'Team Beta' },
            debateTopic: { type: 'string', example: 'Should robots have rights?' },
            roundDurations: {
              type: 'object',
              properties: {
                introduccion: { type: 'integer', example: 180 },
                primerRefutador: { type: 'integer', example: 240 },
                segundoRefutador: { type: 'integer', example: 240 },
                conclusion: { type: 'integer', example: 180 },
              },
            },
          },
          required: ['teamAName', 'teamBName', 'debateTopic'],
        },
        DebateSession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            config: { $ref: '#/components/schemas/DebateConfig' },
            recordings: {
              type: 'array',
              items: { $ref: '#/components/schemas/AudioRecording' },
            },
            evaluations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Evaluation' },
            },
            status: { type: 'string', enum: ['active', 'completed', 'archived'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            totalScore: {
              type: 'object',
              properties: {
                teamA: { type: 'integer' },
                teamB: { type: 'integer' },
                winner: { type: 'string', enum: ['A', 'B'] },
              },
            },
          },
        },
        AudioRecording: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            debateId: { type: 'string', format: 'uuid' },
            team: { type: 'string', enum: ['A', 'B'] },
            roundType: { type: 'string', example: 'Introducción' },
            order: { type: 'integer', example: 1 },
            timestamp: { type: 'string', format: 'date-time' },
            duration: { type: 'integer', description: 'Duration in seconds' },
            fileUrl: { type: 'string', format: 'uri' },
            transcription: { type: 'string' },
          },
        },
        Evaluation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            debateId: { type: 'string', format: 'uuid' },
            recordingId: { type: 'string', format: 'uuid' },
            team: { type: 'string', enum: ['A', 'B'] },
            roundType: { type: 'string' },
            score: { type: 'integer', minimum: 0, maximum: 100 },
            feedback: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Server health check',
      },
      {
        name: 'Debates',
        description: 'Debate session management',
      },
      {
        name: 'Recordings',
        description: 'Audio recording management',
      },
      {
        name: 'Evaluations',
        description: 'AI evaluation and scoring',
      },
    ],
  },
  apis: ['./src/routes/api.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
