/**
 * Database Migrations and Seeding
 */

import pool, { initializeDatabase } from './database';
import { logger } from '../utils/logger';

/**
 * Run all database migrations
 */
export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Running database migrations...');
    await initializeDatabase();
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  }
};

/**
 * Seed database with sample data (for development/testing)
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('Seeding database with sample data...');

    const client = await pool.connect();

    try {
      // Check if debates already exist
      const result = await client.query('SELECT COUNT(*) FROM debates');
      const count = parseInt(result.rows[0].count);

      if (count === 0) {
        // Insert sample debate
        const debateResult = await client.query(
          `INSERT INTO debates (team_a_name, team_b_name, debate_topic, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id, team_a_name, team_b_name, debate_topic`,
          [
            'Sample Team A',
            'Sample Team B',
            'Should artificial intelligence be regulated?',
            'completed',
          ]
        );

        const debateId = debateResult.rows[0].id;
        logger.info(`Sample debate created: ${debateId}`);

        // Insert sample recording
        const recordingResult = await client.query(
          `INSERT INTO recordings (debate_id, team, round_type, round_order, duration, transcription)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            debateId,
            'A',
            'Introducción',
            1,
            185,
            'This is a sample transcription of the introduction round.',
          ]
        );

        const recordingId = recordingResult.rows[0].id;
        logger.info(`Sample recording created: ${recordingId}`);

        // Insert sample evaluation
        await client.query(
          `INSERT INTO evaluations (debate_id, recording_id, team, round_type, score, feedback, strengths, weaknesses)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            debateId,
            recordingId,
            'A',
            'Introducción',
            85,
            'Strong introduction with clear arguments and good delivery.',
            ['Clear articulation', 'Well structured', 'Engaging delivery'],
            ['Could provide more examples', 'Pacing could be improved'],
          ]
        );

        logger.info('Sample data inserted successfully');
      } else {
        logger.info(`Database already contains ${count} debates, skipping seed`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Seeding failed', error);
    throw error;
  }
};

/**
 * Clear all data from database (for testing)
 */
export const clearDatabase = async (): Promise<void> => {
  try {
    logger.warn('Clearing all database tables...');

    const client = await pool.connect();

    try {
      // Delete in order to respect foreign key constraints
      await client.query('DELETE FROM evaluations');
      await client.query('DELETE FROM recordings');
      await client.query('DELETE FROM debates');
      logger.info('Database cleared successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to clear database', error);
    throw error;
  }
};

/**
 * Reset database (drop and recreate schema)
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    logger.warn('Resetting database schema...');

    const client = await pool.connect();

    try {
      // Drop tables if they exist
      await client.query('DROP TABLE IF EXISTS evaluations CASCADE');
      await client.query('DROP TABLE IF EXISTS recordings CASCADE');
      await client.query('DROP TABLE IF EXISTS debates CASCADE');

      logger.info('Tables dropped, reinitializing...');
    } finally {
      client.release();
    }

    // Reinitialize schema
    await initializeDatabase();
    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Reset failed', error);
    throw error;
  }
};
