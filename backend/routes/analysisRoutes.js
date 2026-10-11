const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const analysisController = require('../controllers/analysisController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    }
});

router.post('/', analysisController.createAnalysis);
router.post('/:id/upload', upload.single('project'), analysisController.uploadProject);
router.post('/:id/github', analysisController.importGitHub);
router.post('/:id/scan', analysisController.scanProject);
router.get('/:id', analysisController.getAnalysis);
router.post('/:id/requirement-analysis', analysisController.analyzeRequirement);
router.get('/:id/requirement-analysis', analysisController.getRequirementAnalysis);
router.post('/:id/impact-analysis', analysisController.analyzeImpact);
router.get('/:id/impact-analysis', analysisController.getImpactAnalysis);
router.post('/:id/implementation-plan', analysisController.generateImplementationPlan);
router.get('/:id/implementation-plan', analysisController.getImplementationPlan);
router.post('/:id/decision', analysisController.saveDeveloperDecision);
router.get('/:id/decision', analysisController.getDeveloperDecision);
router.post('/:id/ai-update', analysisController.startAIUpdate);
router.post('/:id/ai-update/reset', analysisController.resetAIUpdate);
router.get('/:id/ai-update', analysisController.getAIUpdateStatus);
router.post('/:id/validation', analysisController.runValidation);
router.get('/:id/validation', analysisController.getValidationResult);
router.get('/:id/report', analysisController.getReport);
router.get('/:id/report/download', analysisController.downloadReport);
router.get('/:id/download', analysisController.downloadProject);
router.get('/:id/guide-me', analysisController.getGuideMeProgress);
router.post('/:id/guide-me/init', analysisController.initGuideMe);
router.post('/:id/guide-me/step/:stepId/generate', analysisController.generateGuideMeProposal);
router.post('/:id/guide-me/step/:stepId/decision', analysisController.submitGuideMeDecision);
router.post('/:id/guide-me/apply', analysisController.applyGuideMeChanges);

module.exports = router;
