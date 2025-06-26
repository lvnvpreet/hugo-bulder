import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  Layout, 
  FileText, 
  Grid3X3,
  Star
} from 'lucide-react';
import { cn } from '../../../utils';

const Step8WebsiteStructure: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [selectedType, setSelectedType] = React.useState<'single-page' | 'multi-page'>(
    data.websiteStructure?.type || 'single-page'
  );

  const isHealthcareCategory = data.businessCategory?.id === 'healthcare';

  // Update wizard data when form changes
  React.useEffect(() => {
    const structureData = {
      type: selectedType,
      // Remove detailed page/section selection - Hugo themes will handle this
      selectedSections: undefined,
      selectedPages: undefined,
      hasGallery: undefined,
      hasBlog: undefined,
      hasEcommerce: undefined
    };

    updateData('websiteStructure', structureData);
  }, [selectedType, updateData]);

  const structureTypes = [
    {
      id: 'single-page',
      title: 'Single Page Website',
      description: 'All content on one scrollable page with smooth navigation between sections',
      icon: FileText,
      pros: ['Fast loading', 'Great for mobile', 'Focused message', 'Easy to maintain'],
      cons: ['Limited content space', 'Less SEO opportunities'],
      bestFor: isHealthcareCategory 
        ? ['Small practices', 'Specialists', 'Single location clinics', 'Simple service offerings']
        : ['Small businesses', 'Personal portfolios', 'Event pages', 'Landing pages'],
      popular: true
    },
    {
      id: 'multi-page',
      title: 'Multi-Page Website',
      description: 'Separate pages for different content sections with traditional navigation',
      icon: Grid3X3,
      pros: ['More content space', 'Better SEO', 'Organized content', 'Scalable'],
      cons: ['More complex', 'Longer load times', 'More maintenance'],
      bestFor: isHealthcareCategory 
        ? ['Large practices', 'Multi-specialty clinics', 'Hospital systems', 'Extensive services']
        : ['Large businesses', 'Content-heavy sites', 'E-commerce', 'Blogs'],
      popular: false
    }
  ];

  const handleTypeSelect = (type: 'single-page' | 'multi-page') => {
    setSelectedType(type);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Layout className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isHealthcareCategory ? "Choose Your Practice Website Structure" : "Choose Your Website Structure"}
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {isHealthcareCategory 
            ? "Select the layout that best fits your practice and patient needs. The Hugo theme will handle all the specific pages and sections."
            : "Select the layout that best fits your content and goals. The Hugo theme will handle all the specific pages and sections."
          }
        </p>
      </div>

      {/* Structure Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          Website Structure Type
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {structureTypes.map((type) => {
            const isSelected = selectedType === type.id;
            const IconComponent = type.icon;

            return (
              <motion.div
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn(
                    "relative cursor-pointer transition-all duration-200 hover:shadow-lg p-6",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800" 
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600"
                  )}
                  onClick={() => handleTypeSelect(type.id as 'single-page' | 'multi-page')}
                >
                  {/* Popular Badge */}
                  {type.popular && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-yellow-500 text-white text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-blue-100 dark:bg-blue-800" : "bg-gray-100 dark:bg-gray-700"
                    )}>
                      <IconComponent className={cn(
                        "w-6 h-6",
                        isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                      )} />
                    </div>
                    <div>
                      <h4 className={cn(
                        "font-semibold text-lg",
                        isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                      )}>
                        {type.title}
                      </h4>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {type.description}
                  </p>

                  {/* Pros and Cons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Pros:</h5>
                      <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                        {type.pros.map((pro, index) => (
                          <li key={index}>• {pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">Cons:</h5>
                      <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                        {type.cons.map((con, index) => (
                          <li key={index}>• {con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Best For */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Best for:</h5>
                    <div className="flex flex-wrap gap-1">
                      {type.bestFor.map((item, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Structure Summary */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800"
        >
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
            <Layout className="w-5 h-5 mr-2" />
            {isHealthcareCategory ? 'Your Practice Website Structure Summary' : 'Your Website Structure Summary'}
          </h4>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">Structure Type:</span>
              <span className="text-blue-700 dark:text-blue-300 ml-2">
                {selectedType === 'single-page' ? 'Single Page' : 'Multi-Page'}
              </span>
            </div>
            
            <div className="bg-blue-100 dark:bg-blue-800/30 rounded-lg p-3 mt-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Note:</strong> The Hugo theme will automatically generate the appropriate pages and sections based on your business type and content. 
                {isHealthcareCategory && ' This includes medical services, team profiles, appointment booking, and other healthcare-specific features.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Help Text */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
          {isHealthcareCategory ? '🏥 Structure Guidance:' : '💡 Structure Tips:'}
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          {isHealthcareCategory ? (
            <>
              <li>• Single-page works well for small practices with focused services</li>
              <li>• Multi-page is better for large practices with many specialties</li>
              <li>• The Hugo theme will create appropriate healthcare pages automatically</li>
              <li>• Your content from previous steps determines what pages are included</li>
            </>
          ) : (
            <>
              <li>• Single-page is great for simple, focused websites</li>
              <li>• Multi-page provides more space for complex content</li>
              <li>• The Hugo theme will generate pages based on your business type</li>
              <li>• You can always modify the structure after generation</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Step8WebsiteStructure;
