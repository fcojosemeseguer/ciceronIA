import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { debateStore } from '../services/debateStore';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AudioRecordingMetadata, DebateSession } from '../types';

/**
 * Create a new debate session
 */
export const createDebate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { config } = req.body;

    if (!config || !config.teamAName || !config.teamBName || !config.debateTopic) {
      throw new ApiError(400, 'Missing required fields: teamAName, teamBName, debateTopic', 'INVALID_INPUT');
    }

    const debateId = uuidv4();
    const debate = debateStore.createDebate(debateId, config);

    logger.info(`Debate created: ${debateId}`, {
      teamA: config.teamAName,
      teamB: config.teamBName,
    });

    res.status(201).json({
      success: true,
      data: debate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific debate session
 */
export const getDebate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: debate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all debates
 */
export const listDebates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debates = debateStore.listDebates();

    res.json({
      success: true,
      data: debates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update debate status
 */
export const updateDebateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'archived'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status value', 'INVALID_STATUS');
    }

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    const updated = debateStore.updateStatus(debateId, status);
    if (!updated) {
      throw new ApiError(500, 'Failed to update debate status', 'UPDATE_FAILED');
    }

    logger.info(`Debate ${debateId} status updated to ${status}`);

    res.json({
      success: true,
      data: debateStore.getDebate(debateId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get debate results with scores
 */
export const getDebateResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    const totalScore = debateStore.calculateTotalScores(debateId);

    res.json({
      success: true,
      data: {
        debate: {
          id: debate.id,
          config: debate.config,
          status: debate.status,
          createdAt: debate.createdAt,
        },
        evaluations: debate.evaluations,
        totalScore,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
