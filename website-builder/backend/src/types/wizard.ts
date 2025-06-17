// Backend wizard data types - shared with frontend
export interface WizardData {
  // Step 1: Website Type
  websiteType: {
    id: string;           // 'business', 'personal', 'blog', 'portfolio', 'ecommerce'
    category: string;     // Display category
    description: string;
  } | null;

  // Step 2: Business Category (only if business)
  businessCategory: {
    id: string;
    name: string;
    industry: string;
    services: string[];   // Default services for this category
  } | null;

  // Step 3: Business Information
  businessInfo: {
    name: string;
    description: string;
    tagline?: string;
    established?: number;
    employeeCount?: string;
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
}

export interface BusinessCategory {
  id: string;
  name: string;
  industry: string;
  description: string;
  services: string[];
  icon?: string;
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
