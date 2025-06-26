// Core types for the website builder application

// Export wizard types
export * from './wizard';

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  wizardData: WizardData
  generatedContent?: GeneratedContent
  createdAt: string
  updatedAt: string
  userId: string
}

export enum ProjectStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PUBLISHED = 'published'
}

// Wizard step data types
export interface WizardData {
  websiteType?: WebsiteType
  businessInfo?: BusinessInfo
  websiteStructure?: WebsiteStructure
  designPreferences?: DesignPreferences
  contentPreferences?: ContentPreferences
  contactInfo?: ContactInfo
  seoSettings?: SeoSettings
  additionalFeatures?: AdditionalFeatures
}

export interface WebsiteType {
  id?: string
  category: string
  subcategory?: string
  description: string
  tags?: string[]
  allowedCategories?: string[] // Array of business category IDs allowed for this website type
}

export interface BusinessInfo {
  name: string
  tagline?: string
  description: string
  industry: string
  targetAudience: string
  uniqueSellingPoints: string[]
  yearEstablished?: number
  companySize?: string
}

export interface WebsiteStructure {
  type: 'single-page' | 'multi-page'
  selectedPages: string[]
  selectedSections: string[]
  navigationStyle: 'horizontal' | 'vertical' | 'sidebar'
  includeSearch: boolean
  includeBlog: boolean
  includeEcommerce: boolean
}

export interface DesignPreferences {
  colorScheme: ColorScheme
  typography: Typography
  layout: LayoutStyle
  imagery: ImageryStyle
  animations: AnimationLevel
}

export interface ColorScheme {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  mode: 'light' | 'dark' | 'auto'
}

export interface Typography {
  headingFont: string
  bodyFont: string
  fontSize: 'small' | 'medium' | 'large'
  fontWeight: 'light' | 'normal' | 'bold'
}

export interface LayoutStyle {
  style: 'modern' | 'classic' | 'minimal' | 'creative'
  spacing: 'tight' | 'normal' | 'spacious'
  borderRadius: 'none' | 'small' | 'medium' | 'large'
}

export interface ImageryStyle {
  style: 'photography' | 'illustrations' | 'icons' | 'mixed'
  quality: 'standard' | 'high'
  includePlaceholders: boolean
}

export interface AnimationLevel {
  level: 'none' | 'subtle' | 'moderate' | 'dynamic'
  includeHover: boolean
  includeTransitions: boolean
}

export interface ContentPreferences {
  tone: ContentTone
  length: ContentLength
  includeSampleContent: boolean
  contentSections: ContentSection[]
  callToAction: CallToAction
}

export interface ContentTone {
  style: 'professional' | 'friendly' | 'creative' | 'technical' | 'casual'
  personality: string[]
}

export interface ContentLength {
  homepage: 'brief' | 'detailed' | 'comprehensive'
  pages: 'brief' | 'detailed' | 'comprehensive'
  descriptions: 'short' | 'medium' | 'long'
}

export interface ContentSection {
  id: string
  title: string
  type: 'text' | 'image' | 'video' | 'gallery' | 'form' | 'testimonials'
  required: boolean
  order: number
}

export interface CallToAction {
  primary: string
  secondary?: string
  style: 'button' | 'link' | 'banner'
  placement: string[]
}

