/**
 * Shared theme constants for Hugo theme detection and installation
 * Used by both backend ThemeDetectionService and hugo-generator ThemeInstaller
 */

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

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// List of verified Hugo themes with complete metadata
export const VERIFIED_THEMES: ThemeConfig[] = [
  {
    id: 'papermod',
    name: 'PaperMod',
    displayName: 'PaperMod - Modern Blog Theme',
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
    name: 'ananke',
    displayName: 'Ananke - Versatile Business Theme',
    categories: ['business', 'multipurpose', 'professional'],
    websiteTypes: ['business', 'portfolio', 'blog'],
    features: ['responsive', 'customizable', 'multipurpose', 'professional'],
    colorScheme: { primary: '#2563eb', secondary: '#3b82f6', accent: '#60a5fa' },
    suitability: { business: 85, portfolio: 75, blog: 70, ecommerce: 60, restaurant: 70, medical: 75, creative: 65, technology: 75 },
    githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke',
    installCommand: 'git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke.git themes/ananke'
  },
  {
    id: 'mainroad',
    name: 'Mainroad',
    displayName: 'Mainroad - Magazine Style',
    categories: ['blog', 'content', 'news'],
    websiteTypes: ['blog', 'business'],
    features: ['content-focus', 'sidebar', 'seo-friendly', 'multilingual'],
    colorScheme: { primary: '#2c5aa0', secondary: '#4a90e2', accent: '#7bb3f0' },
    suitability: { business: 75, portfolio: 60, blog: 90, ecommerce: 45, restaurant: 60, medical: 70, creative: 65, technology: 80 },
    githubUrl: 'https://github.com/Vimux/Mainroad',
    installCommand: 'git submodule add https://github.com/Vimux/Mainroad.git themes/Mainroad'
  },
  {
    id: 'clarity',
    name: 'hugo-clarity',
    displayName: 'Clarity - Tech Blog Theme',
    categories: ['technology', 'documentation', 'technical'],
    websiteTypes: ['blog', 'business'],
    features: ['search', 'code-highlighting', 'modern-design', 'technical'],
    colorScheme: { primary: '#0066cc', secondary: '#4d94ff', accent: '#80b3ff' },
    suitability: { business: 70, portfolio: 70, blog: 85, ecommerce: 50, restaurant: 40, medical: 60, creative: 60, technology: 95 },
    githubUrl: 'https://github.com/chipzoller/hugo-clarity',
    installCommand: 'git submodule add https://github.com/chipzoller/hugo-clarity.git themes/hugo-clarity'
  },
  {
    id: 'terminal',
    name: 'terminal',
    displayName: 'Terminal - Developer Theme',
    categories: ['developer', 'tech', 'minimal'],
    websiteTypes: ['portfolio', 'blog'],
    features: ['retro-design', 'developer-focus', 'unique-style'],
    colorScheme: { primary: '#00ff00', secondary: '#33ff33', accent: '#66ff66' },
    suitability: { business: 40, portfolio: 85, blog: 75, ecommerce: 30, restaurant: 25, medical: 30, creative: 80, technology: 90 },
    githubUrl: 'https://github.com/panr/hugo-theme-terminal',
    installCommand: 'git submodule add https://github.com/panr/hugo-theme-terminal.git themes/terminal'
  },
  {
    id: 'bigspring',
    name: 'bigspring-light-hugo',
    displayName: 'Bigspring - Business Theme',
    categories: ['business', 'startup', 'agency'],
    websiteTypes: ['business', 'startup'],
    features: ['modern-design', 'business-focus', 'agency-ready'],
    colorScheme: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#a78bfa' },
    suitability: { business: 90, portfolio: 70, blog: 60, ecommerce: 75, restaurant: 65, medical: 70, creative: 80, technology: 85 },
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
    suitability: { business: 60, portfolio: 40, blog: 40, ecommerce: 70, restaurant: 95, medical: 30, creative: 70, technology: 30 },
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
    suitability: { business: 70, portfolio: 50, blog: 40, ecommerce: 95, restaurant: 50, medical: 40, creative: 60, technology: 65 },
    githubUrl: 'https://github.com/gethugothemes/hargo-hugo',
    installCommand: 'git submodule add https://github.com/gethugothemes/hargo-hugo.git themes/hargo-hugo'
  }
];

// Industry-specific color schemes
export const INDUSTRY_COLORS: { [key: string]: ColorScheme } = {
  automotive: {
    primary: '#1f2937',
    secondary: '#374151',
    accent: '#dc2626',
    background: '#ffffff',
    text: '#111827'
  },
  restaurant: {
    primary: '#dc2626',
    secondary: '#ef4444',
    accent: '#f59e0b',
    background: '#fef3c7',
    text: '#1f2937'
  },
  medical: {
    primary: '#0369a1',
    secondary: '#0284c7',
    accent: '#059669',
    background: '#f0f9ff',
    text: '#1e293b'
  },
  technology: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#8b5cf6',
    background: '#f8fafc',
    text: '#0f172a'
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#faf5ff',
    text: '#1f2937'
  },
  retail: {
    primary: '#059669',
    secondary: '#10b981',
    accent: '#f59e0b',
    background: '#f0fdf4',
    text: '#1f2937'
  },
  professional: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#6366f1',
    background: '#f8fafc',
    text: '#0f172a'
  }
};

// Mapping from business categories to theme IDs
export const CATEGORY_THEME_MAPPING: { [category: string]: string[] } = {
  restaurant: ['restaurant', 'ananke', 'bigspring'],
  food: ['restaurant', 'ananke', 'bigspring'],
  hospitality: ['restaurant', 'ananke', 'bigspring'],
  retail: ['hargo', 'bigspring', 'ananke'],
  ecommerce: ['hargo', 'bigspring', 'ananke'],
  technology: ['clarity', 'terminal', 'papermod'],
  tech: ['clarity', 'terminal', 'papermod'],
  creative: ['terminal', 'papermod', 'ananke'],
  design: ['terminal', 'papermod', 'ananke'],
  medical: ['ananke', 'papermod', 'mainroad'],
  healthcare: ['ananke', 'papermod', 'mainroad'],
  professional: ['ananke', 'bigspring', 'papermod'],
  legal: ['ananke', 'mainroad', 'papermod'],
  finance: ['ananke', 'bigspring', 'mainroad'],
  blog: ['papermod', 'mainroad', 'clarity'],
  news: ['mainroad', 'papermod', 'clarity'],
  portfolio: ['terminal', 'ananke', 'papermod']
};

// Helper functions
export function getThemeById(themeId: string): ThemeConfig | undefined {
  return VERIFIED_THEMES.find(theme => theme.id === themeId);
}

export function getThemesByCategory(category: string): ThemeConfig[] {
  const themeIds = CATEGORY_THEME_MAPPING[category.toLowerCase()] || [];
  return themeIds.map(id => getThemeById(id)).filter(theme => theme !== undefined) as ThemeConfig[];
}

export function getColorSchemeForIndustry(industry: string): ColorScheme {
  return INDUSTRY_COLORS[industry.toLowerCase()] || {
    primary: '#2563eb',
    secondary: '#3b82f6',
    accent: '#60a5fa',
    background: '#ffffff',
    text: '#1f2937'
  };
}
