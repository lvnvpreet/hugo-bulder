import axios from 'axios';
import { SiteGenerationStatus } from '@prisma/client';
import { GenerationWebhook } from '../types/generation';

export interface WebhookPayload {
  event: 'started' | 'progress' | 'completed' | 'failed';
  generationId: string;
  projectId: string;
  userId: string;
  status: SiteGenerationStatus;
  progress?: number;
  currentStep?: string;
  timestamp: string;
  data?: any;
}

export class WebhookService {
  private static instance: WebhookService;
  private webhooks: Map<string, GenerationWebhook[]> = new Map();

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Register a webhook for generation events
   */
  registerWebhook(userId: string, webhook: GenerationWebhook): void {
    const userWebhooks = this.webhooks.get(userId) || [];
    userWebhooks.push(webhook);
    this.webhooks.set(userId, userWebhooks);
  }

  /**
   * Remove a webhook
   */
  removeWebhook(userId: string, webhookUrl: string): void {
    const userWebhooks = this.webhooks.get(userId);
    if (userWebhooks) {
      const filtered = userWebhooks.filter(webhook => webhook.url !== webhookUrl);
      if (filtered.length > 0) {
        this.webhooks.set(userId, filtered);
      } else {
        this.webhooks.delete(userId);
      }
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(payload: WebhookPayload): Promise<void> {
    const userWebhooks = this.webhooks.get(payload.userId);
    if (!userWebhooks || userWebhooks.length === 0) {
      return;
    }

    const promises = userWebhooks
      .filter(webhook => webhook.events.includes(payload.event))
      .map(webhook => this.deliverWebhook(webhook, payload));

    await Promise.allSettled(promises);
  }

  /**
   * Deliver webhook to specific endpoint
   */
  private async deliverWebhook(webhook: GenerationWebhook, payload: WebhookPayload): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Website-Builder-Webhook/1.0',
        'X-Webhook-Event': payload.event,
        'X-Generation-ID': payload.generationId,
        ...webhook.headers,
      };

      await axios.post(webhook.url, payload, {
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status >= 200 && status < 300,
      });

      console.log(`Webhook delivered successfully to ${webhook.url}`);
    } catch (error: any) {
      console.error(`Failed to deliver webhook to ${webhook.url}:`, error.message);
      // Could implement retry logic here
    }
  }

  /**
   * Get registered webhooks for a user
   */
  getUserWebhooks(userId: string): GenerationWebhook[] {
    return this.webhooks.get(userId) || [];
  }

  /**
   * Clear all webhooks for a user
   */
  clearUserWebhooks(userId: string): void {
    this.webhooks.delete(userId);
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(): {
    totalUsers: number;
    totalWebhooks: number;
    webhooksByEvent: Record<string, number>;
  } {
    let totalWebhooks = 0;
    const webhooksByEvent: Record<string, number> = {};

    for (const userWebhooks of this.webhooks.values()) {
      totalWebhooks += userWebhooks.length;
      
      userWebhooks.forEach(webhook => {
        webhook.events.forEach(event => {
          webhooksByEvent[event] = (webhooksByEvent[event] || 0) + 1;
        });
      });
    }

    return {
      totalUsers: this.webhooks.size,
      totalWebhooks,
      webhooksByEvent,
    };
  }
}

export const webhookService = WebhookService.getInstance();
