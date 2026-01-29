/**
 * PostgreSQL Database Connection Pool
 * Handles connection management and initialization
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ciceron_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Handle connection errors
pool.on('error', (error) => {
  logger.error('Unexpected error on idle client', error);
});

/**
 * Initialize database tables if they don't exist
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();

    try {
      logger.info('Initializing database schema...');

      // Create debates table
      await client.query(`
        CREATE TABLE IF NOT EXISTS debates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          team_a_name VARCHAR(255) NOT NULL,
          team_b_name VARCHAR(255) NOT NULL,
          debate_topic TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create recordings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS recordings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
          team CHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
          round_type VARCHAR(255) NOT NULL,
          round_order INT NOT NULL,
          duration INT NOT NULL,
          file_path VARCHAR(500),
          transcription TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create evaluations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS evaluations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
          recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
          team CHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
          round_type VARCHAR(255) NOT NULL,
          score INT NOT NULL CHECK (score >= 0 AND score <= 100),
          feedback TEXT,
          strengths TEXT[] DEFAULT '{}',
          weaknesses TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for better query performance
      await client.query(`CREATE INDEX IF NOT EXISTS idx_recordings_debate_id ON recordings(debate_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluations_debate_id ON evaluations(debate_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_evaluations_recording_id ON evaluations(recording_id);`);

      logger.info('Database schema initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to initialize database', error);
    throw error;
  }
};

export default pool;
