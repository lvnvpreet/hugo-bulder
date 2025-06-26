// Main wizard data interface
export interface WizardData {
  // Step 1: Website Type
  websiteType: {
    id: string;           // 'business', 'personal', 'blog', 'portfolio', 'ecommerce'
    category: string;     // Display category
    description: string;
    allowedCategories?: string[]; // Array of business category IDs allowed for this website type
  } | null;

  // Step 2: Business Category (only if business)
  businessCategory: {
    id: string;
    name: string;
    industry: string;
    subCategories: SubCategory[]; // Available subcategories for this category
    selectedSubCategory?: SubCategory; // User's selected subcategory (filled in later step)
  } | null;

  // Step 3: Business Information
  businessInfo: {
    name: string;
    description: string;
    tagline?: string;
    established?: number;
    employeeCount?: string;
    selectedSubcategory?: SubCategory; // Selected subcategory details
    specialization?: string; // Selected specialization
    additionalFields?: Record<string, string>; // Dynamic fields based on subcategory
  } | null;

  // Step 4: Website Purpose
  websitePurpose: {
    primary: string;      // 'lead-generation', 'sales', 'portfolio', 'information'
    secondary?: string;
    goals: string[];      // Array of specific goals
  } | null;
  // Step 5: Business Description ("What we do")
  businessDescription: {
    description: string;           // Main business description
    whatWeDo?: string;            // Detailed services description
    whyChooseUs?: string;         // Competitive advantages
    targetAudience?: string;      // Target customer description
    keyBenefits: string[];        // Key benefits/advantages
    uniqueSellingPoints: string[]; // What makes them unique
  } | null;

  // Step 6: Services Selection
  servicesSelection: {
    selectedServices: Array<{
      id: string;
      name: string;
      description: string;
      category?: string;
      price?: string;
      duration?: string;
      featured?: boolean;
    }>;
    customServices: Array<{
      id: string;
      name: string;
      description: string;
      category?: string;
      price?: string;
      duration?: string;
      featured?: boolean;
    }>;
    totalServices: number;
  } | null;

  // Step 7: Location Information
  locationInfo: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    serviceAreas?: string[];     // Areas they serve
    isOnlineOnly?: boolean;
  } | null;

  // Step 8: Website Structure
  websiteStructure: {
    type: 'single-page' | 'multi-page';
    selectedSections?: string[]; // For single-page
    selectedPages?: string[];    // For multi-page
    navigationStyle?: string;
    hasGallery?: boolean;
    hasBlog?: boolean;
    hasEcommerce?: boolean;
  } | null;
  // Step 9: Theme Configuration - UPDATED to remove hugoTheme
  themeConfig: {
    // Removed: hugoTheme: string;
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      fontSize: 'small' | 'medium' | 'large';
    };
    layout: {
      headerStyle: string;
      footerStyle: string;
      sidebarEnabled?: boolean;
    };
  } | null;

  // Step 10: Additional Requirements
  additionalRequirements: {
    seoFocus?: string[];         // Target keywords
    integrations?: string[];     // Required integrations
    specialFeatures?: string[];  // Special functionality needed
    contentRequirements?: string; // Specific content needs
    timelinePreference?: string; // When they need it
    budgetRange?: string;
  } | null;
}

// Step completion tracking
export interface StepCompletion {
  [stepNumber: number]: {
    isCompleted: boolean;
    isValid: boolean;
    completedAt?: Date;
    errors?: string[];
  };
}

// Wizard store interface
export interface WizardStore {
  // Data
  data: WizardData;
  stepCompletion: StepCompletion;
  currentStep: number;
  isGenerationComplete: boolean;
  
  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Data Management
  updateData: (step: keyof WizardData, value: any) => void;
  updateStepData: (step: number, data: Partial<WizardData>) => void;
  
  // Generation Management
  setGenerationComplete: (complete: boolean) => void;
  
  // Validation
  validateStep: (step: number) => boolean;
  completeStep: (step: number) => void;
  
  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearData: () => void;
  
  // Utilities
  getProgress: () => number;
  canNavigateToStep: (step: number) => boolean;
  getStepErrors: (step: number) => string[];
}

// Additional helper types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface WebsiteType {
  id: string;
  category: string;
  description: string;
  features: string[];
  nextStep: number;
  allowedCategories?: string[]; // Array of business category IDs allowed for this website type
}

export interface BusinessCategory {
  id: string;
  name: string;
  industry: string;
  description: string;
  subCategories: SubCategory[];
  icon?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  description: string;
  services: string[]; // Predefined service IDs
  requiredFields?: string[]; // Additional form fields
  specializations?: string[]; // Further refinements
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing?: string;
  features?: string[];
  isPopular?: boolean;
}

export interface HugoTheme {
  id: string;
  name: string;
  description: string;
  preview: string;
  demoUrl?: string;
  features: string[];
  compatibility: {
    singlePage: boolean;
    multiPage: boolean;
    blog: boolean;
    portfolio: boolean;
    ecommerce: boolean;
  };
}
