import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { 
  Target, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  HelpCircle, 
  Star,
  Briefcase,
  MessageSquare,
  Globe,
  Palette
} from 'lucide-react';
import { cn } from '../../../utils';

const Step4WebsitePurpose: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [selectedPurpose, setSelectedPurpose] = React.useState(data.websitePurpose?.primary || '');
  const [selectedGoals, setSelectedGoals] = React.useState<string[]>(data.websitePurpose?.goals || []);

  const isBusinessType = data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce';
  const isPersonalType = data.websiteType?.id === 'personal';
  const isBlogType = data.websiteType?.id === 'blog';
  const isPortfolioType = data.websiteType?.id === 'portfolio';

  const getPurposeOptions = () => {
    if (isBusinessType) {
      return [
        {
          id: 'lead-generation',
          title: 'Lead Generation',
          description: 'Capture potential customers and generate business inquiries',
          icon: Target,
          color: 'blue',
          popular: true
        },
        {
          id: 'online-sales',
          title: 'Online Sales',
          description: 'Sell products or services directly through your website',
          icon: ShoppingCart,
          color: 'green',
          popular: true
        },
        {
          id: 'brand-awareness',
          title: 'Brand Awareness',
          description: 'Showcase your company values and build brand recognition',
          icon: TrendingUp,
          color: 'purple',
          popular: false
        },
        {
          id: 'customer-support',
          title: 'Customer Support',
          description: 'Provide FAQ, resources, and support to existing customers',
          icon: HelpCircle,
          color: 'orange',
          popular: false
        },
        {
          id: 'information-hub',
          title: 'Information Hub',
          description: 'Share company information, news, and updates',
          icon: Globe,
          color: 'indigo',
          popular: false
        },
        {
          id: 'professional-portfolio',
          title: 'Professional Portfolio',
          description: 'Display your work, case studies, and business achievements',
          icon: Briefcase,
          color: 'gray',
          popular: false
        }
      ];
    } else if (isPersonalType || isPortfolioType) {
      return [
        {
          id: 'career-advancement',
          title: 'Career Advancement',
          description: 'Build your professional presence for job opportunities',
          icon: TrendingUp,
          color: 'blue',
          popular: true
        },
        {
          id: 'personal-branding',
          title: 'Personal Branding',
          description: 'Establish yourself as a thought leader in your field',
          icon: Star,
          color: 'yellow',
          popular: true
        },
        {
          id: 'portfolio-showcase',
          title: 'Portfolio Showcase',
          description: 'Display your creative work and professional projects',
          icon: Palette,
          color: 'purple',
          popular: true
        },
        {
          id: 'freelance-services',
          title: 'Freelance Services',
          description: 'Promote your services and attract freelance clients',
          icon: Briefcase,
          color: 'green',
          popular: false
        },
        {
          id: 'networking',
          title: 'Professional Networking',
          description: 'Connect with peers and industry professionals',
          icon: Users,
          color: 'indigo',
          popular: false
        }
      ];
    } else if (isBlogType) {
      return [
        {
          id: 'content-sharing',
          title: 'Content Sharing',
          description: 'Share your thoughts, expertise, and insights with readers',
          icon: MessageSquare,
          color: 'blue',
          popular: true
        },
        {
          id: 'thought-leadership',
          title: 'Thought Leadership',
          description: 'Establish authority and expertise in your field',
          icon: Star,
          color: 'yellow',
          popular: true
        },
        {
          id: 'community-building',
          title: 'Community Building',
          description: 'Build an engaged audience around your content',
          icon: Users,
          color: 'purple',
          popular: false
        },
        {
          id: 'monetization',
          title: 'Monetization',
          description: 'Generate income through your blog content',
          icon: ShoppingCart,
          color: 'green',
          popular: false
        }
      ];
    }
    return [];
  };

  const getGoalOptions = () => {
    const commonGoals = [
      'Increase website traffic',
      'Generate more leads',
      'Improve online presence',
      'Build credibility',
      'Enhance customer engagement',
      'Showcase expertise',
      'Improve search rankings',
      'Mobile-friendly experience'
    ];

    if (isBusinessType) {
      return [
        ...commonGoals,
        'Drive sales conversions',
        'Reduce customer support calls',
        'Attract new customers',
        'Retain existing customers',
        'Expand market reach',
        'Streamline business processes'
      ];
    } else if (isPersonalType || isPortfolioType) {
      return [
        ...commonGoals,
        'Land job opportunities',
        'Attract freelance clients',
        'Build professional network',
        'Showcase portfolio pieces',
        'Share knowledge and skills',
        'Personal brand development'
      ];
    } else if (isBlogType) {
      return [
        ...commonGoals,
        'Grow readership',
        'Increase engagement',
        'Build email list',
        'Monetize content',
        'Share knowledge',
        'Build community'
      ];
    }

    return commonGoals;
  };

  const purposeOptions = getPurposeOptions();
  const goalOptions = getGoalOptions();

  const handlePurposeSelect = (purposeId: string) => {
    setSelectedPurpose(purposeId);
    updateWebsitePurpose(purposeId, selectedGoals);
  };

  const handleGoalToggle = (goal: string) => {
    const newGoals = selectedGoals.includes(goal)
      ? selectedGoals.filter(g => g !== goal)
      : [...selectedGoals, goal];
    
    setSelectedGoals(newGoals);
    updateWebsitePurpose(selectedPurpose, newGoals);
  };

  const updateWebsitePurpose = (primary: string, goals: string[]) => {
    const purposeData = {
      primary,
      goals,
      secondary: undefined // Could be expanded later
    };
    updateData('websitePurpose', purposeData);
  };

  return (    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          What's the main purpose of your website?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Understanding your primary goal helps us suggest the right features and content structure.
        </p>
      </div>

      {/* Primary Purpose Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-600" />
          Primary Purpose
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purposeOptions.map((purpose) => {
            const isSelected = selectedPurpose === purpose.id;
            const IconComponent = purpose.icon;

            return (
              <motion.div
                key={purpose.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >                <Card
                  className={cn(
                    "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
                    isSelected 
                      ? `border-${purpose.color}-500 bg-${purpose.color}-50 dark:bg-${purpose.color}-900/20 ring-2 ring-${purpose.color}-200 dark:ring-${purpose.color}-800` 
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  onClick={() => handlePurposeSelect(purpose.id)}
                >
                  <div className="p-5">
                    {/* Popular Badge */}
                    {purpose.popular && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-yellow-500 text-white text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}

                    {/* Icon and Title */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected 
                          ? `bg-${purpose.color}-100` 
                          : `bg-${purpose.color}-50`
                      )}>
                        <IconComponent className={cn(
                          "w-5 h-5",
                          isSelected 
                            ? `text-${purpose.color}-700` 
                            : `text-${purpose.color}-600`
                        )} />
                      </div>                      <h4 className={cn(
                        "font-semibold",
                        isSelected 
                          ? `text-${purpose.color}-900 dark:text-${purpose.color}-100` 
                          : "text-gray-900 dark:text-white"
                      )}>
                        {purpose.title}
                      </h4>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {purpose.description}
                    </p>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          `bg-${purpose.color}-500`
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
        </div>
      </div>      {/* Goals Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Specific Goals
          </h3>
          <Badge variant="secondary" className="text-xs">
            Select all that apply
          </Badge>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Choose additional goals to help us prioritize features and content.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {goalOptions.map((goal) => {
            const isSelected = selectedGoals.includes(goal);

            return (
              <motion.div
                key={goal}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.1 }}
              >                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 p-3",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800" 
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                  onClick={() => handleGoalToggle(goal)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleGoalToggle(goal)}
                      className="pointer-events-none"
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-700 dark:text-gray-300"
                    )}>
                      {goal}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedPurpose || selectedGoals.length > 0) && (        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800"
        >
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Your Website Goals Summary
          </h4>
          
          {selectedPurpose && (
            <div className="mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Primary Purpose:</p>
              <Badge className="bg-blue-600 text-white">
                {purposeOptions.find(p => p.id === selectedPurpose)?.title}
              </Badge>
            </div>
          )}
          
          {selectedGoals.length > 0 && (
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">Specific Goals ({selectedGoals.length} selected):</p>
              <div className="flex flex-wrap gap-2">
                {selectedGoals.map((goal, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
          )}
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
            We'll use these goals to recommend the best features and content structure for your website.
          </p>
        </motion.div>
      )}

      {/* Help Text */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center">
          <HelpCircle className="w-4 h-4 mr-2" />
          Not sure about your goals?
        </h4>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Don't worry! You can always adjust these later. Start with what feels most important right now, 
          and we'll help you refine your website strategy as you build it.
        </p>
      </div>
    </div>
  );
};

export default Step4WebsitePurpose;
