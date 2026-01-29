import { DebateSession, AudioRecordingMetadata, Evaluation } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory database service
 * This will be replaced with a real database (PostgreSQL) in the next phase
 */
class DebateStore {
  private debates: Map<string, DebateSession> = new Map();

  /**
   * Create a new debate session
   */
  createDebate(debateId: string, config: DebateSession['config']): DebateSession {
    const debate: DebateSession = {
      id: debateId,
      config,
      recordings: [],
      evaluations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };
    this.debates.set(debateId, debate);
    return debate;
  }

  /**
   * Get a debate session by ID
   */
  getDebate(debateId: string): DebateSession | undefined {
    return this.debates.get(debateId);
  }

  /**
   * List all debate sessions
   */
  listDebates(): DebateSession[] {
    return Array.from(this.debates.values());
  }

  /**
   * Add recording metadata to a debate
   */
  addRecording(debateId: string, recording: AudioRecordingMetadata): boolean {
    const debate = this.debates.get(debateId);
    if (!debate) return false;

    debate.recordings.push(recording);
    debate.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Get all recordings for a debate
   */
  getRecordings(debateId: string): AudioRecordingMetadata[] {
    const debate = this.debates.get(debateId);
    return debate?.recordings || [];
  }

  /**
   * Add evaluation to a debate
   */
  addEvaluation(debateId: string, evaluation: Evaluation): boolean {
    const debate = this.debates.get(debateId);
    if (!debate) return false;

    debate.evaluations.push(evaluation);
    debate.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Get all evaluations for a debate
   */
  getEvaluations(debateId: string): Evaluation[] {
    const debate = this.debates.get(debateId);
    return debate?.evaluations || [];
  }

  /**
   * Update debate status
   */
  updateStatus(debateId: string, status: DebateSession['status']): boolean {
    const debate = this.debates.get(debateId);
    if (!debate) return false;

    debate.status = status;
    debate.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Calculate total scores for a debate
   */
  calculateTotalScores(debateId: string): DebateSession['totalScore'] | undefined {
    const debate = this.debates.get(debateId);
    if (!debate) return undefined;

    const teamAScore = debate.evaluations
      .filter((e) => e.team === 'A')
      .reduce((sum, e) => sum + e.score, 0);

    const teamBScore = debate.evaluations
      .filter((e) => e.team === 'B')
      .reduce((sum, e) => sum + e.score, 0);

    const winner: 'A' | 'B' | undefined =
      teamAScore > teamBScore ? 'A' : teamAScore < teamBScore ? 'B' : undefined;

    return {
      teamA: teamAScore,
      teamB: teamBScore,
      winner,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.debates.clear();
  }
}

export const debateStore = new DebateStore();
