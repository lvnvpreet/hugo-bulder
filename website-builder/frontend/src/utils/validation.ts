import { z } from 'zod'

// Project Basics Schema
export const projectBasicsSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  websiteType: z.enum(['business', 'portfolio', 'blog', 'ecommerce', 'nonprofit', 'education', 'healthcare', 'restaurant', 'real-estate', 'creative', 'technology', 'personal'], {
    required_error: 'Website type is required'
  }),
  domain: z.string().optional(),
  keywords: z.string().optional()
})

export type ProjectBasics = z.infer<typeof projectBasicsSchema>

// Design Preferences Schema
export const designPreferencesSchema = z.object({
  colorScheme: z.enum(['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink', 'gray'], {
    required_error: 'Color scheme is required'
  }),
  designStyle: z.enum(['modern', 'classic', 'minimal', 'creative', 'corporate', 'startup'], {
    required_error: 'Design style is required'
  }),
  customColors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
    accent: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
  }).optional()
})

export type DesignPreferences = z.infer<typeof designPreferencesSchema>

// Features Selection Schema
export const featuresSelectionSchema = z.object({
  selectedFeatures: z.array(z.string()).min(1, 'At least one feature must be selected'),
  integrations: z.array(z.string()).optional()
})

export type FeaturesSelection = z.infer<typeof featuresSelectionSchema>

// Content Details Schema
export const contentDetailsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name must be less than 100 characters'),
  tagline: z.string().max(200, 'Tagline must be less than 200 characters').optional(),
  aboutUs: z.string().min(10, 'About us must be at least 10 characters').max(2000, 'About us must be less than 2000 characters'),
  services: z.array(z.string()).min(1, 'At least one service must be provided'),
  contactInfo: z.object({
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    address: z.string().optional(),
    socialMedia: z.object({
      facebook: z.string().url('Invalid URL').optional().or(z.literal('')),
      twitter: z.string().url('Invalid URL').optional().or(z.literal('')),
      linkedin: z.string().url('Invalid URL').optional().or(z.literal('')),
      instagram: z.string().url('Invalid URL').optional().or(z.literal(''))
    }).optional()
  })
})

export type ContentDetails = z.infer<typeof contentDetailsSchema>

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address')

export const urlSchema = z.string().url('Please enter a valid URL')

export const phoneSchema = z.string().regex(
  /^[\+]?[1-9][\d]{0,15}$/,
  'Please enter a valid phone number'
)

// Website Type validation
export const websiteTypeSchema = z.object({
  category: z.string().min(1, 'Please select a website category'),
  subcategory: z.string().optional(),
  description: z.string().min(10, 'Please provide a brief description (at least 10 characters)'),
  tags: z.array(z.string()).min(1, 'Please select at least one tag')
})

// Business Info validation
export const businessInfoSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  tagline: z.string().max(100, 'Tagline must be less than 100 characters').optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  industry: z.string().min(1, 'Please select an industry'),
  targetAudience: z.string().min(10, 'Please describe your target audience'),
  uniqueSellingPoints: z.array(z.string()).min(1, 'Please add at least one unique selling point'),
  yearEstablished: z.number().min(1800).max(new Date().getFullYear()).optional(),
  companySize: z.string().optional()
})

// Website Structure validation
export const websiteStructureSchema = z.object({
  type: z.enum(['single-page', 'multi-page'], {
    required_error: 'Please select a website structure type'
  }),
  selectedPages: z.array(z.string()).min(1, 'Please select at least one page'),
  selectedSections: z.array(z.string()).min(1, 'Please select at least one section'),
  navigationStyle: z.enum(['horizontal', 'vertical', 'sidebar']),
  includeSearch: z.boolean(),
  includeBlog: z.boolean(),
  includeEcommerce: z.boolean()
})

// Color Scheme validation
export const colorSchemeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color'),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color'),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color'),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color'),
  mode: z.enum(['light', 'dark', 'auto'])
})

// Typography validation
export const typographySchema = z.object({
  headingFont: z.string().min(1, 'Please select a heading font'),
  bodyFont: z.string().min(1, 'Please select a body font'),
  fontSize: z.enum(['small', 'medium', 'large']),
  fontWeight: z.enum(['light', 'normal', 'bold'])
})

// Layout Style validation
export const layoutStyleSchema = z.object({
  style: z.enum(['modern', 'classic', 'minimal', 'creative']),
  spacing: z.enum(['tight', 'normal', 'spacious']),
  borderRadius: z.enum(['none', 'small', 'medium', 'large'])
})

// Imagery Style validation
export const imageryStyleSchema = z.object({
  style: z.enum(['photography', 'illustrations', 'icons', 'mixed']),
  quality: z.enum(['standard', 'high']),
  includePlaceholders: z.boolean()
})

// Animation Level validation
export const animationLevelSchema = z.object({
  level: z.enum(['none', 'subtle', 'moderate', 'dynamic']),
  includeHover: z.boolean(),
  includeTransitions: z.boolean()
})

