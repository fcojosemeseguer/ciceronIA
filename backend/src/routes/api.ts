import { Router } from 'express';
import multer from 'multer';
import path from 'path';

import * as debateController from '../controllers/debateController';
import * as recordingController from '../controllers/recordingController';
import * as evaluationController from '../controllers/evaluationController';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for now, can be changed to disk
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
  fileFilter: (_req, file, cb) => {
    // Accept audio files
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok' },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Debate endpoints
 */
router.post('/debates', debateController.createDebate);
router.get('/debates', debateController.listDebates);
router.get('/debates/:debateId', debateController.getDebate);
router.patch('/debates/:debateId/status', debateController.updateDebateStatus);
router.get('/debates/:debateId/results', debateController.getDebateResults);

/**
 * Recording endpoints
 */
router.post('/debates/:debateId/recordings', upload.single('audio'), recordingController.uploadRecording);
router.get('/debates/:debateId/recordings', recordingController.getDebateRecordings);
router.get('/recordings/:recordingId', recordingController.getRecording);
router.patch('/recordings/:recordingId', recordingController.updateRecording);

/**
 * Evaluation endpoints
 */
router.post('/debates/:debateId/evaluations', evaluationController.createEvaluation);
router.get('/debates/:debateId/evaluations', evaluationController.getDebateEvaluations);
router.get('/debates/:debateId/evaluations/:recordingId', evaluationController.getRecordingEvaluation);
router.get('/debates/:debateId/teams/:team/evaluations', evaluationController.getTeamEvaluations);

export default router;
