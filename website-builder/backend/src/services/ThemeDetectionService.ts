// import { WizardData } from '../types/wizard';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import shared types - we'll define them locally for type safety
export interface ThemeConfig {
  id: string;
  name: string;
  categories: string[];
  websiteTypes: string[];
  features: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  suitability: {
    business: number;
    portfolio: number;
    blog: number;
    ecommerce: number;
    restaurant: number;
    medical: number;
    creative: number;
    technology: number;
  };
  githubUrl: string;
  installCommand: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// Define theme constants locally to avoid import issues
let VERIFIED_THEMES: ThemeConfig[] = [];
let INDUSTRY_COLORS: { [key: string]: ColorScheme } = {};

// Initialize fallback themes immediately
if (!VERIFIED_THEMES || VERIFIED_THEMES.length === 0) {
  VERIFIED_THEMES = [
    {
      id: 'papermod',
      name: 'PaperMod',
      categories: ['blog', 'content', 'minimal', 'technology'],
      websiteTypes: ['blog', 'personal', 'business'],
      features: ['blog-focus', 'seo-optimized', 'fast-loading', 'dark-mode'],
      colorScheme: { primary: '#1e40af', secondary: '#3b82f6', accent: '#60a5fa' },
      suitability: { business: 70, portfolio: 80, blog: 95, ecommerce: 40, restaurant: 50, medical: 60, creative: 70, technology: 90 },
      githubUrl: 'https://github.com/adityatelange/hugo-PaperMod',
      installCommand: 'git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod'
    },
    {
      id: 'ananke',
      name: 'Ananke',
      categories: ['business', 'multipurpose', 'professional'],
      websiteTypes: ['business', 'portfolio', 'blog'],
      features: ['responsive', 'customizable', 'multipurpose', 'professional'],
      colorScheme: { primary: '#2563eb', secondary: '#3b82f6', accent: '#60a5fa' },
      suitability: { business: 85, portfolio: 75, blog: 70, ecommerce: 60, restaurant: 70, medical: 75, creative: 65, technology: 75 },
      githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke',
      installCommand: 'hugo mod get github.com/theNewDynamic/gohugo-theme-ananke/v2'
    }
  ];
}

// Initialize themes directly (will load from shared constants via require)
function loadSharedThemes() {
  try {
    // Use require to load from shared constants
    const sharedPath = path.resolve(__dirname, '../../../shared/constants/themes.ts');
    if (fs.existsSync(sharedPath)) {
      // For now, use fallback themes until we fix the import issue
      console.log('⚠️ Using fallback themes (import issue with shared constants)');
    }  } catch (error) {
    console.error('Error loading shared theme constants:', error);
  }
}

// Fallback color schemes initialization
if (!INDUSTRY_COLORS || Object.keys(INDUSTRY_COLORS).length === 0) {
    INDUSTRY_COLORS = {
      technology: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#8b5cf6',
        background: '#f8fafc',
        text: '#0f172a'
      },
      business: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#6366f1',
        background: '#f8fafc',
        text: '#0f172a'
      }
    };
  }


export interface ThemeRecommendation {
  themeId: string;
  confidence: number;
  reasons: string[];
  fallback?: string;
}

export class ThemeDetectionService {
  private themes: ThemeConfig[];
  private initialized = false;

  constructor() {
    this.themes = [...VERIFIED_THEMES];
  }
  
  /**
   * Initialize service by loading shared themes
   */
  async initialize() {
    if (!this.initialized) {
      await loadSharedThemes();
      this.themes = [...VERIFIED_THEMES];
      this.initialized = true;
    }
  }

