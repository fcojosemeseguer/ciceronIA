import { Router } from 'express';
import multer from 'multer';

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
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok' },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/debates:
 *   post:
 *     tags:
 *       - Debates
 *     summary: Create a new debate session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 $ref: '#/components/schemas/DebateConfig'
 *     responses:
 *       201:
 *         description: Debate created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid input
 */
router.post('/debates', debateController.createDebate);

/**
 * @swagger
 * /api/debates:
 *   get:
 *     tags:
 *       - Debates
 *     summary: List all debates
 *     responses:
 *       200:
 *         description: List of debates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/debates', debateController.listDebates);

/**
 * @swagger
 * /api/debates/{debateId}:
 *   get:
 *     tags:
 *       - Debates
 *     summary: Get a specific debate
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Debate details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Debate not found
 */
router.get('/debates/:debateId', debateController.getDebate);

/**
 * @swagger
 * /api/debates/{debateId}/status:
 *   patch:
 *     tags:
 *       - Debates
 *     summary: Update debate status
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/debates/:debateId/status', debateController.updateDebateStatus);

/**
 * @swagger
 * /api/debates/{debateId}/results:
 *   get:
 *     tags:
 *       - Debates
 *     summary: Get debate results and scores
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Debate results with evaluations
 */
router.get('/debates/:debateId/results', debateController.getDebateResults);

/**
 * @swagger
 * /api/debates/{debateId}/recordings:
 *   post:
 *     tags:
 *       - Recordings
 *     summary: Upload audio recording
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               team:
 *                 type: string
 *                 enum: [A, B]
 *               roundType:
 *                 type: string
 *               order:
 *                 type: integer
 *               duration:
 *                 type: number
 *     responses:
 *       201:
 *         description: Recording uploaded
 */
router.post('/debates/:debateId/recordings', upload.single('audio'), recordingController.uploadRecording);

/**
 * @swagger
 * /api/debates/{debateId}/recordings:
 *   get:
 *     tags:
 *       - Recordings
 *     summary: Get all recordings for a debate
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of recordings
 */
router.get('/debates/:debateId/recordings', recordingController.getDebateRecordings);

/**
 * @swagger
 * /api/recordings/{recordingId}:
 *   get:
 *     tags:
 *       - Recordings
 *     summary: Get recording metadata
 *     parameters:
 *       - name: recordingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Recording details
 */
router.get('/recordings/:recordingId', recordingController.getRecording);

/**
 * @swagger
 * /api/recordings/{recordingId}:
 *   patch:
 *     tags:
 *       - Recordings
 *     summary: Update recording (e.g., add transcription)
 *     parameters:
 *       - name: recordingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transcription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recording updated
 */
router.patch('/recordings/:recordingId', recordingController.updateRecording);

/**
 * @swagger
 * /api/debates/{debateId}/evaluations:
 *   post:
 *     tags:
 *       - Evaluations
 *     summary: Create evaluation
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recordingId:
 *                 type: string
 *                 format: uuid
 *               team:
 *                 type: string
 *                 enum: [A, B]
 *               roundType:
 *                 type: string
 *               score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               feedback:
 *                 type: string
 *               strengths:
 *                 type: array
 *                 items:
 *                   type: string
 *               weaknesses:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Evaluation created
 */
router.post('/debates/:debateId/evaluations', evaluationController.createEvaluation);

/**
 * @swagger
 * /api/debates/{debateId}/evaluations:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get all evaluations for a debate
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of evaluations
 */
router.get('/debates/:debateId/evaluations', evaluationController.getDebateEvaluations);

/**
 * @swagger
 * /api/debates/{debateId}/evaluations/{recordingId}:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get evaluation for specific recording
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: recordingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Evaluation details
 */
router.get('/debates/:debateId/evaluations/:recordingId', evaluationController.getRecordingEvaluation);

/**
 * @swagger
 * /api/debates/{debateId}/teams/{team}/evaluations:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get all evaluations for a team
 *     parameters:
 *       - name: debateId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: team
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [A, B]
 *     responses:
 *       200:
 *         description: Team evaluations with scores
 */
router.get('/debates/:debateId/teams/:team/evaluations', evaluationController.getTeamEvaluations);

export default router;