// Design Preferences validation (complete)
export const fullDesignPreferencesSchema = z.object({
  colorScheme: colorSchemeSchema,
  typography: typographySchema,
  layout: layoutStyleSchema,
  imagery: imageryStyleSchema,
  animations: animationLevelSchema
})

// Content Tone validation
export const contentToneSchema = z.object({
  style: z.enum(['professional', 'friendly', 'creative', 'technical', 'casual']),
  personality: z.array(z.string()).min(1, 'Please select at least one personality trait')
})

// Content Length validation
export const contentLengthSchema = z.object({
  homepage: z.enum(['brief', 'detailed', 'comprehensive']),
  pages: z.enum(['brief', 'detailed', 'comprehensive']),
  descriptions: z.enum(['short', 'medium', 'long'])
})

// Content Section validation
export const contentSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Section title is required'),
  type: z.enum(['text', 'image', 'video', 'gallery', 'form', 'testimonials']),
  required: z.boolean(),
  order: z.number()
})

// Call to Action validation
export const callToActionSchema = z.object({
  primary: z.string().min(1, 'Primary CTA text is required'),
  secondary: z.string().optional(),
  style: z.enum(['button', 'link', 'banner']),
  placement: z.array(z.string()).min(1, 'Please select at least one placement')
})

// Content Preferences validation
export const contentPreferencesSchema = z.object({
  tone: contentToneSchema,
  length: contentLengthSchema,
  includeSampleContent: z.boolean(),
  contentSections: z.array(contentSectionSchema),
  callToAction: callToActionSchema
})

// Address validation
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required')
})

// Social Media Link validation
export const socialMediaLinkSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  url: urlSchema,
  displayName: z.string().optional()
})

// Business Hours validation
export const businessHoursSchema = z.object({
  monday: z.string().optional(),
  tuesday: z.string().optional(),
  wednesday: z.string().optional(),
  thursday: z.string().optional(),
  friday: z.string().optional(),
  saturday: z.string().optional(),
  sunday: z.string().optional()
})

// Contact Info validation
export const contactInfoSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: addressSchema.optional(),
  socialMedia: z.array(socialMediaLinkSchema),
  businessHours: businessHoursSchema.optional(),
  contactMethods: z.array(z.string()).min(1, 'Please select at least one contact method')
})

// Meta Tag validation
export const metaTagSchema = z.object({
  name: z.string().min(1, 'Meta tag name is required'),
  content: z.string().min(1, 'Meta tag content is required'),
  property: z.string().optional()
})

// SEO Settings validation
export const seoSettingsSchema = z.object({
  title: z.string().min(1, 'SEO title is required').max(60, 'SEO title must be less than 60 characters'),
  description: z.string().min(1, 'SEO description is required').max(160, 'SEO description must be less than 160 characters'),
  keywords: z.array(z.string()).min(1, 'Please add at least one keyword'),
  enableAnalytics: z.boolean(),
  enableSitemap: z.boolean(),
  customMetaTags: z.array(metaTagSchema)
})

// Integration validation
export const integrationSchema = z.object({
  name: z.string().min(1, 'Integration name is required'),
  type: z.enum(['analytics', 'marketing', 'social', 'payment', 'other']),
  settings: z.record(z.any())
})

// Additional Features validation
export const additionalFeaturesSchema = z.object({
  features: z.array(z.string()),
  integrations: z.array(integrationSchema),
  customRequests: z.array(z.string())
})

// Complete Wizard Data validation
export const wizardSchema = z.object({
  websiteType: websiteTypeSchema.optional(),
  businessInfo: businessInfoSchema.optional(),
  websiteStructure: websiteStructureSchema.optional(),
  designPreferences: designPreferencesSchema.optional(),
  contentPreferences: contentPreferencesSchema.optional(),
  contactInfo: contactInfoSchema.optional(),
  seoSettings: seoSettingsSchema.optional(),
  additionalFeatures: additionalFeaturesSchema.optional()
})

// Project validation
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  wizardData: wizardSchema
})

// User validation
export const userSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  avatar: urlSchema.optional()
})

// Login validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters')
})

// Register validation
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Form validation helpers
export const validateWizardStep = (step: number, data: any) => {
  switch (step) {
    case 1:
      return websiteTypeSchema.safeParse(data.websiteType)
    case 2:
      return businessInfoSchema.safeParse(data.businessInfo)
    case 3:
      return websiteStructureSchema.safeParse(data.websiteStructure)
    case 4:
      return designPreferencesSchema.safeParse(data.designPreferences)
    case 5:
      return contentPreferencesSchema.safeParse(data.contentPreferences)
    case 6:
      return contactInfoSchema.safeParse(data.contactInfo)
    case 7:
      return seoSettingsSchema.safeParse(data.seoSettings)
    case 8:
      return additionalFeaturesSchema.safeParse(data.additionalFeatures)
    default:
      return { success: true, data: {} }
  }
}

// Export types for use in components
export type WizardFormData = z.infer<typeof wizardSchema>
export type ProjectFormData = z.infer<typeof projectSchema>
export type UserFormData = z.infer<typeof userSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
