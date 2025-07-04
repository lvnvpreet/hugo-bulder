/**
 * Theme Bridge Service
 * Bridges backend and hugo-generator theme systems
 */

import { ThemeSelectionService } from '../theme-system/ThemeSelectionService';
import { getThemeConfiguration } from '../theme-system/themeConfigs';

export interface EnhancedThemeConfig {
  selectedTheme: {
    id: string;
    name: string;
    displayName: string;
    isLocal: boolean;
    githubUrl?: string;
  };
  parameterMapping: any;
  supportedFeatures: string[];
  pageLayouts: any;
  validation: {
    isValid: boolean;
    missingRequirements: string[];
    warnings: string[];
  };
  selectionReason: string;
  compatibilityScore: number;
}

export class ThemeBridgeService {
  private themeSelectionService: ThemeSelectionService;
  
  constructor() {
    this.themeSelectionService = new ThemeSelectionService();
  }

  /**
   * Get enhanced theme configuration for wizard data
   */
  async getEnhancedThemeConfig(wizardData: any): Promise<EnhancedThemeConfig> {
    try {
      console.log('🎨 Getting enhanced theme configuration...');
      
      // Use theme selection service to pick best theme
      const selection = this.themeSelectionService.selectTheme(wizardData);
      const themeConfig = getThemeConfiguration(selection.selectedTheme.id);
      
      // Validate theme compatibility
      const validation = this.themeSelectionService.validateThemeForWizardData(
        selection.selectedTheme.id,
        wizardData
      );
      
      const enhancedConfig: EnhancedThemeConfig = {
        selectedTheme: selection.selectedTheme,
        parameterMapping: themeConfig?.parameterMapping || {},
        supportedFeatures: themeConfig?.supportedFeatures || [],
        pageLayouts: themeConfig?.pageLayouts || {},
        validation,
        selectionReason: selection.reason,
        compatibilityScore: this.calculateCompatibilityScore(selection)
      };
      
      console.log(`✅ Theme selected: ${enhancedConfig.selectedTheme.displayName}`);
      console.log(`   Compatibility: ${enhancedConfig.compatibilityScore}%`);
      console.log(`   Features: ${enhancedConfig.supportedFeatures.length} supported`);
      console.log(`   Valid: ${enhancedConfig.validation.isValid}`);
      
      return enhancedConfig;
      
    } catch (error: any) {
      console.error('❌ Enhanced theme configuration failed:', error.message);
      
      // Throw error instead of using fallback
      throw new Error(`Theme configuration failed: ${error.message}. Please ensure the theme system is properly configured.`);
    }
  }
  
  /**
   * Calculate compatibility score from theme selection
   */
  private calculateCompatibilityScore(selection: any): number {
    // Extract score from selection or calculate based on alternatives
    if (selection.selectedTheme.score) {
      return Math.min(selection.selectedTheme.score, 100);
    }
    
    // Default score based on selection reason
    if (selection.reason.includes('Best match')) {
      return 85;
    } else if (selection.reason.includes('Default')) {
      return 50;
    }
    
    return 70;
  }
    /**
   * Get theme detection summary for logging
   */
  getThemeDetectionSummary(wizardData: any, enhancedConfig: EnhancedThemeConfig): string {
    const businessCategory = wizardData.businessCategory?.industry || 'unknown';
    const businessName = wizardData.businessInfo?.name || 'Unknown Business';
    
    return `Theme Detection Summary:
      Business: ${businessName} (${businessCategory})
      Selected Theme: ${enhancedConfig.selectedTheme.displayName}
      Compatibility: ${enhancedConfig.compatibilityScore}%
      Features: ${enhancedConfig.supportedFeatures.join(', ')}
      Reason: ${enhancedConfig.selectionReason}
      Valid: ${enhancedConfig.validation.isValid}`;
  }
}
