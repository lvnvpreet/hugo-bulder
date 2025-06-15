import express, { Request, Response } from 'express';
import * as path from 'path';
import { HugoSiteBuilder } from '../services/HugoSiteBuilder';
import { FileManager } from '../utils/FileManager';

const router = express.Router();
const hugoBuilder = new HugoSiteBuilder();
const fileManager = new FileManager();

// Generate website
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const buildRequest = req.body;
    
    // Validate request
    if (!buildRequest.projectId || !buildRequest.generatedContent) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId and generatedContent are required'
      });
      return;
    }
    
    // Start generation
    const result = await hugoBuilder.buildWebsite(buildRequest);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      buildLog: [`Generation failed: ${error.message}`]
    });
  }
});

// Health check
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const health = await hugoBuilder.healthCheck();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download generated site
router.get('/download/:filename', (req: Request, res: Response): void => {
  try {    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'packages', filename);
    
    if (!require('fs').existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      }
    });
    
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get build status (if implemented with background processing)
router.get('/status/:buildId', async (req: Request, res: Response): Promise<void> => {
  try {
    // This would be implemented if we had background processing
    // For now, return a placeholder response
    res.json({
      buildId: req.params.buildId,
      status: 'completed',
      message: 'Build status tracking not yet implemented'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List available themes
router.get('/themes', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeInstaller = hugoBuilder['themeInstaller']; // Access private property for API
    const themes = themeInstaller.getPopularThemes();
    
    res.json({
      success: true,
      themes,
      count: themes.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
