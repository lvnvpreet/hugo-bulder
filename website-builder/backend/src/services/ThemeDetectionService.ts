// Enhanced ThemeDetectionService.ts
// Update your backend/src/services/ThemeDetectionService.ts with this enhanced version

import * as path from 'path';
import * as fs from 'fs';

export interface ThemeRecommendation {
  themeId: string;
  confidence: number;
  reasons: string[];
  fallback?: string;
  websiteTypeMatch?: boolean;
  businessCategoryMatch?: boolean;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  displayName: string;
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

// Website Type to Theme Priority Mapping
const WEBSITE_TYPE_THEME_PRIORITY: { [websiteType: string]: string[] } = {
  'business': ['ananke', 'bigspring', 'papermod', 'mainroad'],
  'portfolio': ['terminal', 'ananke', 'papermod'],
  'blog': ['papermod', 'mainroad', 'clarity', 'ananke'],
  'ecommerce': ['hargo', 'bigspring', 'ananke'],
  'restaurant': ['restaurant', 'ananke', 'bigspring'],
  'personal': ['papermod', 'terminal', 'ananke'],
  'startup': ['bigspring', 'ananke', 'clarity'],
  'agency': ['bigspring', 'ananke', 'terminal'],
  'nonprofit': ['ananke', 'bigspring', 'papermod'],
  'creative': ['terminal', 'ananke', 'papermod']
};

// Business Category to Theme Mapping
const BUSINESS_CATEGORY_THEME_MAPPING: { [category: string]: string[] } = {
  'technology': ['clarity', 'papermod', 'terminal', 'ananke'],
  'professional': ['ananke', 'bigspring', 'papermod'],
  'healthcare': ['ananke', 'papermod', 'mainroad'],
  'medical': ['ananke', 'papermod', 'mainroad'],
  'creative': ['terminal', 'ananke', 'papermod'],
  'restaurant': ['restaurant', 'ananke', 'bigspring'],
  'food': ['restaurant', 'ananke', 'bigspring'],
  'retail': ['hargo', 'bigspring', 'ananke'],
  'ecommerce': ['hargo', 'bigspring', 'ananke'],
  'automotive': ['ananke', 'bigspring', 'papermod'],
  'realestate': ['ananke', 'bigspring', 'papermod'],
  'education': ['ananke', 'papermod', 'mainroad'],
  'nonprofit': ['ananke', 'papermod', 'bigspring'],
  'homeservices': ['ananke', 'bigspring', 'papermod'],
  'beauty': ['ananke', 'bigspring', 'papermod'],
  'finance': ['ananke', 'bigspring', 'papermod'],
  'legal': ['ananke', 'papermod', 'bigspring'],
  'consulting': ['ananke', 'bigspring', 'papermod']
};

// Verified themes with enhanced metadata
const VERIFIED_THEMES: ThemeConfig[] = [
  {
    id: 'papermod',
    name: 'PaperMod',
    displayName: 'PaperMod - Modern Blog Theme',
    categories: ['blog', 'content', 'minimal', 'technology'],
    websiteTypes: ['blog', 'personal', 'business'],
    features: ['blog-focus', 'seo-optimized', 'fast-loading', 'dark-mode'],
    colorScheme: { primary: '#1e40af', secondary: '#3b82f6', accent: '#60a5fa' },
    suitability: {
      business: 70, portfolio: 80, blog: 95, ecommerce: 40,
      restaurant: 50, medical: 60, creative: 70, technology: 90
    },
    githubUrl: 'https://github.com/adityatelange/hugo-PaperMod',
    installCommand: 'git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod'
  },
  {
    id: 'ananke',
    name: 'ananke',
    displayName: 'Ananke - Versatile Business Theme',
    categories: ['business', 'multipurpose', 'professional'],
    websiteTypes: ['business', 'portfolio', 'blog'],
    features: ['responsive', 'customizable', 'multipurpose', 'professional'],
    colorScheme: { primary: '#2563eb', secondary: '#3b82f6', accent: '#60a5fa' },
    suitability: {
      business: 85, portfolio: 75, blog: 70, ecommerce: 60,
      restaurant: 70, medical: 75, creative: 65, technology: 75
    },
    githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke',
    installCommand: 'git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke.git themes/ananke'
  },
  {
    id: 'bigspring',
    name: 'bigspring-light-hugo',
    displayName: 'Bigspring - Business Theme',
    categories: ['business', 'startup', 'agency'],
    websiteTypes: ['business', 'startup'],
    features: ['modern-design', 'business-focus', 'agency-ready'],
    colorScheme: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#a78bfa' },
    suitability: {
      business: 90, portfolio: 70, blog: 60, ecommerce: 75,
      restaurant: 65, medical: 70, creative: 80, technology: 85
    },
    githubUrl: 'https://github.com/gethugothemes/bigspring-light-hugo',
    installCommand: 'git submodule add https://github.com/gethugothemes/bigspring-light-hugo.git themes/bigspring-light-hugo'
  },
  {
    id: 'restaurant',
    name: 'restaurant-hugo',
    displayName: 'Restaurant Hugo - Food & Restaurant Theme',
    categories: ['restaurant', 'food', 'hospitality'],
    websiteTypes: ['business', 'restaurant'],
    features: ['menu-display', 'gallery', 'reservation-ready'],
    colorScheme: { primary: '#dc2626', secondary: '#ef4444', accent: '#f87171' },
    suitability: {
      business: 60, portfolio: 40, blog: 40, ecommerce: 70,
      restaurant: 95, medical: 30, creative: 70, technology: 30
    },
    githubUrl: 'https://github.com/themefisher/restaurant-hugo',
    installCommand: 'git submodule add https://github.com/themefisher/restaurant-hugo.git themes/restaurant-hugo'
  },
  {
    id: 'hargo',
    name: 'hargo-hugo',
    displayName: 'Hargo - E-commerce Theme',
    categories: ['ecommerce', 'shop', 'retail'],
    websiteTypes: ['ecommerce', 'business'],
    features: ['ecommerce', 'snipcart-integration', 'product-showcase'],
    colorScheme: { primary: '#059669', secondary: '#10b981', accent: '#34d399' },
    suitability: {
      business: 70, portfolio: 50, blog: 40, ecommerce: 95,
      restaurant: 50, medical: 40, creative: 60, technology: 65
    },
    githubUrl: 'https://github.com/gethugothemes/hargo-hugo',
    installCommand: 'git submodule add https://github.com/gethugothemes/hargo-hugo.git themes/hargo-hugo'
  },
  {
    id: 'terminal',
    name: 'terminal',
    displayName: 'Terminal - Developer Theme',
    categories: ['developer', 'tech', 'minimal'],
    websiteTypes: ['portfolio', 'blog'],
    features: ['retro-design', 'developer-focus', 'unique-style'],
    colorScheme: { primary: '#00ff00', secondary: '#33ff33', accent: '#66ff66' },
    suitability: {
      business: 40, portfolio: 85, blog: 75, ecommerce: 30,
      restaurant: 25, medical: 30, creative: 80, technology: 90
    },
    githubUrl: 'https://github.com/panr/hugo-theme-terminal',
    installCommand: 'git submodule add https://github.com/panr/hugo-theme-terminal.git themes/terminal'
  },
  {
    id: 'clarity',
    name: 'hugo-clarity',
    displayName: 'Clarity - Tech Blog Theme',
    categories: ['technology', 'documentation', 'technical'],
    websiteTypes: ['blog', 'business'],
    features: ['search', 'code-highlighting', 'modern-design', 'technical'],
    colorScheme: { primary: '#0066cc', secondary: '#4d94ff', accent: '#80b3ff' },
    suitability: {
      business: 70, portfolio: 70, blog: 85, ecommerce: 50,
      restaurant: 40, medical: 60, creative: 60, technology: 95
    },
    githubUrl: 'https://github.com/chipzoller/hugo-clarity',
    installCommand: 'git submodule add https://github.com/chipzoller/hugo-clarity.git themes/hugo-clarity'
  },
  {
    id: 'mainroad',
    name: 'Mainroad',
    displayName: 'Mainroad - Magazine Style',
    categories: ['blog', 'content', 'news'],
    websiteTypes: ['blog', 'business'],
    features: ['content-focus', 'sidebar', 'seo-friendly', 'multilingual'],
    colorScheme: { primary: '#2c5aa0', secondary: '#4a90e2', accent: '#7bb3f0' },
    suitability: {
      business: 75, portfolio: 60, blog: 90, ecommerce: 45,
      restaurant: 60, medical: 70, creative: 65, technology: 80
    },
    githubUrl: 'https://github.com/Vimux/Mainroad',
    installCommand: 'git submodule add https://github.com/Vimux/Mainroad.git themes/Mainroad'
  }
];

// Industry-specific color schemes
const INDUSTRY_COLORS: { [key: string]: ColorScheme } = {
  automotive: {
    primary: '#1f2937', secondary: '#374151', accent: '#dc2626',
    background: '#ffffff', text: '#111827'
  },
  restaurant: {
    primary: '#dc2626', secondary: '#ef4444', accent: '#f59e0b',
    background: '#fef3c7', text: '#1f2937'
  },
  medical: {
    primary: '#0369a1', secondary: '#0284c7', accent: '#059669',
    background: '#f0f9ff', text: '#1e293b'
  },
  technology: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#8b5cf6',
    background: '#f8fafc', text: '#0f172a'
  },
  creative: {
    primary: '#7c3aed', secondary: '#8b5cf6', accent: '#f59e0b',
    background: '#faf5ff', text: '#1f2937'
  },
  retail: {
    primary: '#059669', secondary: '#10b981', accent: '#f59e0b',
    background: '#f0fdf4', text: '#1f2937'
  },
  professional: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#6366f1',
    background: '#f8fafc', text: '#0f172a'
  }
};