export interface ContactInfo {
  email: string
  phone?: string
  address?: Address
  socialMedia: SocialMediaLink[]
  businessHours?: BusinessHours
  contactMethods: string[]
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface SocialMediaLink {
  platform: string
  url: string
  displayName?: string
}

export interface BusinessHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

export interface SeoSettings {
  title: string
  description: string
  keywords: string[]
  enableAnalytics: boolean
  enableSitemap: boolean
  customMetaTags: MetaTag[]
}

export interface MetaTag {
  name: string
  content: string
  property?: string
}

export interface AdditionalFeatures {
  features: string[]
  integrations: Integration[]
  customRequests: string[]
}

export interface Integration {
  name: string
  type: 'analytics' | 'marketing' | 'social' | 'payment' | 'other'
  settings: Record<string, any>
}

// Generated content types
export interface GeneratedContent {
  pages: GeneratedPage[]
  components: GeneratedComponent[]
  assets: GeneratedAsset[]
  config: SiteConfig
  meta: GenerationMeta
}

export interface GeneratedPage {
  id: string
  title: string
  slug: string
  content: string
  sections: PageSection[]
  seo: SEOData
  template: string
}

export interface PageSection {
  id: string
  type: string
  title?: string
  content: string
  data: Record<string, any>
  order: number
}

export interface GeneratedComponent {
  id: string
  name: string
  type: string
  props: Record<string, any>
  children?: GeneratedComponent[]
}

export interface GeneratedAsset {
  id: string
  name: string
  type: 'image' | 'video' | 'document' | 'font' | 'icon'
  url: string
  alt?: string
  description?: string
}

export interface SiteConfig {
  title: string
  description: string
  url: string
  language: string
  theme: string
  navigation: NavigationItem[]
  footer: FooterConfig
}

export interface NavigationItem {
  title: string
  url: string
  children?: NavigationItem[]
  external?: boolean
}

export interface FooterConfig {
  copyright: string
  links: NavigationItem[]
  socialLinks: SocialMediaLink[]
}

export interface SEOData {
  title: string
  description: string
  keywords: string[]
  openGraph: OpenGraphData
  twitterCard: TwitterCardData
}

export interface OpenGraphData {
  title: string
  description: string
  image?: string
  url: string
  type: string
}

export interface TwitterCardData {
  card: string
  title: string
  description: string
  image?: string
}

export interface GenerationMeta {
  generatedAt: string
  aiModel: string
  prompt: string
  settings: Record<string, any>
  statistics: GenerationStats
}

export interface GenerationStats {
  totalPages: number
  totalSections: number
  totalWords: number
  generationTime: number
  aiRequestCount: number
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Wizard step data (simplified for the current implementation)
export interface SimpleWizardData {
  // Project Basics
  name?: string
  description?: string
  websiteType?: string
  domain?: string
  keywords?: string

  // Design Preferences
  colorScheme?: string
  designStyle?: string
  customColors?: {
    primary: string
    secondary: string
    accent: string
  }

  // Features Selection
  selectedFeatures?: string[]
  integrations?: string[]
  featuresSelection?: any

