import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface BusinessCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  subcategories: string[];
  seoKeywords: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface HugoTheme {
  id: string;
  name: string;
  description: string;
  preview: string;
  demoUrl: string;
  features: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  responsive: boolean;
  darkMode: boolean;
  rating: number;
  downloads: number;
  lastUpdated: string;
}

export interface WebsiteStructure {
  id: string;
  name: string;
  description: string;
  type: 'SINGLE_PAGE' | 'MULTI_PAGE';
  pages: {
    name: string;
    path: string;
    required: boolean;
    description: string;
  }[];
  sections: {
    name: string;
    component: string;
    props: Record<string, any>;
  }[];
  businessTypes: string[];
}

export interface LocationData {
  country: string;
  code: string;
  states?: {
    name: string;
    code: string;
    cities?: string[];
  }[];
  timezone: string;
  currency: string;
  language: string;
}

export interface ContentSuggestion {
  id: string;
  category: string;
  type: 'headline' | 'description' | 'cta' | 'benefit' | 'feature';
  content: string;
  businessTypes: string[];
  context: string;
  variations: string[];
}

export class ReferenceDataService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getBusinessCategories(): Promise<BusinessCategory[]> {
    try {
      // Static data for business categories with comprehensive industry coverage
      const categories: BusinessCategory[] = [
        {
          id: 'restaurant',
          name: 'Restaurant & Food Service',
          description: 'Restaurants, cafes, food trucks, catering services',
          icon: '🍽️',
          subcategories: ['Fine Dining', 'Fast Food', 'Cafe', 'Bakery', 'Food Truck', 'Catering'],
          seoKeywords: ['restaurant', 'food', 'dining', 'menu', 'delivery', 'takeout'],
          colorScheme: { primary: '#E53E3E', secondary: '#FED7D7', accent: '#FC8181' }
        },
        {
          id: 'retail',
          name: 'Retail & E-commerce',
          description: 'Online stores, boutiques, and retail businesses',
          icon: '🛍️',
          subcategories: ['Fashion', 'Electronics', 'Home & Garden', 'Sports', 'Beauty', 'Books'],
          seoKeywords: ['shop', 'store', 'buy', 'online', 'retail', 'products'],
          colorScheme: { primary: '#3182CE', secondary: '#BEE3F8', accent: '#63B3ED' }
        },
        {
          id: 'healthcare',
          name: 'Healthcare & Medical',
          description: 'Medical practice, dental, veterinary, wellness',
          icon: '🏥',
          subcategories: ['General Practice', 'Dental', 'Veterinary', 'Specialist', 'Wellness', 'Mental Health'],
          seoKeywords: ['doctor', 'medical', 'health', 'appointment', 'clinic', 'treatment'],
          colorScheme: { primary: '#38A169', secondary: '#C6F6D5', accent: '#68D391' }
        },
        {
          id: 'professional',
          name: 'Professional Services',
          description: 'Law, accounting, consulting, real estate',
          icon: '💼',
          subcategories: ['Legal', 'Accounting', 'Consulting', 'Real Estate', 'Insurance', 'Financial'],
          seoKeywords: ['professional', 'service', 'expert', 'consultation', 'business'],
          colorScheme: { primary: '#319795', secondary: '#B2F5EA', accent: '#4FD1C7' }
        },
        {
          id: 'beauty',
          name: 'Beauty & Wellness',
          description: 'Salons, spas, fitness centers, wellness',
          icon: '💅',
          subcategories: ['Hair Salon', 'Day Spa', 'Fitness', 'Yoga', 'Massage', 'Wellness'],
          seoKeywords: ['beauty', 'salon', 'spa', 'wellness', 'fitness', 'relaxation'],
          colorScheme: { primary: '#D69E2E', secondary: '#FAF089', accent: '#F6E05E' }
        },
        {
          id: 'education',
          name: 'Education & Training',
          description: 'Schools, tutoring, online courses, training',
          icon: '📚',
          subcategories: ['Primary School', 'University', 'Online Courses', 'Tutoring', 'Corporate Training'],
          seoKeywords: ['education', 'school', 'course', 'learning', 'training', 'teach'],
          colorScheme: { primary: '#9F7AEA', secondary: '#E9D8FD', accent: '#B794F6' }
        },
        {
          id: 'technology',
          name: 'Technology & Software',
          description: 'Software companies, IT services, tech startups',
          icon: '💻',
          subcategories: ['Software Development', 'IT Services', 'SaaS', 'Mobile Apps', 'Web Development'],
          seoKeywords: ['technology', 'software', 'app', 'digital', 'IT', 'development'],
          colorScheme: { primary: '#4299E1', secondary: '#BEE3F8', accent: '#63B3ED' }
        },
        {
          id: 'creative',
          name: 'Creative & Media',
          description: 'Design agencies, photography, marketing',
          icon: '🎨',
          subcategories: ['Graphic Design', 'Photography', 'Video Production', 'Marketing', 'Advertising'],
          seoKeywords: ['creative', 'design', 'photography', 'marketing', 'branding', 'media'],
          colorScheme: { primary: '#ED64A6', secondary: '#FED7E2', accent: '#F687B3' }
        },
        {
          id: 'automotive',
          name: 'Automotive & Transportation',
          description: 'Auto repair, dealerships, transportation services',
          icon: '🚗',
          subcategories: ['Auto Repair', 'Car Dealership', 'Transportation', 'Rental', 'Parts & Accessories'],
          seoKeywords: ['automotive', 'car', 'repair', 'service', 'transportation', 'vehicle'],
          colorScheme: { primary: '#718096', secondary: '#E2E8F0', accent: '#A0AEC0' }
        },
        {
          id: 'home-services',
          name: 'Home & Property Services',
          description: 'Contractors, cleaning, landscaping, maintenance',
          icon: '🏠',
          subcategories: ['Construction', 'Cleaning', 'Landscaping', 'HVAC', 'Plumbing', 'Electrical'],
          seoKeywords: ['home', 'service', 'contractor', 'repair', 'maintenance', 'construction'],
          colorScheme: { primary: '#DD6B20', secondary: '#FEEBC8', accent: '#F6AD55' }
        }
      ];

      return categories;
    } catch (error) {
      throw new AppError('Failed to fetch business categories', 500, 'DATABASE_ERROR');
    }
  }
  async getHugoThemes(filters: { category?: string; featured?: boolean } = {}): Promise<HugoTheme[]> {
    try {
      // Static data for Hugo themes optimized for business websites
      let themes: HugoTheme[] = [
        {
          id: 'business-pro',
          name: 'Business Pro',
          description: 'Professional business theme with modern design and comprehensive features',
          preview: '/themes/business-pro/preview.jpg',
          demoUrl: 'https://demo.business-pro.com',
          features: ['Responsive Design', 'Contact Forms', 'SEO Optimized', 'Fast Loading', 'Multi-language'],
          category: 'business',
          difficulty: 'beginner',
          responsive: true,
          darkMode: true,
          rating: 4.8,
          downloads: 15420,
          lastUpdated: '2025-06-01'
        },
        {
          id: 'restaurant-deluxe',
          name: 'Restaurant Deluxe',
          description: 'Perfect for restaurants with menu showcase and reservation system',
          preview: '/themes/restaurant-deluxe/preview.jpg',
          demoUrl: 'https://demo.restaurant-deluxe.com',
          features: ['Menu Display', 'Reservation System', 'Photo Gallery', 'Location Map', 'Reviews'],
          category: 'restaurant',
          difficulty: 'beginner',
          responsive: true,
          darkMode: false,
          rating: 4.7,
          downloads: 8932,
          lastUpdated: '2025-05-28'
        },
        {
          id: 'medical-care',
          name: 'Medical Care',
          description: 'Healthcare theme with appointment booking and service showcase',
          preview: '/themes/medical-care/preview.jpg',
          demoUrl: 'https://demo.medical-care.com',
          features: ['Appointment Booking', 'Service Pages', 'Doctor Profiles', 'Insurance Info', 'Contact Forms'],
          category: 'healthcare',
          difficulty: 'intermediate',
          responsive: true,
          darkMode: false,
          rating: 4.6,
          downloads: 6843,
          lastUpdated: '2025-06-10'
        },
        {
          id: 'creative-studio',
          name: 'Creative Studio',
          description: 'Modern portfolio theme for creative professionals and agencies',
          preview: '/themes/creative-studio/preview.jpg',
          demoUrl: 'https://demo.creative-studio.com',
          features: ['Portfolio Gallery', 'Project Showcase', 'Team Profiles', 'Blog', 'Contact Forms'],
          category: 'creative',
          difficulty: 'intermediate',
          responsive: true,
          darkMode: true,
          rating: 4.9,
          downloads: 12567,
          lastUpdated: '2025-06-05'
        },
        {
          id: 'tech-startup',
          name: 'Tech Startup',
          description: 'Modern SaaS and technology company theme with feature highlights',
          preview: '/themes/tech-startup/preview.jpg',
          demoUrl: 'https://demo.tech-startup.com',
          features: ['Product Features', 'Pricing Tables', 'API Documentation', 'Team Section', 'Blog'],
          category: 'technology',
          difficulty: 'advanced',
          responsive: true,
          darkMode: true,
          rating: 4.8,
          downloads: 9876,
          lastUpdated: '2025-06-12'
        },
        {
          id: 'retail-store',
          name: 'Retail Store',
          description: 'E-commerce ready theme with product showcase and shopping features',
          preview: '/themes/retail-store/preview.jpg',
          demoUrl: 'https://demo.retail-store.com',
          features: ['Product Catalog', 'Shopping Cart', 'Payment Integration', 'Inventory Display', 'Reviews'],
          category: 'retail',
          difficulty: 'intermediate',
          responsive: true,
          darkMode: false,
          rating: 4.5,
          downloads: 7234,
          lastUpdated: '2025-05-30'
        }      ];

      // Apply filters
      if (filters.category) {
        themes = themes.filter(theme => theme.category === filters.category);
      }
      
      if (filters.featured) {
        themes = themes.filter(theme => theme.rating >= 4.5 && theme.downloads > 10000);
      }

      return themes;
    } catch (error) {
      throw new AppError('Failed to fetch Hugo themes', 500, 'DATABASE_ERROR');
    }
  }

  async getWebsiteStructures(filters: { type?: 'SINGLE_PAGE' | 'MULTI_PAGE' } = {}): Promise<WebsiteStructure[]> {
    try {
      const structures: WebsiteStructure[] = [        {
          id: 'business-standard',
          name: 'Standard Business Website',
          description: 'Complete business website with all essential pages',
          type: 'MULTI_PAGE',
          pages: [
            { name: 'Home', path: '/', required: true, description: 'Main landing page with company overview' },
            { name: 'About', path: '/about', required: true, description: 'Company history, mission, and team' },
            { name: 'Services', path: '/services', required: true, description: 'Services or products offered' },
            { name: 'Contact', path: '/contact', required: true, description: 'Contact information and form' },
            { name: 'Blog', path: '/blog', required: false, description: 'Company blog and news' },
            { name: 'Privacy Policy', path: '/privacy', required: true, description: 'Privacy policy and terms' }
          ],
          sections: [
            { name: 'Hero Section', component: 'Hero', props: { hasVideo: false, hasImage: true } },
            { name: 'Services Overview', component: 'ServicesGrid', props: { columns: 3 } },
            { name: 'About Summary', component: 'AboutSection', props: { hasTeam: true } },
            { name: 'Testimonials', component: 'TestimonialSlider', props: { autoPlay: true } },
            { name: 'Contact CTA', component: 'ContactCTA', props: { hasForm: true } }
          ],
          businessTypes: ['professional', 'technology', 'creative']
        },
        {
          id: 'restaurant-complete',
          name: 'Restaurant Website',
          description: 'Full restaurant website with menu and reservations',
          pages: [
            { name: 'Home', path: '/', required: true, description: 'Welcome page with atmosphere showcase' },
            { name: 'Menu', path: '/menu', required: true, description: 'Full menu with prices and descriptions' },
            { name: 'About', path: '/about', required: true, description: 'Restaurant story and chef information' },
            { name: 'Reservations', path: '/reservations', required: true, description: 'Online booking system' },
            { name: 'Gallery', path: '/gallery', required: false, description: 'Food and restaurant photos' },
            { name: 'Contact', path: '/contact', required: true, description: 'Location, hours, and contact info' }
          ],
          sections: [
            { name: 'Hero Banner', component: 'RestaurantHero', props: { hasReservationButton: true } },
            { name: 'Featured Menu', component: 'MenuHighlight', props: { itemCount: 6 } },
            { name: 'About Restaurant', component: 'RestaurantStory', props: { hasChefInfo: true } },
            { name: 'Photo Gallery', component: 'ImageGallery', props: { layout: 'masonry' } },
            { name: 'Location & Hours', component: 'LocationInfo', props: { hasMap: true } }
          ],
          businessTypes: ['restaurant']
        },
        {
          id: 'healthcare-standard',
          name: 'Healthcare Practice',
          description: 'Medical practice website with appointment booking',
          pages: [
            { name: 'Home', path: '/', required: true, description: 'Practice overview and services' },
            { name: 'Services', path: '/services', required: true, description: 'Medical services offered' },
            { name: 'Doctors', path: '/doctors', required: true, description: 'Doctor profiles and specialties' },
            { name: 'Appointments', path: '/appointments', required: true, description: 'Online appointment booking' },
            { name: 'Patient Info', path: '/patient-info', required: true, description: 'Forms and patient resources' },
            { name: 'Contact', path: '/contact', required: true, description: 'Office locations and contact' }
          ],
          sections: [
            { name: 'Practice Hero', component: 'MedicalHero', props: { hasAppointmentButton: true } },
            { name: 'Services Grid', component: 'MedicalServices', props: { showIcons: true } },
            { name: 'Doctor Profiles', component: 'DoctorCards', props: { showSpecialties: true } },
            { name: 'Patient Testimonials', component: 'PatientReviews', props: { showRatings: true } },
            { name: 'Office Information', component: 'OfficeInfo', props: { showInsurance: true } }
          ],
          businessTypes: ['healthcare']
        },
        {
          id: 'ecommerce-basic',
          name: 'E-commerce Store',
          description: 'Online store with product catalog and shopping features',
          pages: [
            { name: 'Home', path: '/', required: true, description: 'Store homepage with featured products' },
            { name: 'Products', path: '/products', required: true, description: 'Full product catalog' },
            { name: 'Product Detail', path: '/product/:id', required: true, description: 'Individual product pages' },
            { name: 'Cart', path: '/cart', required: true, description: 'Shopping cart and checkout' },
            { name: 'About', path: '/about', required: true, description: 'Store information and policies' },
            { name: 'Contact', path: '/contact', required: true, description: 'Customer service contact' }
          ],
          sections: [
            { name: 'Store Hero', component: 'EcommerceHero', props: { hasPromotion: true } },
            { name: 'Featured Products', component: 'ProductGrid', props: { columns: 4 } },
            { name: 'Categories', component: 'CategoryNav', props: { showImages: true } },
            { name: 'Promotions', component: 'PromoSection', props: { hasCountdown: true } },
            { name: 'Newsletter', component: 'NewsletterSignup', props: { hasDiscount: true } }
          ],
          businessTypes: ['retail']        }
      ];

      // Apply filters
      let filteredStructures = structures;
      if (filters.type) {
        filteredStructures = structures.filter(structure => structure.type === filters.type);
      }

      return filteredStructures;
    } catch (error) {
      throw new AppError('Failed to fetch website structures', 500, 'DATABASE_ERROR');
    }
  }

  async getLocationData(): Promise<LocationData[]> {
    try {
      // Comprehensive location data for major countries
      const locationData: LocationData[] = [
        {
          country: 'United States',
          code: 'US',
          states: [
            {
              name: 'California',
              code: 'CA',
              cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose']
            },
            {
              name: 'New York',
              code: 'NY',
              cities: ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany']
            },
            {
              name: 'Texas',
              code: 'TX',
              cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth']
            },
            {
              name: 'Florida',
              code: 'FL',
              cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale']
            }
          ],
          timezone: 'America/New_York',
          currency: 'USD',
          language: 'en-US'
        },
        {
          country: 'Canada',
          code: 'CA',
          states: [
            {
              name: 'Ontario',
              code: 'ON',
              cities: ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Windsor']
            },
            {
              name: 'British Columbia',
              code: 'BC',
              cities: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond']
            },
            {
              name: 'Quebec',
              code: 'QC',
              cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil']
            }
          ],
          timezone: 'America/Toronto',
          currency: 'CAD',
          language: 'en-CA'
        },
        {
          country: 'United Kingdom',
          code: 'GB',
          states: [
            {
              name: 'England',
              code: 'ENG',
              cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Bristol']
            },
            {
              name: 'Scotland',
              code: 'SCT',
              cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Stirling']
            },
            {
              name: 'Wales',
              code: 'WLS',
              cities: ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Bangor']
            }
          ],
          timezone: 'Europe/London',
          currency: 'GBP',
          language: 'en-GB'
        },
        {
          country: 'Australia',
          code: 'AU',
          states: [
            {
              name: 'New South Wales',
              code: 'NSW',
              cities: ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast', 'Albury']
            },
            {
              name: 'Victoria',
              code: 'VIC',
              cities: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton']
            },
            {
              name: 'Queensland',
              code: 'QLD',
              cities: ['Brisbane', 'Gold Coast', 'Townsville', 'Cairns', 'Toowoomba']
            }
          ],
          timezone: 'Australia/Sydney',
          currency: 'AUD',
          language: 'en-AU'
        }
      ];

      return locationData;
    } catch (error) {
      throw new AppError('Failed to fetch location data', 500, 'DATABASE_ERROR');
    }
  }

  async getContentSuggestions(businessType?: string, contentType?: string): Promise<ContentSuggestion[]> {
    try {
      const suggestions: ContentSuggestion[] = [
        // Restaurant Content
        {
          id: 'restaurant-headline-1',
          category: 'restaurant',
          type: 'headline',
          content: 'Experience Authentic Flavors in Every Bite',
          businessTypes: ['restaurant'],
          context: 'main hero section',
          variations: [
            'Taste the Difference Quality Makes',
            'Where Every Meal is a Celebration',
            'Fresh Ingredients, Bold Flavors, Unforgettable Experience'
          ]
        },
        {
          id: 'restaurant-cta-1',
          category: 'restaurant',
          type: 'cta',
          content: 'Reserve Your Table Today',
          businessTypes: ['restaurant'],
          context: 'primary call-to-action',
          variations: ['Book Now', 'Make a Reservation', 'Secure Your Spot']
        },
        
        // Healthcare Content
        {
          id: 'healthcare-headline-1',
          category: 'healthcare',
          type: 'headline',
          content: 'Your Health, Our Priority - Comprehensive Care You Can Trust',
          businessTypes: ['healthcare'],
          context: 'main hero section',
          variations: [
            'Compassionate Care for Every Stage of Life',
            'Advanced Medicine with a Personal Touch',
            'Excellence in Healthcare, Dedicated to You'
          ]
        },
        {
          id: 'healthcare-benefit-1',
          category: 'healthcare',
          type: 'benefit',
          content: '24/7 emergency care with board-certified physicians',
          businessTypes: ['healthcare'],
          context: 'services section',
          variations: [
            'Round-the-clock medical support',
            'Always available when you need us most',
            'Emergency care that never sleeps'
          ]
        },

        // Professional Services Content
        {
          id: 'professional-headline-1',
          category: 'professional',
          type: 'headline',
          content: 'Expert Solutions for Your Business Success',
          businessTypes: ['professional'],
          context: 'main hero section',
          variations: [
            'Professional Excellence You Can Rely On',
            'Strategic Solutions for Complex Challenges',
            'Your Trusted Partner in Business Growth'
          ]
        },
        {
          id: 'professional-feature-1',
          category: 'professional',
          type: 'feature',
          content: 'Free initial consultation to understand your needs',
          businessTypes: ['professional'],
          context: 'services section',
          variations: [
            'Complimentary strategy session',
            'No-cost initial assessment',
            'Free consultation to get started'
          ]
        },

        // Technology Content
        {
          id: 'technology-headline-1',
          category: 'technology',
          type: 'headline',
          content: 'Innovation That Drives Your Digital Transformation',
          businessTypes: ['technology'],
          context: 'main hero section',
          variations: [
            'Cutting-Edge Solutions for Modern Businesses',
            'Technology That Accelerates Growth',
            'Digital Innovation Simplified'
          ]
        },
        {
          id: 'technology-cta-1',
          category: 'technology',
          type: 'cta',
          content: 'Start Your Free Trial',
          businessTypes: ['technology'],
          context: 'primary call-to-action',
          variations: ['Get Started Free', 'Try It Now', 'Free Demo']
        },

        // Retail Content
        {
          id: 'retail-headline-1',
          category: 'retail',
          type: 'headline',
          content: 'Discover Quality Products at Unbeatable Prices',
          businessTypes: ['retail'],
          context: 'main hero section',
          variations: [
            'Shop Smart, Save More',
            'Quality You Can Trust, Prices You\'ll Love',
            'Premium Products, Affordable Prices'
          ]
        },
        {
          id: 'retail-benefit-1',
          category: 'retail',
          type: 'benefit',
          content: 'Free shipping on orders over $50',
          businessTypes: ['retail'],
          context: 'promotional section',
          variations: [
            'Complimentary delivery on qualifying orders',
            'No shipping fees on orders $50+',
            'Free delivery when you spend $50 or more'
          ]
        }
      ];

      // Filter by business type if provided
      let filteredSuggestions = suggestions;
      if (businessType) {
        filteredSuggestions = suggestions.filter(s => 
          s.businessTypes.includes(businessType) || s.category === businessType
        );
      }

      // Filter by content type if provided
      if (contentType) {
        filteredSuggestions = filteredSuggestions.filter(s => s.type === contentType);
      }

      return filteredSuggestions;
    } catch (error) {
      throw new AppError('Failed to fetch content suggestions', 500, 'DATABASE_ERROR');
    }
  }

  async searchContent(query: string, businessType?: string): Promise<ContentSuggestion[]> {
    try {
      const allSuggestions = await this.getContentSuggestions(businessType);
      
      const searchTerms = query.toLowerCase().split(' ');
      
      return allSuggestions.filter(suggestion => {
        const searchableText = `${suggestion.content} ${suggestion.context} ${suggestion.variations.join(' ')}`.toLowerCase();
        return searchTerms.some(term => searchableText.includes(term));
      });
    } catch (error) {
      throw new AppError('Failed to search content suggestions', 500, 'DATABASE_ERROR');
    }  }
}

// Singleton instance
export const referenceDataService = new ReferenceDataService(new PrismaClient());
