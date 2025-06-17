import { PrismaClient } from '@prisma/client';
import { createNotFoundError, createAuthorizationError, createValidationError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Types for better type safety
interface ProjectData {
  name: string;
  description?: string;
  wizardData?: any;
  type?: string;
  websiteType?: string;
}

interface ProjectFilters {
  generationStatus?: string;
  limit?: number;
  offset?: number;
}

interface ProjectAnalytics {
  createdAt: Date;
  lastModified: Date;
  stepsCompleted: number;
  timeSpent: number;
  generationAttempts: number;
}

// Step name mapping
const STEP_NAMES = {
  1: 'website-type',
  2: 'business-category', 
  3: 'services',
  4: 'website-structure',
  5: 'hugo-theme',
  6: 'business-info',
  7: 'contact-info',
  8: 'content-media',
  9: 'customization',
  10: 'review'
} as const;

export class ProjectService {  // Project CRUD operations
  async createProject(userId: string, projectData: ProjectData): Promise<any> {
    try {
      // Check user's project limit
      let user = await prisma.user.findUnique({
        where: { id: userId },
        select: { projectsLimit: true, projectsUsed: true }
      });

      // If user doesn't exist (development mode), create a temporary demo user
      if (!user) {
        if (process.env.NODE_ENV === 'development' && userId.startsWith('demo-user-')) {
          user = await prisma.user.create({
            data: {
              id: userId,
              email: `${userId}@demo.local`,
              password: 'demo-password-hash',
              name: 'Demo User',
              plan: 'free',
              projectsLimit: 10,
              projectsUsed: 0,
            },
            select: { projectsLimit: true, projectsUsed: true }
          });
        } else {
          throw createNotFoundError('User');
        }
      }

      if (user.projectsUsed >= user.projectsLimit) {
        throw createValidationError('Project limit reached. Please upgrade your plan or delete some projects.');
      }

      // Generate unique slug
      const slug = await this.generateProjectSlug(projectData.name, userId);      // Create project
      const project = await prisma.project.create({
        data: {
          name: projectData.name,
          description: projectData.description,
          slug,
          generationStatus: 'DRAFT',
          userId,
          wizardData: projectData.wizardData || {},
          currentStep: 1,
          // If wizardData is provided and has all required steps, mark as completed
          isCompleted: projectData.wizardData && this.isWizardDataComplete(projectData.wizardData),
        },
        include: {
          wizardSteps: true,
          siteGenerations: {
            orderBy: { startedAt: 'desc' },
            take: 1
          }
        }
      });

      // Update user's project count
      await prisma.user.update({
        where: { id: userId },
        data: { projectsUsed: { increment: 1 } }
      });

      return project;
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async getProjects(
    userId: string,
    filters?: ProjectFilters
  ): Promise<{
    projects: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const limit = Math.min(filters?.limit || 20, 100);
      const offset = filters?.offset || 0;

      const where: any = { userId };

      if (filters?.generationStatus) {
        where.generationStatus = filters.generationStatus;
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            wizardSteps: {
              select: {
                stepNumber: true,
                isCompleted: true
              }
            },
            siteGenerations: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: {
                status: true,
                startedAt: true,
                siteUrl: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.project.count({ where })
      ]);

      // Calculate completion stats for each project
      const projectsWithStats = projects.map((project: any) => ({
        ...project,
        completedSteps: project.wizardSteps?.filter((step: any) => step.isCompleted).length || 0,
        totalSteps: 10, // Fixed number of wizard steps
        lastGeneration: project.siteGenerations?.[0] || null,
        wizardSteps: undefined, // Remove from response
        siteGenerations: undefined // Remove from response
      }));

      return {
        projects: projectsWithStats,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Get projects error:', error);
      throw error;
    }
  }

  async getProject(
    projectId: string,
    userId: string
  ): Promise<any | null> {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId
        },
        include: {
          wizardSteps: {
            orderBy: { stepNumber: 'asc' }
          },
          siteGenerations: {
            orderBy: { startedAt: 'desc' },
            take: 5
          }
        }
      });

      if (!project) {
        return null;
      }

      return project;
    } catch (error) {
      console.error('Get project error:', error);
      throw error;
    }
  }

  async updateProject(
    projectId: string,
    userId: string,
    updates: Partial<ProjectData>
  ): Promise<any> {
    try {
      // Verify ownership
      const existingProject = await this.validateProjectOwnership(projectId, userId);
      if (!existingProject) {
        throw createNotFoundError('Project');
      }

      const project = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          wizardSteps: true,
          siteGenerations: {
            orderBy: { startedAt: 'desc' },
            take: 1
          }
        }
      });

      return project;
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  async deleteProject(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Verify ownership
      const existingProject = await this.validateProjectOwnership(projectId, userId);
      if (!existingProject) {
        throw createNotFoundError('Project');
      }

      // Delete all related data in transaction
      await prisma.$transaction(async (tx) => {
        // Delete wizard steps
        await tx.wizardStep.deleteMany({
          where: { projectId }
        });

        // Delete generated content
        await tx.generatedContent.deleteMany({
          where: { projectId }
        });

        // Delete site generations
        await tx.siteGeneration.deleteMany({
          where: { projectId }
        });

        // Delete assets
        await tx.assetUpload.deleteMany({
          where: { projectId }
        });

        // Delete project
        await tx.project.delete({
          where: { id: projectId }
        });

        // Update user's project count
        await tx.user.update({
          where: { id: userId },
          data: { projectsUsed: { decrement: 1 } }
        });
      });

      return true;
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  // Wizard step management
  async saveWizardStep(
    projectId: string,
    userId: string,
    stepNumber: number,
    stepData: any
  ): Promise<any> {
    try {
      // Verify ownership
      const project = await this.validateProjectOwnership(projectId, userId);
      if (!project) {
        throw createNotFoundError('Project');
      }
      if (stepNumber < 1 || stepNumber > 10) {
        throw createValidationError('Step number must be between 1 and 10');
      }
      const stepName = STEP_NAMES[stepNumber as keyof typeof STEP_NAMES];
      const sanitizedData = this.sanitizeWizardData(stepData);
      const wizardStep = await prisma.wizardStep.upsert({
        where: {
          projectId_stepNumber: {
            projectId,
            stepNumber
          }
        },
        update: {
          stepData: sanitizedData,
          isCompleted: true,
          updatedAt: new Date(),
        },
        create: {
          projectId,
          stepNumber,
          stepName,
          stepData: sanitizedData,
          isCompleted: true,
        }
      });
      const completedSteps = await prisma.wizardStep.count({
        where: { projectId, isCompleted: true }
      });
      const currentWizardData = project.wizardData as any || {};
      currentWizardData[`step${stepNumber}`] = sanitizedData;
      await prisma.project.update({
        where: { id: projectId },
        data: {
          currentStep: Math.max(project.currentStep, stepNumber + 1),
          wizardData: currentWizardData,
          isCompleted: completedSteps >= 10,
          updatedAt: new Date(),
        }
      });
      return wizardStep;
    } catch (error) {
      console.error('Save wizard step error:', error);
      throw error;
    }
  }

  async getWizardData(
    projectId: string,
    userId: string
  ): Promise<{
    wizardData: any;
    completedSteps: number[];
    currentStep: number;
  }> {
    try {
      const project = await this.validateProjectOwnership(projectId, userId);
      if (!project) {
        throw createNotFoundError('Project');
      }
      const wizardSteps = await prisma.wizardStep.findMany({
        where: { projectId },
        orderBy: { stepNumber: 'asc' }
      });
      const completedSteps = wizardSteps
        .filter((step: any) => step.isCompleted)
        .map((step: any) => step.stepNumber);
      const wizardData: any = {};
      wizardSteps.forEach((step: any) => {
        wizardData[`step${step.stepNumber}`] = step.stepData;
      });
      return {
        wizardData,
        completedSteps,
        currentStep: project.currentStep,
      };
    } catch (error) {
      console.error('Get wizard data error:', error);
      throw error;
    }
  }

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          wizardSteps: true,
          siteGenerations: true,
        }
      });
      if (!project) {
        throw createNotFoundError('Project');
      }
      const completedSteps = project.wizardSteps?.filter((step: any) => step.isCompleted).length || 0;
      const generationAttempts = project.siteGenerations?.length || 0;
      const timeSpent = completedSteps * 300000 + generationAttempts * 120000;
      return {
        createdAt: project.createdAt,
        lastModified: project.updatedAt,
        stepsCompleted: completedSteps,
        timeSpent,
        generationAttempts,
      };
    } catch (error) {
      console.error('Get project analytics error:', error);
      throw error;
    }
  }

  // Private utility methods
  private async generateProjectSlug(name: string, userId: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.project.findFirst({
        where: {
          slug,
          userId
        }
      });

      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async validateProjectOwnership(projectId: string, userId: string): Promise<any> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      }
    });

    return project;
  }

  private sanitizeWizardData(stepData: any): any {
    if (!stepData || typeof stepData !== 'object') {
      return {};
    }

    // Deep clone and sanitize
    const sanitized = JSON.parse(JSON.stringify(stepData));

    // Remove any potentially dangerous properties
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    dangerousProps.forEach(prop => {
      delete sanitized[prop];
    });    return sanitized;
  }

  /**
   * Duplicate an existing project
   */
  async duplicateProject(projectId: string, userId: string, newName: string): Promise<any> {
    try {
      const originalProject = await this.validateProjectOwnership(projectId, userId);
      if (!originalProject) {
        throw createNotFoundError('Project');
      }      // Get all wizard steps from original project
      const originalSteps = await prisma.wizardStep.findMany({
        where: { projectId },
        orderBy: { stepNumber: 'asc' },
      });      // Create new project
      const duplicatedProject = await prisma.project.create({
        data: {
          name: newName,
          description: originalProject.description,
          slug: await this.generateProjectSlug(newName, userId),
          userId,
          generationStatus: 'DRAFT',
          wizardData: originalProject.wizardData,
          currentStep: originalProject.currentStep,
        },
        include: {
          wizardSteps: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });      // Duplicate wizard steps
      if (originalSteps.length > 0) {
        await prisma.wizardStep.createMany({
          data: originalSteps.map(step => ({
            projectId: duplicatedProject.id,
            stepNumber: step.stepNumber,
            stepName: step.stepName,
            stepData: step.stepData as any,
            isCompleted: step.isCompleted,
          })),
        });
      }

      return duplicatedProject;
    } catch (error) {
      console.error('Duplicate project error:', error);
      throw error;
    }
  }

  /**
   * Validate wizard step data
   */
  async validateWizardStep(
    projectId: string,
    userId: string,
    step: number,
    data: any
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    try {
      const project = await this.validateProjectOwnership(projectId, userId);
      if (!project) {
        throw createNotFoundError('Project');
      }

      const errors: string[] = [];

      // Validate based on step number
      switch (step) {
        case 1: // Business Information
          if (!data.businessName) errors.push('Business name is required');
          if (!data.businessCategory) errors.push('Business category is required');
          break;
        
        case 2: // Business Details
          if (!data.description) errors.push('Business description is required');
          break;
        
        case 3: // Contact Information
          if (!data.email) errors.push('Email is required');
          break;
        
        case 4: // Services
          if (!data.services || !Array.isArray(data.services) || data.services.length === 0) {
            errors.push('At least one service is required');
          }
          break;
        
        case 5: // Location
          if (!data.location) errors.push('Location information is required');
          break;
        
        case 6: // Website Structure
          if (!data.structure) errors.push('Website structure is required');
          break;
        
        case 7: // Design Preferences
          if (!data.theme) errors.push('Theme selection is required');
          break;
        
        case 8: // Content Preferences
          if (!data.contentTone) errors.push('Content tone is required');
          break;
        
        case 9: // Additional Features
          // Optional step - no required fields
          break;
          case 10: // Review & Generate
          // Validate all previous steps are completed
          const completedSteps = await prisma.wizardStep.count({
            where: {
              projectId,
              isCompleted: true,
              stepNumber: { lt: 10 },
            },
          });
          
          if (completedSteps < 9) {
            errors.push('All previous steps must be completed before generating');
          }
          break;
        
        default:
          errors.push('Invalid step number');
      }

      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {      console.error('Validate wizard step error:', error);      throw error;
    }
  }  /**
   * Check if wizard data contains all required steps for completion
   */
  private isWizardDataComplete(wizardData: any): boolean {
    if (!wizardData || typeof wizardData !== 'object') {
      return false;
    }

    // Check for essential wizard data fields based on actual frontend structure
    const hasWebsiteStructure = wizardData.websiteStructure && 
      typeof wizardData.websiteStructure === 'object' &&
      wizardData.websiteStructure.type && 
      Array.isArray(wizardData.websiteStructure.selectedPages) &&
      wizardData.websiteStructure.selectedPages.length > 0;

    const hasThemeConfig = wizardData.themeConfig && 
      typeof wizardData.themeConfig === 'object' &&
      typeof wizardData.themeConfig.hugoTheme === 'string' &&
      wizardData.themeConfig.hugoTheme.length > 0;

    // Check if we have the minimum required data for generation
    const hasMinimumData = hasWebsiteStructure && hasThemeConfig;

    console.log('Wizard data completeness check:', {
      hasWebsiteStructure,
      hasThemeConfig,
      hasMinimumData,
      websiteStructureType: wizardData.websiteStructure?.type,
      hugoTheme: wizardData.themeConfig?.hugoTheme
    });

    return hasMinimumData;
  }
}
