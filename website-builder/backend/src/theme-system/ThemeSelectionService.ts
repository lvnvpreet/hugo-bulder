/**
 * Theme Selection Service
 * Automatically selects appropriate themes based on wizard data
 */

import { getThemeConfigurationsByCategory, getThemeConfiguration } from './themeConfigs';

export interface ThemeSelectionResult {
  selectedTheme: {
    id: string;
    name: string;
    displayName: string;
    isLocal: boolean;
    githubUrl?: string;
  };
  reason: string;
  alternativeThemes: Array<{
    id: string;
    name: string;
    displayName: string;
    score: number;
  }>;
}

export class ThemeSelectionService {
  
  /**
   * Select the best theme based on wizard data
   */
  selectTheme(wizardData: any): ThemeSelectionResult {
    const businessCategory = wizardData.businessCategory?.industry?.toLowerCase() || 'business';
    const websiteType = wizardData.websiteType?.category || 'business';
    const businessInfo = wizardData.businessInfo || {};
    
    console.log(`🎯 Selecting theme for category: ${businessCategory}, type: ${websiteType}`);
    
    // Get themes that match the business category
    const categoryThemes = getThemeConfigurationsByCategory(businessCategory);
    
    if (categoryThemes.length > 0) {
      // Score each theme based on how well it matches the requirements
      const scoredThemes = categoryThemes.map((theme: any) => ({
        ...theme,
        score: this.scoreTheme(theme, wizardData)
      })).sort((a: any, b: any) => b.score - a.score);
      
      const bestTheme = scoredThemes[0];
      
      if (bestTheme) {
        return {
          selectedTheme: {
            id: bestTheme.id,
            name: bestTheme.name,
            displayName: bestTheme.displayName,
            isLocal: true, // Our custom themes are local
            githubUrl: undefined
          },
          reason: `Best match for ${businessCategory} business with ${bestTheme.score} compatibility score`,
          alternativeThemes: scoredThemes.slice(1, 4).map((theme: any) => ({
            id: theme.id,
            name: theme.name,
            displayName: theme.displayName,
            score: theme.score
          }))
        };
      }
    }
    
    // Default to general business themes
    return this.getDefaultThemeSelection(websiteType);
  }
  
  /**
   * Score a theme based on how well it matches the wizard data
   */
  private scoreTheme(theme: any, wizardData: any): number {
    let score = 0;
    
    const businessCategory = wizardData.businessCategory?.industry?.toLowerCase() || 'business';
    const selectedServices = wizardData.selectedServices || [];
    const hasAppointmentBooking = wizardData.healthcareInfo?.appointmentBooking;
    const hasEmergencyInfo = wizardData.healthcareInfo?.emergencyPhone;
    const hasTeam = wizardData.businessInfo?.teamSize > 1;
    const hasMultipleLocations = wizardData.locationInfo?.multipleLocations;
    
    // Category match bonus
    if (theme.businessCategories.includes(businessCategory)) {
      score += 50;
    }
    
    // Feature matching
    if (hasAppointmentBooking && theme.supportedFeatures.includes('appointment-booking')) {
      score += 20;
    }
    
    if (hasEmergencyInfo && theme.supportedFeatures.includes('emergency-contact')) {
      score += 15;
    }
    
    if (hasTeam && theme.supportedFeatures.includes('team-profiles')) {
      score += 10;
    }
    
    if (selectedServices.length > 0 && theme.supportedFeatures.includes('service-cards')) {
      score += 15;
    }
    
    if (hasMultipleLocations && theme.supportedFeatures.includes('business-hours')) {
      score += 10;
    }
    
    // Bonus for having required parameters that we can fulfill
    const fulfillableParams = this.countFulfillableParameters(theme.requiredParameters, wizardData);
    score += fulfillableParams * 5;
    
    return score;
  }
  
  /**
   * Count how many required parameters we can fulfill from wizard data
   */
  private countFulfillableParameters(requiredParams: string[], wizardData: any): number {
    let count = 0;
    
    const businessInfo = wizardData.businessInfo || {};
    const locationInfo = wizardData.locationInfo || {};
    
    requiredParams.forEach(param => {
      switch (param) {
        case 'phone':
          if (locationInfo.contactInfo?.phone) count++;
          break;
        case 'email':
          if (locationInfo.contactInfo?.email) count++;
          break;
        case 'address':
          if (locationInfo.address && !locationInfo.isOnlineOnly) count++;
          break;
        case 'businessName':
          if (businessInfo.name) count++;
          break;
        case 'hours':
          if (locationInfo.businessHours) count++;
          break;
        default:
          // Assume we can fulfill it
          count++;
      }
    });
    
    return count;
  }
  
  /**
   * Get default theme selection when no category-specific themes are available
   */
  private getDefaultThemeSelection(websiteType: string): ThemeSelectionResult {
    // Check if health-wellness-theme is available for healthcare
    const healthTheme = getThemeConfiguration('health-wellness-theme');
    
    if (websiteType.includes('health') || websiteType.includes('medical')) {
      if (healthTheme) {
        return {
          selectedTheme: {
            id: healthTheme.id,
            name: healthTheme.name,
            displayName: healthTheme.displayName,
            isLocal: true
          },
          reason: 'Default healthcare theme selected',
          alternativeThemes: []
        };
      }
    }
    
    // Default theme - use a standard Hugo theme
    return {
      selectedTheme: {
        id: 'ananke',
        name: 'ananke',
        displayName: 'Ananke (Default)',
        isLocal: false,
        githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke'
      },
      reason: 'Default Hugo theme selected',
      alternativeThemes: []
    };
  }
  
  /**
   * Validate that a theme can handle the wizard data requirements
   */
  validateThemeForWizardData(themeId: string, wizardData: any): {
    isValid: boolean;
    missingRequirements: string[];
    warnings: string[];
  } {
    const themeConfig = getThemeConfiguration(themeId);
    
    if (!themeConfig) {
      return {
        isValid: false,
        missingRequirements: [`Theme ${themeId} not found`],
        warnings: []
      };
    }
    
    const missingRequirements: string[] = [];
    const warnings: string[] = [];
    
    const businessInfo = wizardData.businessInfo || {};
    const locationInfo = wizardData.locationInfo || {};
    
    // Check required parameters
    themeConfig.requiredParameters.forEach((param: string) => {
      switch (param) {
        case 'phone':
          if (!locationInfo.contactInfo?.phone) {
            missingRequirements.push('Phone number required');
          }
          break;
        case 'email':
          if (!locationInfo.contactInfo?.email) {
            missingRequirements.push('Email address required');
          }
          break;
        case 'address':
          if (!locationInfo.address && !locationInfo.isOnlineOnly) {
            missingRequirements.push('Business address required');
          }
          break;
        case 'businessName':
          if (!businessInfo.name) {
            missingRequirements.push('Business name required');
          }
          break;
        case 'hours':
          if (!locationInfo.businessHours) {
            warnings.push('Business hours not provided, will use defaults');
          }
          break;
      }
    });
    
    return {
      isValid: missingRequirements.length === 0,
      missingRequirements,
      warnings
    };
  }
}
