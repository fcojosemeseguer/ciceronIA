import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { debateStore } from '../services/debateStore';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AudioRecordingMetadata } from '../types';

/**
 * Interface for multipart file from multer
 */
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * Upload an audio recording for a debate
 */
export const uploadRecording = async (req: MulterRequest, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;
    const { team, roundType, order, duration } = req.body;

    // Validate inputs
    if (!debateId || !team || !roundType || order === undefined || !duration) {
      throw new ApiError(
        400,
        'Missing required fields: debateId, team, roundType, order, duration',
        'INVALID_INPUT'
      );
    }

    if (!['A', 'B'].includes(team)) {
      throw new ApiError(400, 'Team must be A or B', 'INVALID_TEAM');
    }

    if (!req.file) {
      throw new ApiError(400, 'No audio file provided', 'NO_FILE');
    }

    // Verify debate exists
    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    // Create recording metadata
    const recordingId = uuidv4();
    const recording: AudioRecordingMetadata = {
      id: recordingId,
      debateId,
      team,
      roundType,
      order: parseInt(order),
      timestamp: new Date().toISOString(),
      duration: parseFloat(duration),
      fileUrl: `/api/recordings/${recordingId}/audio`,
    };

    // Store recording metadata
    const added = debateStore.addRecording(debateId, recording);
    if (!added) {
      throw new ApiError(500, 'Failed to store recording', 'STORE_FAILED');
    }

    logger.info(`Recording uploaded: ${recordingId} for debate ${debateId}`, {
      team,
      roundType,
      duration,
      fileName: req.file.originalname,
    });

    res.status(201).json({
      success: true,
      data: recording,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all recordings for a debate
 */
export const getDebateRecordings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debateId = Array.isArray(req.params.debateId)
      ? req.params.debateId[0]
      : req.params.debateId;

    const debate = debateStore.getDebate(debateId);
    if (!debate) {
      throw new ApiError(404, `Debate ${debateId} not found`, 'DEBATE_NOT_FOUND');
    }

    const recordings = debateStore.getRecordings(debateId);

    res.json({
      success: true,
      data: recordings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific recording metadata
 */
export const getRecording = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordingId = Array.isArray(req.params.recordingId)
      ? req.params.recordingId[0]
      : req.params.recordingId;

    // Find recording by ID across all debates
    const allDebates = debateStore.listDebates();
    const recording = allDebates
      .flatMap((d) => d.recordings)
      .find((r) => r.id === recordingId);

    if (!recording) {
      throw new ApiError(404, `Recording ${recordingId} not found`, 'RECORDING_NOT_FOUND');
    }

    res.json({
      success: true,
      data: recording,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update recording metadata (e.g., add transcription)
 */
export const updateRecording = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordingId = Array.isArray(req.params.recordingId)
      ? req.params.recordingId[0]
      : req.params.recordingId;
    const { transcription } = req.body;

    // Find recording by ID across all debates
    const allDebates = debateStore.listDebates();
    const recording = allDebates
      .flatMap((d) => d.recordings)
      .find((r) => r.id === recordingId);

    if (!recording) {
      throw new ApiError(404, `Recording ${recordingId} not found`, 'RECORDING_NOT_FOUND');
    }

    // Update transcription
    if (transcription) {
      recording.transcription = transcription;
      logger.info(`Recording ${recordingId} transcription updated`);
    }

    res.json({
      success: true,
      data: recording,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