  /**
   * Automatically detect the best theme based on wizard data
   * @param wizardData - Complete wizard data from frontend
   * @returns ThemeRecommendation with selected theme and confidence
   */
  public async detectTheme(wizardData: any): Promise<ThemeRecommendation> {
    // Ensure themes are loaded
    if (!this.initialized) {
      await this.initialize();
    }
    const scores: { [themeId: string]: { score: number; reasons: string[] } } = {};    // Initialize scores for all themes
    this.themes.forEach(theme => {
      scores[theme.id] = { score: 0, reasons: [] };
    });

    // 1. Business Category Matching (40% weight)
    if (wizardData.businessCategory) {
      const businessCategory = wizardData.businessCategory.industry?.toLowerCase() || 
                             wizardData.businessCategory.id?.toLowerCase();
      
      this.themes.forEach(theme => {
        const themeScore = scores[theme.id];
        if (!themeScore) return;

        // Check if theme categories match business category
        const categoryMatch = theme.categories.some(cat => 
          businessCategory.includes(cat) || cat.includes(businessCategory)
        );
        
        if (categoryMatch) {
          themeScore.score += 40;
          themeScore.reasons.push(`Perfect match for ${businessCategory} industry`);
        }

        // Check suitability scores
        const suitabilityKey = this.mapBusinessCategoryToSuitability(businessCategory);
        if (suitabilityKey && theme.suitability[suitabilityKey]) {
          const suitabilityScore = theme.suitability[suitabilityKey];
          themeScore.score += (suitabilityScore / 100) * 40;
          
          if (suitabilityScore >= 80) {
            themeScore.reasons.push(`Highly suitable for ${businessCategory} (${suitabilityScore}% match)`);
          }
        }
      });
    }    // 2. Website Type Matching (25% weight)
    if (wizardData.websiteType) {
      const websiteType = wizardData.websiteType.id?.toLowerCase() || 
                         wizardData.websiteType.category?.toLowerCase();

      this.themes.forEach(theme => {
        const themeScore = scores[theme.id];
        if (!themeScore) return;

        const typeMatch = theme.websiteTypes.some(type => 
          type.toLowerCase() === websiteType
        );

        if (typeMatch) {
          themeScore.score += 25;
          themeScore.reasons.push(`Designed for ${websiteType} websites`);
        }

        // Check suitability for website type
        const suitabilityKey = websiteType as keyof typeof theme.suitability;
        if (theme.suitability[suitabilityKey]) {
          const suitabilityScore = theme.suitability[suitabilityKey];
          themeScore.score += (suitabilityScore / 100) * 25;
        }
      });
    }    // 3. Website Purpose Matching (20% weight)
    if (wizardData.websitePurpose) {
      const primary = wizardData.websitePurpose.primary?.toLowerCase();
      const goals = wizardData.websitePurpose.goals || [];

      this.themes.forEach(theme => {
        const themeScore = scores[theme.id];
        if (!themeScore) return;

        let purposeScore = 0;
        let purposeReasons: string[] = [];

        // Match primary purpose
        if (primary === 'lead-generation' || primary === 'sales') {
          if (theme.features.includes('business-focus') || theme.categories.includes('business')) {
            purposeScore += 15;
            purposeReasons.push('Optimized for lead generation and sales');
          }
        } else if (primary === 'portfolio') {
          if (theme.categories.includes('portfolio') || theme.features.includes('unique-style')) {
            purposeScore += 15;
            purposeReasons.push('Perfect for showcasing work and portfolio');
          }
        } else if (primary === 'information') {
          if (theme.features.includes('content-focus') || theme.categories.includes('blog')) {
            purposeScore += 15;
            purposeReasons.push('Excellent for content and information sharing');
          }
        }

        // Match specific goals
        goals.forEach((goal: string) => {
          if (goal.toLowerCase().includes('seo') && theme.features.includes('seo-optimized')) {
            purposeScore += 5;
            purposeReasons.push('SEO-optimized for better search rankings');
          }
          if (goal.toLowerCase().includes('mobile') && theme.features.includes('responsive')) {
            purposeScore += 5;
            purposeReasons.push('Responsive design for mobile users');
          }
        });

        themeScore.score += purposeScore;
        themeScore.reasons.push(...purposeReasons);
      });
    }    // 4. Feature Requirements (15% weight)
    if (wizardData.websiteStructure) {
      this.themes.forEach(theme => {
        const themeScore = scores[theme.id];
        if (!themeScore) return;

        let featureScore = 0;
        let featureReasons: string[] = [];

        // Blog requirement
        if (wizardData.websiteStructure?.hasBlog) {
          if (theme.categories.includes('blog') || theme.features.includes('blog-focus')) {
            featureScore += 5;
            featureReasons.push('Excellent blog support');
          }
        }

        // Ecommerce requirement
        if (wizardData.websiteStructure?.hasEcommerce) {
          if (theme.categories.includes('ecommerce') || theme.features.includes('ecommerce')) {
            featureScore += 8;
            featureReasons.push('Built-in ecommerce capabilities');
          }
        }

        // Gallery requirement
        if (wizardData.websiteStructure?.hasGallery) {
          if (theme.features.includes('gallery') || theme.categories.includes('creative')) {
            featureScore += 2;
            featureReasons.push('Gallery and image showcase features');
          }
        }

        themeScore.score += featureScore;
        themeScore.reasons.push(...featureReasons);
      });
    }    // Find the best theme
    const sortedThemes = Object.entries(scores)
      .sort(([, a], [, b]) => b.score - a.score)
      .map(([themeId, data]) => ({
        themeId,
        score: data.score,
        reasons: data.reasons
      }));

    const bestTheme = sortedThemes[0];
    const secondBest = sortedThemes[1];

    if (!bestTheme) {
      // Fallback to default theme if no scoring occurred
      return {
        themeId: 'ananke',
        confidence: 60,
        reasons: ['Default professional theme selected'],
        fallback: 'papermod'
      };
    }

    // Calculate confidence based on score gap
    const maxPossibleScore = 100; // 40 + 25 + 20 + 15
    const confidence = Math.min(95, Math.max(60, (bestTheme.score / maxPossibleScore) * 100));

    return {
      themeId: bestTheme.themeId,
      confidence: Math.round(confidence),
      reasons: bestTheme.reasons.filter((reason, index, self) => 
        self.indexOf(reason) === index // Remove duplicates
      ),
      fallback: secondBest?.themeId
    };
  }
  /**
   * Get color scheme based on business category and selected theme
   */
  public detectColorScheme(wizardData: any, themeId: string): ColorScheme {
    // First, try to get industry-specific colors
    if (wizardData.businessCategory) {
      const businessCategory = wizardData.businessCategory.industry?.toLowerCase() || 
                             wizardData.businessCategory.id?.toLowerCase();
      
      const industryColors = INDUSTRY_COLORS[businessCategory];
      if (industryColors) {
        return industryColors;
      }
    }

    // Fallback to theme's default color scheme
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      return {
        primary: theme.colorScheme.primary,
        secondary: theme.colorScheme.secondary,
        accent: theme.colorScheme.accent,
        background: '#ffffff',
        text: '#1f2937'
      };
    }

