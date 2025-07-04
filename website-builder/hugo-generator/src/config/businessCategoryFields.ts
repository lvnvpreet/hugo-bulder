/**
 * Business Category Field Mappings
 * Define what front matter fields each business type should have
 */

export const BUSINESS_CATEGORY_FIELDS = {
  healthcare: {
    universal: ['price', 'benefits', 'features'],
    // Base healthcare fields that ALL healthcare types share
    base: {
      duration: { type: 'string', default: '' },
      booking_required: { type: 'boolean', default: true },
      emergency_service: { type: 'boolean', default: false },
      insurance_accepted: { type: 'boolean', default: true },
      appointment_types: { type: 'array', default: ['consultation', 'follow-up'] }
    },
    // Subcategory-specific fields for different healthcare types
    subcategories: {
      dental: {
        specialty: { type: 'string', default: 'General Dentistry' },
        procedures: { type: 'array', default: [] },
        sedation_available: { type: 'boolean', default: false },
        teeth_whitening: { type: 'boolean', default: false },
        orthodontics: { type: 'boolean', default: false },
        oral_surgery: { type: 'boolean', default: false }
      },
      medical: {
        specialty: { type: 'string', default: 'Family Medicine' },
        board_certified: { type: 'boolean', default: true },
        telemedicine: { type: 'boolean', default: false },
        lab_services: { type: 'boolean', default: false },
        imaging_services: { type: 'array', default: [] },
        referrals_required: { type: 'boolean', default: false }
      },
      veterinary: {
        animal_types: { type: 'array', default: ['dogs', 'cats'] },
        emergency_hours: { type: 'boolean', default: false },
        surgery_available: { type: 'boolean', default: true },
        grooming_services: { type: 'boolean', default: false },
        boarding_available: { type: 'boolean', default: false },
        exotic_animals: { type: 'boolean', default: false }
      },
      mental_health: {
        therapy_type: { type: 'string', default: 'Individual Therapy' },
        specializations: { type: 'array', default: [] },
        age_groups: { type: 'array', default: ['adults'] },
        session_formats: { type: 'array', default: ['in-person'] },
        crisis_support: { type: 'boolean', default: false },
        group_therapy: { type: 'boolean', default: false }
      },
      optometry: {
        eye_exams: { type: 'boolean', default: true },
        contact_lenses: { type: 'boolean', default: true },
        eyeglass_fitting: { type: 'boolean', default: true },
        disease_treatment: { type: 'array', default: [] },
        pediatric_care: { type: 'boolean', default: false },
        surgery_referrals: { type: 'boolean', default: true }
      },
      dermatology: {
        skin_conditions: { type: 'array', default: [] },
        cosmetic_procedures: { type: 'boolean', default: false },
        skin_cancer_screening: { type: 'boolean', default: true },
        laser_treatments: { type: 'boolean', default: false },
        pediatric_dermatology: { type: 'boolean', default: false },
        mohs_surgery: { type: 'boolean', default: false }
      },
      chiropractic: {
        treatment_techniques: { type: 'array', default: [] },
        sports_injury: { type: 'boolean', default: false },
        massage_therapy: { type: 'boolean', default: false },
        rehabilitation: { type: 'boolean', default: true },
        x_ray_services: { type: 'boolean', default: false },
        wellness_programs: { type: 'boolean', default: false }
      }
    }
  },
  
  technology: {
    universal: ['price', 'benefits', 'features'],
    specific: {
      service_type: { type: 'string', default: 'consulting' },
      remote_available: { type: 'boolean', default: true },
      project_duration: { type: 'string', default: '' },
      tech_stack: { type: 'array', default: [] },
      consultation_required: { type: 'boolean', default: false }
    }
  },
  
  legal: {
    universal: ['benefits', 'features'],
    specific: {
      practice_area: { type: 'string', default: '' },
      consultation_fee: { type: 'string', default: '' },
      retainer_required: { type: 'boolean', default: false },
      court_representation: { type: 'boolean', default: false },
      jurisdiction: { type: 'array', default: [] }
    }
  },
  
  restaurant: {
    universal: ['features'],
    specific: {
      cuisine_type: { type: 'string', default: '' },
      dietary_options: { type: 'array', default: [] },
      reservation_required: { type: 'boolean', default: false },
      delivery_available: { type: 'boolean', default: true },
      price_range: { type: 'string', default: '$' }
    }
  },
  
  fitness: {
    universal: ['price', 'benefits', 'features'],
    specific: {
      session_duration: { type: 'string', default: '' },
      fitness_level: { type: 'string', default: 'all-levels' },
      equipment_needed: { type: 'array', default: [] },
      group_or_individual: { type: 'string', default: 'both' },
      membership_required: { type: 'boolean', default: false }
    }
  },
  
  // Fallback for any business type
  general: {
    universal: ['price', 'benefits', 'features'],
    specific: {
      consultation_available: { type: 'boolean', default: true },
      custom_pricing: { type: 'boolean', default: false },
      contact_required: { type: 'boolean', default: false }
    }
  }
};

