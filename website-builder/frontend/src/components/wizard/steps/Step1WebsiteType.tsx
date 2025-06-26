import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  Building2,
  // TODO: Uncomment these imports when adding other website types
  // User, 
  // PenTool, 
  // Briefcase, 
  // ShoppingCart,
  Star
} from 'lucide-react';
import { cn } from '../../../utils';

const Step1WebsiteType: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [selectedType, setSelectedType] = React.useState(data.websiteType);

  const websiteTypes = [
    {
      id: 'business',
      category: 'Business Website',
      description: 'Professional website for your business',
      icon: Building2,
      features: ['Contact forms', 'Service pages', 'About us', 'Testimonials'],
      nextStep: 2, // Goes to business category
      color: 'blue',
      popular: true,
      allowedCategories: ['healthcare']
      // TODO: Add more categories when ready to support multiple business types
      // allowedCategories: ['healthcare', 'technology', 'professional', 'restaurant', 'retail']
    }
    // TODO: Uncomment these types when ready to support multiple website types
    // {
    //   id: 'personal',
    //   category: 'Personal Website',
    //   description: 'Showcase your personal brand and portfolio',
    //   icon: User,
    //   features: ['Portfolio', 'About me', 'Blog', 'Contact'],
    //   nextStep: 3, // Skips business category
    //   color: 'green',
    //   popular: false
    // },
    // {
    //   id: 'blog',
    //   category: 'Blog Website',
    //   description: 'Share your thoughts and expertise',
    //   icon: PenTool,
    //   features: ['Blog posts', 'Categories', 'Archives', 'Comments'],
    //   nextStep: 3, // Skips business category
    //   color: 'purple',
    //   popular: false
    // },
    // {
    //   id: 'portfolio',
    //   category: 'Portfolio Website',
    //   description: 'Display your work and achievements',
    //   icon: Briefcase,
    //   features: ['Project gallery', 'Skills', 'Resume', 'Testimonials'],
    //   nextStep: 3, // Skips business category
    //   color: 'orange',
    //   popular: false
    // },
    // {
    //   id: 'ecommerce',
    //   category: 'E-commerce Website',
    //   description: 'Sell products online',
    //   icon: ShoppingCart,
    //   features: ['Product catalog', 'Shopping cart', 'Payments', 'Orders'],
    //   nextStep: 2, // Goes to business category
    //   color: 'red',
    //   popular: true
    // }
  ];

  const handleTypeSelect = (type: typeof websiteTypes[0]) => {
    const websiteTypeData = {
      id: type.id,
      category: type.category,
      description: type.description,
      allowedCategories: type.allowedCategories || []
    };
    
    setSelectedType(websiteTypeData);
    updateData('websiteType', websiteTypeData);
    
    // Analytics tracking could go here
    console.log('Website type selected:', type.id);
    console.log('Allowed categories:', type.allowedCategories);
  };
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: {
        border: isSelected ? 'border-blue-500' : 'border-blue-200 dark:border-blue-800',
        bg: isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
        icon: isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500 dark:text-blue-400',
        text: isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
      },
      green: {
        border: isSelected ? 'border-green-500' : 'border-green-200 dark:border-green-800',
        bg: isSelected ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800',
        icon: isSelected ? 'text-green-600 dark:text-green-400' : 'text-green-500 dark:text-green-400',
        text: isSelected ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-white'
      },
      purple: {
        border: isSelected ? 'border-purple-500' : 'border-purple-200 dark:border-purple-800',
        bg: isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-white dark:bg-gray-800',
        icon: isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500 dark:text-purple-400',
        text: isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'
      },
      orange: {
        border: isSelected ? 'border-orange-500' : 'border-orange-200 dark:border-orange-800',
        bg: isSelected ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white dark:bg-gray-800',
        icon: isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-orange-500 dark:text-orange-400',
        text: isSelected ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'
      },
      red: {
        border: isSelected ? 'border-red-500' : 'border-red-200 dark:border-red-800',
        bg: isSelected ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800',
        icon: isSelected ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400',
        text: isSelected ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'
      }
    };
    
    return colors[color as keyof typeof colors] || colors.blue;
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          What type of website are you building?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose the category that best describes your website. This helps us customize 
          the experience and provide relevant templates and features.
        </p>
      </div>

      {/* Website Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {websiteTypes.map((type) => {
          const isSelected = selectedType?.id === type.id;
          const colorClasses = getColorClasses(type.color, isSelected);
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
                  "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
                  colorClasses.border,
                  colorClasses.bg,
                  isSelected && "ring-2 ring-offset-2",
                  isSelected && `ring-${type.color}-500`
                )}
                onClick={() => handleTypeSelect(type)}
              >
                <div className="p-6">
                  {/* Popular Badge */}
                  {type.popular && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}

                  {/* Icon and Title */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      isSelected ? `bg-${type.color}-100` : `bg-${type.color}-50`
                    )}>
                      <IconComponent className={cn("w-6 h-6", colorClasses.icon)} />
                    </div>
                    <div>
                      <h3 className={cn("font-semibold text-lg", colorClasses.text)}>
                        {type.category}
                      </h3>
                    </div>
                  </div>                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {type.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Key Features:</h4>
                    <ul className="space-y-1">
                      {type.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mr-2",
                            `bg-${type.color}-500`
                          )} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4"
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        `bg-${type.color}-500`
                      )}>
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>      {/* Selection Summary */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-8"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Great choice! You've selected: {selectedType.category}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedType.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Don't worry, you can always change this later. We'll customize your experience 
          based on your selection.
        </p>
      </div>
    </div>
  );
};

export default Step1WebsiteType;