    // Ultimate fallback
    return {
      primary: '#2563eb',
      secondary: '#3b82f6',
      accent: '#60a5fa',
      background: '#ffffff',
      text: '#1f2937'
    };
  }

  /**
   * Get explanation for theme selection
   */
  public getThemeExplanation(recommendation: ThemeRecommendation): string {
    const theme = this.themes.find(t => t.id === recommendation.themeId);
    if (!theme) {
      return `We've selected ${recommendation.themeId} as the best theme for your website.`;
    }

    const confidence = recommendation.confidence;
    let explanation = `We've selected ${theme.name} as the best theme for your website with ${confidence}% confidence. `;

    if (confidence >= 90) {
      explanation += `This theme is an excellent match for your requirements. `;
    } else if (confidence >= 80) {
      explanation += `This theme is a very good match for your requirements. `;
    } else if (confidence >= 70) {
      explanation += `This theme is a good match for your requirements. `;
    } else {
      explanation += `This theme should work well for your website. `;
    }

    explanation += `${theme.name} is ${theme.categories.join(', ')}-focused and offers ${theme.features.join(', ')} features.`;

    return explanation;
  }

  /**
   * Get all available themes
   */
  public getAvailableThemes(): ThemeConfig[] {
    return this.themes;
  }

  /**
   * Get theme by ID
   */
  public getThemeById(themeId: string): ThemeConfig | undefined {
    return this.themes.find(theme => theme.id === themeId);
  }

  /**
   * Map business category to suitability key
   */
  private mapBusinessCategoryToSuitability(businessCategory: string): keyof ThemeConfig['suitability'] | null {
    const mapping: { [key: string]: keyof ThemeConfig['suitability'] } = {
      'automotive': 'business',
      'restaurant': 'restaurant',
      'food': 'restaurant',
      'hospitality': 'restaurant',
      'medical': 'medical',
      'healthcare': 'medical',
      'technology': 'technology',
      'tech': 'technology',
      'software': 'technology',
      'creative': 'creative',
      'design': 'creative',
      'art': 'creative',
      'retail': 'ecommerce',
      'ecommerce': 'ecommerce',
      'shop': 'ecommerce',
      'store': 'ecommerce',
      'professional': 'business',
      'consulting': 'business',
      'finance': 'business',
      'legal': 'business',
      'blog': 'blog',
      'news': 'blog',
      'portfolio': 'portfolio'
    };

    return mapping[businessCategory] || 'business';
  }
}