/**
 * Get front matter fields configuration for a business category
 */
export function getBusinessCategoryFields(businessCategory: string) {
  return (BUSINESS_CATEGORY_FIELDS as any)[businessCategory] || BUSINESS_CATEGORY_FIELDS.general;
}

/**
 * Generate dynamic front matter for healthcare with subcategory support
 */
export function generateHealthcareFrontMatter(
  healthcareSubcategory: string,
  serviceData: any,
  serviceContent: any
): any {
  const config = getBusinessCategoryFields('healthcare');
  const frontMatter: any = {};
  
  // Add universal fields
  config.universal.forEach((field: string) => {
    if (serviceData[field] || serviceContent[field]) {
      frontMatter[field] = serviceData[field] || serviceContent[field];
    }
  });
  
  // Add base healthcare fields (common to all healthcare types)
  if (config.base) {
    Object.entries(config.base).forEach(([fieldName, fieldConfig]: [string, any]) => {
      if (serviceData[fieldName] !== undefined) {
        frontMatter[fieldName] = serviceData[fieldName];
      } else {
        frontMatter[fieldName] = fieldConfig.default;
      }
    });
  }
  
  // Add subcategory-specific fields
  if (config.subcategories && config.subcategories[healthcareSubcategory]) {
    const subcategoryFields = config.subcategories[healthcareSubcategory];
    Object.entries(subcategoryFields).forEach(([fieldName, fieldConfig]: [string, any]) => {
      if (serviceData[fieldName] !== undefined) {
        frontMatter[fieldName] = serviceData[fieldName];
      } else {
        frontMatter[fieldName] = fieldConfig.default;
      }
    });
  }
  
  return frontMatter;
}

/**
 * Generate dynamic front matter based on business category
 */
export function generateDynamicFrontMatter(
  businessCategory: string,
  serviceData: any,
  serviceContent: any,
  subcategory?: string
): any {
  // Special handling for healthcare with subcategories
  if (businessCategory === 'healthcare' && subcategory) {
    return generateHealthcareFrontMatter(subcategory, serviceData, serviceContent);
  }
  
  const config = getBusinessCategoryFields(businessCategory);
  const frontMatter: any = {};
  
  // Add universal fields
  config.universal.forEach((field: string) => {
    if (serviceData[field] || serviceContent[field]) {
      frontMatter[field] = serviceData[field] || serviceContent[field];
    }
  });
  
  // Add category-specific fields
  const specificFields = config.specific || config.base || {};
  Object.entries(specificFields).forEach(([fieldName, fieldConfig]: [string, any]) => {
    if (serviceData[fieldName] !== undefined) {
      frontMatter[fieldName] = serviceData[fieldName];
    } else {
      frontMatter[fieldName] = fieldConfig.default;
    }
  });
  
  return frontMatter;
}