export class ThemeDetectionService {
  private themes: ThemeConfig[];
  private initialized = false;

  constructor() {
    this.themes = [...VERIFIED_THEMES];
  }

  async initialize() {
    if (!this.initialized) {
      this.themes = [...VERIFIED_THEMES];
      this.initialized = true;
      console.log(`✅ ThemeDetectionService initialized with ${this.themes.length} themes`);
    }
  }

  /**
   * Enhanced theme detection based on website type and business category
   */
  public async detectTheme(wizardData: any): Promise<ThemeRecommendation> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('🎯 Starting enhanced theme detection with data:', {
      websiteType: wizardData.websiteType?.id || wizardData.websiteType?.category,
      businessCategory: wizardData.businessCategory?.id || wizardData.businessCategory?.industry
    });

    // Extract website type and business category
    const websiteType = this.extractWebsiteType(wizardData);
    const businessCategory = this.extractBusinessCategory(wizardData);

    console.log('📊 Extracted data:', { websiteType, businessCategory });

    // Phase 1: Direct website type matching (highest priority)
    let primaryThemes = this.getThemesByWebsiteType(websiteType);
    console.log('🎯 Primary themes for website type:', primaryThemes);

    // Phase 2: Business category refinement
    if (businessCategory) {
      const businessThemes = this.getThemesByBusinessCategory(businessCategory);
      console.log('🏢 Business category themes:', businessThemes);

      // Find intersection or use business category themes if primary is empty
      if (primaryThemes.length > 0) {
        const intersection = primaryThemes.filter(theme => businessThemes.includes(theme));
        if (intersection.length > 0) {
          primaryThemes = intersection;
          console.log('✅ Using intersection themes:', primaryThemes);
        }
      } else {
        primaryThemes = businessThemes;
        console.log('📝 Using business category themes as primary');
      }
    }

