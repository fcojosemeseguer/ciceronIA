import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { debateStore } from '../services/debateStore';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Evaluation } from '../types';

/**
 * Create an evaluation for a recording
 */
export const createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;
    const { recordingId, team, roundType, score, feedback, strengths, weaknesses } = req.body;

    // Validate inputs
    if (!recordingId || !team || !roundType || score === undefined) {
      throw new ApiError(
        400,
        'Missing required fields: recordingId, team, roundType, score',
        'INVALID_INPUT'
      );
    }

    if (score < 0 || score > 100) {
      throw new ApiError(400, 'Score must be between 0 and 100', 'INVALID_SCORE');
    }

    // Verify debate exists
    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    // Create evaluation
    const evaluation: Evaluation = {
      id: uuidv4(),
      debateId,
      recordingId,
      team,
      roundType,
      score,
      feedback: feedback || '',
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      timestamp: new Date().toISOString(),
    };

    // Store evaluation
    const added = debateStore.addEvaluation(debateId, evaluation);
    if (!added) {
      throw new ApiError(500, 'Failed to store evaluation', 'STORE_FAILED');
    }

    logger.info(`Evaluation created: ${evaluation.id} for debate ${debateId}`, {
      team,
      roundType,
      score,
    });

    res.status(201).json({
      success: true,
      data: evaluation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all evaluations for a debate
 */
export const getDebateEvaluations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    const evaluations = debateStore.getEvaluations(debateId);

    res.json({
      success: true,
      data: evaluations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get evaluations for a specific recording
 */
export const getRecordingEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;
    const recordingId = Array.isArray(req.params.recordingId)
      ? req.params.recordingId[0]
      : req.params.recordingId;

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    const evaluation = debate.evaluations.find((e) => e.recordingId === recordingId);
    if (!evaluation) {
      throw new ApiError(
        404,
        `Evaluation for recording ${recordingId} not found`,
        'EVALUATION_NOT_FOUND'
      );
    }

    res.json({
      success: true,
      data: evaluation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all evaluations for a team in a debate
 */
export const getTeamEvaluations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;
    const team = Array.isArray(req.params.team) ? req.params.team[0] : req.params.team;

    if (!['A', 'B'].includes(team)) {
      throw new ApiError(400, 'Team must be A or B', 'INVALID_TEAM');
    }

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    const evaluations = debate.evaluations.filter((e) => e.team === team);

    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    const averageScore = evaluations.length > 0 ? totalScore / evaluations.length : 0;

    res.json({
      success: true,
      data: {
        team,
        evaluations,
        totalScore,
        averageScore,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