  // Content Details
  companyName?: string
  tagline?: string
  aboutUs?: string
  services?: string[]
  contentDetails?: any
  contactInfo?: {
    email: string
    phone?: string
    address?: string
    socialMedia?: {
      facebook?: string
      twitter?: string
      linkedin?: string
      instagram?: string
    }
  }
}

// Wizard store types
export interface WizardState {
  currentStep: number
  totalSteps: number
  data: SimpleWizardData
  isComplete: boolean
  errors: Record<string, string>
  isLoading: boolean
}

export interface WizardActions {
  setCurrentStep: (step: number) => void
  updateData: (stepData: Partial<SimpleWizardData>) => void
  nextStep: () => void
  previousStep: () => void
  resetWizard: () => void
  validateStep: (step: number) => boolean
  setError: (field: string, error: string) => void
  clearError: (field: string) => void
  setLoading: (loading: boolean) => void
}

// UI component props
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export interface InputProps extends BaseComponentProps {
  type?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  label?: string
  required?: boolean
  disabled?: boolean
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

export interface SelectProps extends BaseComponentProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  error?: string
  label?: string
  required?: boolean
  disabled?: boolean
  multiple?: boolean
}

// Constants for wizard options
// Constants for wizard options
export const websiteTypes = [
  { id: 'business', name: 'Business', description: 'Professional business website with services and contact info' },
  { id: 'portfolio', name: 'Portfolio', description: 'Showcase your work and creative projects' },
  { id: 'blog', name: 'Blog', description: 'Content-focused website for articles and posts' },
  { id: 'ecommerce', name: 'E-commerce', description: 'Online store to sell products or services' },
  { id: 'nonprofit', name: 'Non-profit', description: 'Organization website for causes and donations' },
  { id: 'education', name: 'Education', description: 'Educational institution or online courses' },
  { id: 'healthcare', name: 'Healthcare', description: 'Medical practice or health services' },
  { id: 'restaurant', name: 'Restaurant', description: 'Food service with menus and reservations' },
  { id: 'real-estate', name: 'Real Estate', description: 'Property listings and agent services' },
  { id: 'creative', name: 'Creative', description: 'Artist, designer, or creative professional' },
  { id: 'technology', name: 'Technology', description: 'Tech company or software services' },
  { id: 'personal', name: 'Personal', description: 'Personal website or resume' }
] as const

export const colorSchemes = [
  { name: 'blue', primary: '#3b82f6', secondary: '#1e40af', accent: '#60a5fa' },
  { name: 'green', primary: '#10b981', secondary: '#059669', accent: '#34d399' },
  { name: 'purple', primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
  { name: 'red', primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' },
  { name: 'orange', primary: '#f97316', secondary: '#ea580c', accent: '#fb923c' },
  { name: 'teal', primary: '#14b8a6', secondary: '#0d9488', accent: '#5eead4' },
  { name: 'pink', primary: '#ec4899', secondary: '#db2777', accent: '#f472b6' },
  { name: 'gray', primary: '#6b7280', secondary: '#374151', accent: '#9ca3af' }
] as const

export const designStyles = [
  { 
    id: 'modern', 
    name: 'Modern', 
    description: 'Clean lines, bold typography, and plenty of white space',
    features: ['Minimalist design', 'Bold typography', 'Clean layouts', 'Modern UI elements']
  },
  { 
    id: 'classic', 
    name: 'Classic', 
    description: 'Timeless design with traditional elements and elegant styling',
    features: ['Traditional layouts', 'Elegant typography', 'Balanced design', 'Professional look']
  },
  { 
    id: 'minimal', 
    name: 'Minimal', 
    description: 'Less is more - focus on content with minimal distractions',
    features: ['Ultra-clean design', 'Maximum white space', 'Simple navigation', 'Content-focused']
  },
  { 
    id: 'creative', 
    name: 'Creative', 
    description: 'Artistic and unique design with creative elements',
    features: ['Unique layouts', 'Artistic elements', 'Creative typography', 'Visual storytelling']
  },
  { 
    id: 'corporate', 
    name: 'Corporate', 
    description: 'Professional business design with trust and credibility',
    features: ['Professional appearance', 'Business-focused', 'Trustworthy design', 'Corporate branding']
  },
  { 
    id: 'startup', 
    name: 'Startup', 
    description: 'Dynamic and innovative design for modern businesses',
    features: ['Dynamic layouts', 'Innovation-focused', 'Modern elements', 'Growth-oriented']
  }
] as const

export const availableFeatures = {
  core: [
    { id: 'responsive-design', name: 'Responsive Design', description: 'Mobile-friendly layouts' },
    { id: 'contact-form', name: 'Contact Form', description: 'Simple contact form' },
    { id: 'gallery', name: 'Image Gallery', description: 'Photo galleries' },
    { id: 'about-page', name: 'About Page', description: 'Company information page' }
  ],
  advanced: [
    { id: 'blog', name: 'Blog System', description: 'Content management for blogs' },
    { id: 'ecommerce', name: 'E-commerce', description: 'Online store functionality' },
    { id: 'booking', name: 'Booking System', description: 'Appointment scheduling' },
    { id: 'membership', name: 'User Accounts', description: 'Member login system' }
  ],
  marketing: [
    { id: 'seo', name: 'SEO Optimization', description: 'Search engine optimization' },
    { id: 'analytics', name: 'Analytics', description: 'Website traffic tracking' },
    { id: 'newsletter', name: 'Newsletter', description: 'Email subscription' },
    { id: 'social-media', name: 'Social Integration', description: 'Social media feeds' }
  ],
  integrations: [
    { id: 'google-maps', name: 'Google Maps', description: 'Location mapping' },
    { id: 'payment', name: 'Payment Processing', description: 'Online payments' },
    { id: 'live-chat', name: 'Live Chat', description: 'Customer support chat' },
    { id: 'crm', name: 'CRM Integration', description: 'Customer relationship management' }
  ]
} as const

// Re-export commonly used types
export type { ReactNode } from 'react'

// Generation types for API
export interface GenerationRequest {
  websiteType: string;
  businessInfo: BusinessInfo;
  websiteStructure: WebsiteStructure;
  designPreferences: DesignPreferences;
  contentPreferences: ContentPreferences;
  contactInfo: ContactInfo;
  seoSettings: SeoSettings;
  additionalFeatures: AdditionalFeatures;
}

export interface GenerationStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  content?: GeneratedContent;
  errors?: string[];
}
