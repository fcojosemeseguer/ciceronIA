/**
 * PostgreSQL-based Debate Database Service
 * Replaces in-memory store with persistent database
 */

import pool from './database';
import { logger } from '../utils/logger';
import { DebateSession, AudioRecordingMetadata, Evaluation } from '../types';

/**
 * Database row types
 */
interface DebateRow {
  id: string;
  team_a_name: string;
  team_b_name: string;
  debate_topic: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

interface RecordingRow {
  id: string;
  debate_id: string;
  team: 'A' | 'B';
  round_type: string;
  round_order: number;
  duration: number;
  transcription?: string;
  created_at: string;
}

interface EvaluationRow {
  id: string;
  debate_id: string;
  recording_id: string;
  team: 'A' | 'B';
  round_type: string;
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  created_at: string;
}

class PostgresDebateStore {
  /**
   * Create a new debate session
   */
  async createDebate(debateId: string, config: DebateSession['config']): Promise<DebateSession> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO debates (id, team_a_name, team_b_name, debate_topic, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, team_a_name, team_b_name, debate_topic, status, created_at, updated_at`,
        [
          debateId,
          config.teamAName,
          config.teamBName,
          config.debateTopic,
          'active',
        ]
      );

      const row = result.rows[0] as DebateRow;

      return {
        id: row.id,
        config,
        recordings: [],
        evaluations: [],
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get a debate session by ID
   */
  async getDebate(debateId: string): Promise<DebateSession | undefined> {
    const client = await pool.connect();

    try {
      // Get debate
      const debateResult = await client.query(
        'SELECT * FROM debates WHERE id = $1',
        [debateId]
      );

      if (debateResult.rows.length === 0) {
        return undefined;
      }

      const debateRow = debateResult.rows[0] as DebateRow;

      // Get recordings
      const recordingsResult = await client.query(
        'SELECT * FROM recordings WHERE debate_id = $1 ORDER BY round_order',
        [debateId]
      );

      const recordings: AudioRecordingMetadata[] = recordingsResult.rows.map((row: RecordingRow) => ({
        id: row.id,
        debateId: row.debate_id,
        team: row.team,
        roundType: row.round_type,
        order: row.round_order,
        timestamp: row.created_at,
        duration: row.duration,
        fileUrl: `/api/recordings/${row.id}/audio`,
        transcription: row.transcription,
      }));

      // Get evaluations
      const evaluationsResult = await client.query(
        'SELECT * FROM evaluations WHERE debate_id = $1 ORDER BY created_at',
        [debateId]
      );

      const evaluations: Evaluation[] = evaluationsResult.rows.map((row: EvaluationRow) => ({
        id: row.id,
        debateId: row.debate_id,
        recordingId: row.recording_id,
        team: row.team,
        roundType: row.round_type,
        score: row.score,
        feedback: row.feedback,
        strengths: row.strengths,
        weaknesses: row.weaknesses,
        timestamp: row.created_at,
      }));

      return {
        id: debateRow.id,
        config: {
          teamAName: debateRow.team_a_name,
          teamBName: debateRow.team_b_name,
          debateTopic: debateRow.debate_topic,
          roundDurations: {
            introduccion: 180,
            primerRefutador: 240,
            segundoRefutador: 240,
            conclusion: 180,
          },
        },
        recordings,
        evaluations,
        status: debateRow.status,
        createdAt: debateRow.created_at,
        updatedAt: debateRow.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * List all debate sessions
   */
  async listDebates(): Promise<DebateSession[]> {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM debates ORDER BY created_at DESC');

      const debates: DebateSession[] = [];

      for (const row of result.rows) {
        const debate = await this.getDebate(row.id);
        if (debate) {
          debates.push(debate);
        }
      }

      return debates;
    } finally {
      client.release();
    }
  }

  /**
   * Add recording metadata to a debate
   */
  async addRecording(debateId: string, recording: AudioRecordingMetadata): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO recordings (id, debate_id, team, round_type, round_order, duration)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          recording.id,
          debateId,
          recording.team,
          recording.roundType,
          recording.order,
          recording.duration,
        ]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to add recording', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get all recordings for a debate
   */
  async getRecordings(debateId: string): Promise<AudioRecordingMetadata[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM recordings WHERE debate_id = $1 ORDER BY round_order',
        [debateId]
      );

      return result.rows.map((row: RecordingRow) => ({
        id: row.id,
        debateId: row.debate_id,
        team: row.team,
        roundType: row.round_type,
        order: row.round_order,
        timestamp: row.created_at,
        duration: row.duration,
        fileUrl: `/api/recordings/${row.id}/audio`,
        transcription: row.transcription,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Add evaluation to a debate
   */
  async addEvaluation(debateId: string, evaluation: Evaluation): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO evaluations (id, debate_id, recording_id, team, round_type, score, feedback, strengths, weaknesses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          evaluation.id,
          debateId,
          evaluation.recordingId,
          evaluation.team,
          evaluation.roundType,
          evaluation.score,
          evaluation.feedback,
          evaluation.strengths,
          evaluation.weaknesses,
        ]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to add evaluation', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get all evaluations for a debate
   */
  async getEvaluations(debateId: string): Promise<Evaluation[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM evaluations WHERE debate_id = $1 ORDER BY created_at',
        [debateId]
      );

      return result.rows.map((row: EvaluationRow) => ({
        id: row.id,
        debateId: row.debate_id,
        recordingId: row.recording_id,
        team: row.team,
        roundType: row.round_type,
        score: row.score,
        feedback: row.feedback,
        strengths: row.strengths,
        weaknesses: row.weaknesses,
        timestamp: row.created_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Update debate status
   */
  async updateStatus(debateId: string, status: DebateSession['status']): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'UPDATE debates SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
        [status, debateId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to update debate status', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate total scores for a debate
   */
  async calculateTotalScores(debateId: string): Promise<DebateSession['totalScore'] | undefined> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT 
           SUM(CASE WHEN team = 'A' THEN score ELSE 0 END) as team_a_score,
           SUM(CASE WHEN team = 'B' THEN score ELSE 0 END) as team_b_score
         FROM evaluations 
         WHERE debate_id = $1`,
        [debateId]
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      const teamAScore = parseInt(row.team_a_score) || 0;
      const teamBScore = parseInt(row.team_b_score) || 0;

      return {
        teamA: teamAScore,
        teamB: teamBScore,
        winner: teamAScore > teamBScore ? 'A' : teamAScore < teamBScore ? 'B' : undefined,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update recording transcription
   */
  async updateRecordingTranscription(recordingId: string, transcription: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'UPDATE recordings SET transcription = $1 WHERE id = $2 RETURNING id',
        [transcription, recordingId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to update recording transcription', error);
      return false;
    } finally {
      client.release();
    }
  }
}

export const postgresDebateStore = new PostgresDebateStore();