    // Phase 3: Calculate theme scores
    const themeScores = this.calculateThemeScores(wizardData, primaryThemes);
    console.log('📈 Theme scores:', themeScores);

    // Phase 4: Select best theme
    const recommendation = this.selectBestTheme(themeScores, websiteType, businessCategory);

    console.log('🏆 Final recommendation:', recommendation);
    return recommendation;
  }

  private extractWebsiteType(wizardData: any): string {
    return wizardData.websiteType?.id ||
      wizardData.websiteType?.category?.toLowerCase() ||
      'business'; // default fallback
  }

  private extractBusinessCategory(wizardData: any): string | null {
    return wizardData.businessCategory?.id ||
      wizardData.businessCategory?.industry?.toLowerCase() ||
      wizardData.businessCategory?.name?.toLowerCase() ||
      null;
  }

  private getThemesByWebsiteType(websiteType: string): string[] {
    const normalizedType = websiteType.toLowerCase();

    // Direct mapping first
    if (WEBSITE_TYPE_THEME_PRIORITY[normalizedType]) {
      return WEBSITE_TYPE_THEME_PRIORITY[normalizedType];
    }

    // Fallback mapping for variations
    const mappings: { [key: string]: string } = {
      'business website': 'business',
      'personal website': 'personal',
      'blog website': 'blog',
      'portfolio website': 'portfolio',
      'e-commerce': 'ecommerce',
      'online store': 'ecommerce',
      'restaurant website': 'restaurant',
      'company website': 'business'
    };

    const mappedType = mappings[normalizedType] || 'business';
    return WEBSITE_TYPE_THEME_PRIORITY[mappedType] || WEBSITE_TYPE_THEME_PRIORITY['business'];
  }

  private getThemesByBusinessCategory(businessCategory: string): string[] {
    const normalizedCategory = businessCategory.toLowerCase();

    // Direct mapping
    if (BUSINESS_CATEGORY_THEME_MAPPING[normalizedCategory]) {
      return BUSINESS_CATEGORY_THEME_MAPPING[normalizedCategory];
    }

    // Fuzzy matching for category variations
    const fuzzyMappings: { [key: string]: string } = {
      'tech': 'technology',
      'software': 'technology',
      'it': 'technology',
      'food': 'restaurant',
      'hospitality': 'restaurant',
      'cafe': 'restaurant',
      'health': 'medical',
      'wellness': 'medical',
      'design': 'creative',
      'art': 'creative',
      'photography': 'creative',
      'shop': 'retail',
      'store': 'retail',
      'business': 'professional',
      'services': 'professional'
    };

    const mappedCategory = fuzzyMappings[normalizedCategory] || normalizedCategory;
    return BUSINESS_CATEGORY_THEME_MAPPING[mappedCategory] || BUSINESS_CATEGORY_THEME_MAPPING['professional'];
  }

  private calculateThemeScores(wizardData: any, candidateThemes: string[]): { [themeId: string]: number } {
    const scores: { [themeId: string]: number } = {};

    candidateThemes.forEach(themeId => {
      const theme = this.themes.find(t => t.id === themeId);
      if (!theme) return;

      let score = 0;

      // Website type match (40 points)
      const websiteType = this.extractWebsiteType(wizardData);
      if (theme.websiteTypes.includes(websiteType)) {
        score += 40;
      }

      // Business category suitability (35 points)
      const businessCategory = this.extractBusinessCategory(wizardData);
      if (businessCategory) {
        const suitabilityKey = this.mapBusinessCategoryToSuitability(businessCategory);
        if (suitabilityKey && theme.suitability[suitabilityKey]) {
          score += (theme.suitability[suitabilityKey] / 100) * 35;
        }
      }

      // Feature requirements (25 points)
      score += this.calculateFeatureScore(wizardData, theme);

      scores[themeId] = score;
    });

    return scores;
  }

  private calculateFeatureScore(wizardData: any, theme: ThemeConfig): number {
    let score = 0;

    // Blog requirement
    if (wizardData.websiteStructure?.hasBlog &&
      (theme.categories.includes('blog') || theme.features.includes('blog-focus'))) {
      score += 8;
    }

    // E-commerce requirement
    if (wizardData.websiteStructure?.hasEcommerce &&
      (theme.categories.includes('ecommerce') || theme.features.includes('ecommerce'))) {
      score += 10;
    }

    // Portfolio requirement
    if (wizardData.websiteStructure?.hasPortfolio &&
      theme.websiteTypes.includes('portfolio')) {
      score += 7;
    }

    return score;
  }

  private selectBestTheme(themeScores: { [themeId: string]: number }, websiteType: string, businessCategory: string | null): ThemeRecommendation {
    const sortedThemes = Object.entries(themeScores)
      .sort(([, a], [, b]) => b - a)
      .map(([themeId, score]) => ({ themeId, score }));

    if (sortedThemes.length === 0) {
      // Ultimate fallback
      return {
        themeId: 'ananke',
        confidence: 60,
        reasons: ['Default versatile theme selected'],
        fallback: 'papermod'
      };
    }

    const bestTheme = sortedThemes[0];
    const secondBest = sortedThemes[1];

    // Calculate confidence based on score
    const maxPossibleScore = 100; // 40 + 35 + 25
    const confidence = Math.min(95, Math.max(65, (bestTheme.score / maxPossibleScore) * 100));

    // Generate reasons
    const reasons = this.generateReasons(bestTheme.themeId, websiteType, businessCategory);

    return {
      themeId: bestTheme.themeId,
      confidence: Math.round(confidence),
      reasons,
      fallback: secondBest?.themeId,
      websiteTypeMatch: true,
      businessCategoryMatch: !!businessCategory
    };
  }

  private generateReasons(themeId: string, websiteType: string, businessCategory: string | null): string[] {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return ['Theme selected based on requirements'];

    const reasons: string[] = [];

    // Website type reason
    if (theme.websiteTypes.includes(websiteType)) {
      reasons.push(`Perfect match for ${websiteType} websites`);
    }

    // Business category reason
    if (businessCategory) {
      const suitabilityKey = this.mapBusinessCategoryToSuitability(businessCategory);
      if (suitabilityKey && theme.suitability[suitabilityKey] >= 80) {
        reasons.push(`Highly suitable for ${businessCategory} industry (${theme.suitability[suitabilityKey]}% match)`);
      }
    }

    // Feature reasons
    if (theme.categories.includes(websiteType)) {
      reasons.push(`Specialized for ${websiteType} functionality`);
    }

    // Theme-specific reasons
    if (theme.features.length > 0) {
      reasons.push(`Includes ${theme.features.slice(0, 2).join(' and ')} features`);
    }

    return reasons.length > 0 ? reasons : [`${theme.displayName} is well-suited for your requirements`];
  }

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

  /**
   * Detect color scheme based on business category and theme
   */
  public detectColorScheme(wizardData: any, themeId: string): ColorScheme {
    const businessCategory = this.extractBusinessCategory(wizardData);

    if (businessCategory && INDUSTRY_COLORS[businessCategory]) {
      return INDUSTRY_COLORS[businessCategory];
    }

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
    let explanation = `We've selected ${theme.displayName} with ${confidence}% confidence. `;

    if (confidence >= 90) {
      explanation += `This theme is an excellent match for your requirements. `;
    } else if (confidence >= 80) {
      explanation += `This theme is a very good match for your requirements. `;
    } else if (confidence >= 70) {
      explanation += `This theme is a good match for your requirements. `;
    } else {
      explanation += `This theme should work well for your website. `;
    }

    explanation += `${theme.displayName} is optimized for ${theme.categories.join(', ')}-focused websites and includes ${theme.features.slice(0, 2).join(', ')} features.`;

    return explanation;
  }

  public getAvailableThemes(): ThemeConfig[] {
    return this.themes;
  }

  public getThemeById(themeId: string): ThemeConfig | undefined {
    return this.themes.find(theme => theme.id === themeId);
  }
}