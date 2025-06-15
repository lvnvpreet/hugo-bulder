import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Search, Filter } from 'lucide-react';
import { cn } from '../../../utils';
import type { BusinessCategory } from '../../../types/wizard';

const Step2BusinessCategory: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [selectedCategory, setSelectedCategory] = React.useState(data.businessCategory);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredCategories, setFilteredCategories] = React.useState<BusinessCategory[]>([]);

  interface BusinessCategory {
    id: string;
    name: string;
    industry: string;
    description: string;
    services: string[];
    icon: string;
    isPopular?: boolean;
    examples?: string[];
  }

  const businessCategories: BusinessCategory[] = [
    {
      id: 'technology',
      name: 'Technology & Software',
      industry: 'Technology',
      description: 'Software development, IT services, tech consulting',
      services: ['Web Development', 'Mobile Apps', 'IT Support', 'Cloud Services', 'Consulting'],
      icon: '💻',
      isPopular: true,
      examples: ['Software companies', 'IT consultants', 'Web agencies']
    },
    {
      id: 'healthcare',
      name: 'Healthcare & Medical',
      industry: 'Healthcare',
      description: 'Medical practices, healthcare services, wellness',
      services: ['Appointments', 'Patient Portal', 'Services', 'Staff Directory', 'Insurance Info'],
      icon: '🏥',
      isPopular: true,
      examples: ['Doctors', 'Dentists', 'Therapists', 'Clinics']
    },
    {
      id: 'professional',
      name: 'Professional Services',
      industry: 'Professional',
      description: 'Legal, accounting, consulting, financial services',
      services: ['Consultations', 'Case Studies', 'Team Profiles', 'Resource Library', 'Contact'],
      icon: '⚖️',
      isPopular: true,
      examples: ['Lawyers', 'Accountants', 'Consultants', 'Financial advisors']
    },
    {
      id: 'restaurant',
      name: 'Restaurant & Food Service',
      industry: 'Food & Beverage',
      description: 'Restaurants, cafes, catering, food delivery',
      services: ['Menu', 'Online Ordering', 'Reservations', 'Catering', 'Location'],
      icon: '🍽️',
      isPopular: true,
      examples: ['Restaurants', 'Cafes', 'Food trucks', 'Catering']
    },
    {
      id: 'retail',
      name: 'Retail & E-commerce',
      industry: 'Retail',
      description: 'Online stores, retail businesses, product sales',
      services: ['Product Catalog', 'Shopping Cart', 'Payment Processing', 'Inventory', 'Shipping'],
      icon: '🛍️',
      isPopular: true,
      examples: ['Online stores', 'Boutiques', 'Marketplaces']
    },
    {
      id: 'realestate',
      name: 'Real Estate',
      industry: 'Real Estate',
      description: 'Real estate agents, property management, rentals',
      services: ['Property Listings', 'Search Tools', 'Agent Profiles', 'Market Analysis', 'Contact'],
      icon: '🏠',
      isPopular: false,
      examples: ['Real estate agents', 'Property managers', 'Brokers']
    },
    {
      id: 'education',
      name: 'Education & Training',
      industry: 'Education',
      description: 'Schools, online courses, training programs',
      services: ['Course Catalog', 'Enrollment', 'Resources', 'Instructor Profiles', 'Certifications'],
      icon: '🎓',
      isPopular: false,
      examples: ['Schools', 'Online courses', 'Training centers']
    },
    {
      id: 'creative',
      name: 'Creative & Design',
      industry: 'Creative',
      description: 'Design agencies, photographers, artists, creative services',
      services: ['Portfolio', 'Service Packages', 'Client Gallery', 'Testimonials', 'Booking'],
      icon: '🎨',
      isPopular: false,
      examples: ['Designers', 'Photographers', 'Artists', 'Agencies']
    },
    {
      id: 'automotive',
      name: 'Automotive',
      industry: 'Automotive',
      description: 'Auto dealers, repair shops, automotive services',
      services: ['Inventory', 'Service Booking', 'Parts Catalog', 'Financing', 'Location'],
      icon: '🚗',
      isPopular: false,
      examples: ['Car dealers', 'Auto repair', 'Car rental']
    },
    {
      id: 'nonprofit',
      name: 'Non-Profit Organization',
      industry: 'Non-Profit',
      description: 'Charities, foundations, community organizations',
      services: ['Mission Statement', 'Donation Portal', 'Events', 'Volunteer Sign-up', 'Impact Stories'],
      icon: '❤️',
      isPopular: false,
      examples: ['Charities', 'Foundations', 'Community groups']
    },
    {
      id: 'homeservices',
      name: 'Home Services',
      industry: 'Home Services',
      description: 'Plumbing, HVAC, cleaning, landscaping, home repair',
      services: ['Service Areas', 'Online Booking', 'Emergency Services', 'Estimates', 'Reviews'],
      icon: '🔧',
      isPopular: false,
      examples: ['Plumbers', 'Electricians', 'Cleaners', 'Landscapers']
    },
    {
      id: 'beauty',
      name: 'Beauty & Wellness',
      industry: 'Beauty & Wellness',
      description: 'Salons, spas, fitness, wellness services',
      services: ['Appointment Booking', 'Service Menu', 'Staff Profiles', 'Packages', 'Gift Cards'],
      icon: '💄',
      isPopular: false,
      examples: ['Salons', 'Spas', 'Gyms', 'Wellness centers']
    }
  ];

  // Filter categories based on search term
  React.useEffect(() => {
    if (searchTerm) {
      const filtered = businessCategories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.services.some(service => 
          service.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(businessCategories);
    }
  }, [searchTerm]);

  const handleCategorySelect = (category: BusinessCategory) => {
    const categoryData = {
      id: category.id,
      name: category.name,
      industry: category.industry,
      services: category.services
    };
    
    setSelectedCategory(categoryData);
    updateData('businessCategory', categoryData);
    
    console.log('Business category selected:', category.id);
  };

  // Only show this step if website type is business or ecommerce
  const shouldShowStep = data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce';
  
  if (!shouldShowStep) {
    return null;
  }

  return (
    <div className="space-y-6">      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          What type of business do you have?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Select your business category to get industry-specific features and content suggestions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search business categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full"
        />
      </div>

      {/* Popular Categories */}
      {!searchTerm && (
        <div className="space-y-4">          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Popular Categories</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessCategories
              .filter(category => category.isPopular)
              .map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory?.id === category.id}
                  onSelect={handleCategorySelect}
                  isPopular={true}
                />
              ))}
          </div>
        </div>
      )}      {/* All Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {searchTerm ? 'Search Results' : 'All Categories'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategory?.id === category.id}
              onSelect={handleCategorySelect}
              isPopular={false}
            />
          ))}
        </div>
      </div>      {/* No Results */}
      {searchTerm && filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No categories found matching "{searchTerm}"</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Try a different search term or browse all categories above.
          </p>
        </div>
      )}

      {/* Selection Summary */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-8"
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{businessCategories.find(c => c.id === selectedCategory.id)?.icon}</div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Selected: {selectedCategory.name}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                We'll automatically include relevant services and features for your industry.
              </p>
              <div className="mt-2">
                <p className="text-xs text-blue-600 font-medium">Suggested services:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCategory.services.slice(0, 3).map((service, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                  {selectedCategory.services.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedCategory.services.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Category Card Component
interface CategoryCardProps {
  category: BusinessCategory & { examples?: string[] };
  isSelected: boolean;
  onSelect: (category: any) => void;
  isPopular: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, isSelected, onSelect, isPopular }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card        className={cn(
          "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
          isSelected 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800" 
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600"
        )}
        onClick={() => onSelect(category)}
      >
        <div className="p-4">
          {/* Popular Badge */}
          {isPopular && (
            <div className="absolute -top-2 -right-2">
              <Badge className="bg-orange-500 text-white text-xs">
                Popular
              </Badge>
            </div>
          )}

          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="text-2xl">{category.icon}</div>
            <div className="flex-1">              <h3 className={cn(
                "font-semibold text-sm",
                isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
              )}>
                {category.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{category.industry}</p>
            </div>
          </div>          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
            {category.description}
          </p>

          {/* Examples */}
          {category.examples && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Examples:</span> {category.examples.join(', ')}
            </div>
          )}

          {/* Selection Indicator */}
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2"
            >
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default Step2BusinessCategory;
