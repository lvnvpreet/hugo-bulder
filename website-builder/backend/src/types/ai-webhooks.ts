// =====================================================
// FILE: backend/src/types/ai-webhooks.ts
// =====================================================

/**
 * Type definitions for AI Engine webhook payloads
 * These interfaces define the structure of data sent from AI Engine to Backend
 */

// Base interface for all AI Engine webhook payloads
export interface BaseAIWebhookPayload {
  project_id: string;
  generation_id: string;
  user_id?: string;
  timestamp: string;
  service: string; // Should be "ai-engine"
}

// AI Engine webhook: Generation Started
export interface AIGenerationStartedPayload extends BaseAIWebhookPayload {
  // Additional fields specific to generation started event
  workflow_type?: string;
  estimated_duration?: number;
  model_name?: string;
}

// Content structure for generated content
export interface GeneratedContent {
  pages?: Record<string, string | PageContent>;
  stats?: ContentStats;
  metadata?: ContentMetadata;
  seo?: SEOContent;
  [key: string]: any; // Allow additional properties
}

// Individual page content structure
export interface PageContent {
  title?: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
  slug?: string;
}

// Content statistics
export interface ContentStats {
  total_words: number;
  total_pages: number;
  pages_by_type?: Record<string, number>;
  word_count_by_page?: Record<string, number>;
  generation_time?: number; // in seconds
  model_used?: string;
}

// Content metadata
export interface ContentMetadata {
  generated_at: string;
  model_used: string;
  generation_time: number;
  tone?: string;
  language?: string;
  business_type?: string;
  target_audience?: string;
}

// SEO content structure
export interface SEOContent {
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  og_title?: string;
  og_description?: string;
  structured_data?: Record<string, any>;
}

// AI Engine webhook: Generation Completed
export interface AIGenerationCompletedPayload extends BaseAIWebhookPayload {
  content: GeneratedContent;
  // Additional completion-specific fields
  final_word_count?: number;
  quality_score?: number;
  processing_time?: number;
}

// AI Engine webhook: Generation Failed
export interface AIGenerationFailedPayload extends BaseAIWebhookPayload {
  error: string | ErrorDetails;
  // Additional failure-specific fields
  error_code?: string;
  retry_count?: number;
  failure_stage?: 'initialization' | 'content_generation' | 'post_processing' | 'finalization';
}

// Detailed error structure
export interface ErrorDetails {
  message: string;
  code?: string;
  stage?: string;
  details?: Record<string, any>;
  stack_trace?: string;
  timestamp: string;
}

// AI Engine webhook: Generation Progress (if implemented)
export interface AIGenerationProgressPayload extends BaseAIWebhookPayload {
  progress: number; // 0-100
  current_stage: string;
  estimated_remaining_time?: number;
  pages_completed?: number;
  current_page?: string;
}

// Union type for all possible AI webhook payloads
export type AIWebhookPayload = 
  | AIGenerationStartedPayload
  | AIGenerationCompletedPayload
  | AIGenerationFailedPayload
  | AIGenerationProgressPayload;

// Webhook response structure
export interface WebhookResponse {
  success: boolean;
  message: string;
  data?: {
    generation_id: string;
    project_id: string;
    status?: string;
    [key: string]: any;
  };
  warning?: string;
  timestamp?: string;
}

// Database update structures (for internal use)
export interface GenerationStatusUpdate {
  id: string; // generation_id
  status: 'PENDING' | 'GENERATING_CONTENT' | 'COMPLETED' | 'FAILED';
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
  generatedContent?: GeneratedContent;
  errorMessage?: string;
  totalWords?: number;
  totalPages?: number;
}

// Webhook event types
export enum AIWebhookEventType {
  GENERATION_STARTED = 'generation-started',
  GENERATION_COMPLETED = 'generation-completed',
  GENERATION_FAILED = 'generation-failed',
  GENERATION_PROGRESS = 'generation-progress',
  TEST = 'test'
}

// Test webhook payload
export interface AITestWebhookPayload {
  test: boolean;
  timestamp: string;
  ai_engine_version?: string;
  source?: string;
  [key: string]: any;
}

// Request validation schemas (for use with validation middleware)
export interface AIWebhookRequest {
  body: AIWebhookPayload | AITestWebhookPayload;
  headers: {
    'content-type': string;
    'user-agent'?: string;
    [key: string]: string | undefined;
  };
}

// Utility type for webhook handlers
export type AIWebhookHandler<T = AIWebhookPayload> = (
  payload: T
) => Promise<WebhookResponse>;

// Export all types for easy importing
// export {
//   BaseAIWebhookPayload,
//   AIGenerationStartedPayload,
//   AIGenerationCompletedPayload,
//   AIGenerationFailedPayload,
//   AIGenerationProgressPayload,
//   GeneratedContent,
//   PageContent,
//   ContentStats,
//   ContentMetadata,
//   SEOContent,
//   ErrorDetails,
//   AIWebhookPayload,
//   WebhookResponse,
//   GenerationStatusUpdate,
//   AIWebhookEventType,
//   AITestWebhookPayload,
//   AIWebhookRequest,
//   AIWebhookHandler
// };