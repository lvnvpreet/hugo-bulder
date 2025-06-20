// =====================================================
// FILE: backend/src/routes/ai-webhooks.ts (NEW FILE)
// =====================================================

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Middleware to log all AI Engine webhook calls
router.use((req, res, next) => {
  console.log(`🤖 AI Engine webhook: ${req.method} ${req.path}`, {
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });
  next();
});

// Test endpoint for communication verification
router.post('/ai-engine/test', asyncHandler(async (req: Request, res: Response) => {
  console.log('🧪 AI Engine communication test successful');
  
  res.json({ 
    success: true, 
    message: 'Backend received AI Engine test webhook',
    timestamp: new Date().toISOString(),
    received_data: req.body,
    backend_status: 'healthy'
  });
}));

// AI Engine webhook: Generation Started
router.post('/ai-engine/generation-started', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, generation_id, user_id, timestamp, service } = req.body;
  
  if (!project_id || !generation_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: project_id and generation_id'
    });
  }

  console.log(`🚀 Generation started: ${generation_id} for project ${project_id}`);
  
  try {
    // Update generation status in database
    const updatedGeneration = await prisma.siteGeneration.update({
      where: { id: generation_id },
      data: {
        status: 'GENERATING_CONTENT',
        startedAt: timestamp ? new Date(timestamp) : new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`📊 Generation status updated to GENERATING_CONTENT for ${generation_id}`);
    
    res.json({ 
      success: true, 
      message: 'Generation started notification received and processed',
      data: {
        generation_id,
        project_id,
        status: updatedGeneration.status,
        started_at: updatedGeneration.startedAt
      }
    });
  } catch (error) {
    console.error('❌ Failed to update generation status:', error);
    
    // Still respond with success to avoid AI Engine retries, but log the error
    res.json({
      success: true,
      message: 'Generation started notification received (database update failed)',
      warning: 'Database update failed but notification acknowledged',
      generation_id,
      project_id
    });
  }
}));

// AI Engine webhook: Generation Completed
router.post('/ai-engine/generation-completed', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, generation_id, content, user_id, timestamp, service } = req.body;
  
  if (!project_id || !generation_id || !content) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: project_id, generation_id, and content'
    });
  }

  console.log(`✅ Generation completed: ${generation_id} for project ${project_id}`);
  console.log(`📊 Generated content summary:`, {
    pages: content?.pages ? Object.keys(content.pages).length : 0,
    total_words: content?.stats?.total_words || 0,
    content_keys: Object.keys(content || {})
  });
  
  try {
    // Update generation status and store content
    const updatedGeneration = await prisma.siteGeneration.update({
      where: { id: generation_id },
      data: {
        status: 'COMPLETED',
        completedAt: timestamp ? new Date(timestamp) : new Date(),
        updatedAt: new Date(),
        generatedContent: content, // Store the AI-generated content
        // If you have separate fields for content statistics
        ...(content?.stats && {
          totalWords: content.stats.total_words,
          totalPages: content?.pages ? Object.keys(content.pages).length : 0
        })
      }
    });

    console.log(`🎉 Generation completed and saved: ${generation_id}`);
    
    // Here you can trigger additional actions like:
    // - Notifying user via email
    // - Triggering Hugo site generation
    // - Updating project status
    // - Firing user webhooks
    
    res.json({ 
      success: true, 
      message: 'Generation completed notification received and processed',
      data: {
        generation_id,
        project_id,
        status: updatedGeneration.status,
        completed_at: updatedGeneration.completedAt,
        content_summary: {
          pages: content?.pages ? Object.keys(content.pages).length : 0,
          total_words: content?.stats?.total_words || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to update generation completion:', error);
    
    // Still respond with success to avoid AI Engine retries
    res.json({
      success: true,
      message: 'Generation completed notification received (database update failed)',
      warning: 'Database update failed but notification acknowledged',
      generation_id,
      project_id
    });
  }
}));

// AI Engine webhook: Generation Failed
router.post('/ai-engine/generation-failed', asyncHandler(async (req: Request, res: Response) => {
  const { project_id, generation_id, error, user_id, timestamp, service } = req.body;
  
  if (!project_id || !generation_id || !error) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: project_id, generation_id, and error'
    });
  }

  console.log(`❌ Generation failed: ${generation_id} for project ${project_id}`);
  console.log(`🔍 Error details:`, error);
  
  try {
    // Update generation status with error
    const updatedGeneration = await prisma.siteGeneration.update({
      where: { id: generation_id },
      data: {
        status: 'FAILED',
        completedAt: timestamp ? new Date(timestamp) : new Date(),
        updatedAt: new Date(),
        errorMessage: typeof error === 'string' ? error : JSON.stringify(error)
      }
    });

    console.log(`📝 Generation failure recorded: ${generation_id}`);
    
    res.json({ 
      success: true, 
      message: 'Generation failed notification received and processed',
      data: {
        generation_id,
        project_id,
        status: updatedGeneration.status,
        completed_at: updatedGeneration.completedAt,
        error_message: updatedGeneration.errorMessage
      }
    });
  } catch (dbError) {
    console.error('❌ Failed to update generation failure:', dbError);
    
    // Still respond with success to avoid AI Engine retries
    res.json({
      success: true,
      message: 'Generation failed notification received (database update failed)',
      warning: 'Database update failed but notification acknowledged',
      generation_id,
      project_id,
      original_error: error
    });
  }
}));

// Health check for AI Engine webhook endpoints
router.get('/ai-engine/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AI Engine webhook endpoints are healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/webhooks/ai-engine/test',
      'POST /api/webhooks/ai-engine/generation-started',
      'POST /api/webhooks/ai-engine/generation-completed', 
      'POST /api/webhooks/ai-engine/generation-failed'
    ]
  });
});

export default router;