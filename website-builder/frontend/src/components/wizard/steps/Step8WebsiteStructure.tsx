import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { 
  Layout, 
  FileText, 
  Grid3X3,
  Menu,
  Image,
  ShoppingCart,
  MessageSquare,
  Star,
  Layers,
  Navigation,
  Home,
  Users,
  Briefcase,
  Mail,
  Info
} from 'lucide-react';
import { cn } from '../../../utils';

const Step8WebsiteStructure: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [selectedType, setSelectedType] = React.useState<'single-page' | 'multi-page'>(
    data.websiteStructure?.type || 'single-page'
  );
  const [selectedSections, setSelectedSections] = React.useState<string[]>(
    data.websiteStructure?.selectedSections || []
  );
  const [selectedPages, setSelectedPages] = React.useState<string[]>(
    data.websiteStructure?.selectedPages || []
  );
  const [navigationStyle, setNavigationStyle] = React.useState<string>(
    data.websiteStructure?.navigationStyle || 'horizontal'
  );
  const [features, setFeatures] = React.useState({
    hasGallery: data.websiteStructure?.hasGallery || false,
    hasBlog: data.websiteStructure?.hasBlog || false,
    hasEcommerce: data.websiteStructure?.hasEcommerce || false
  });
  const isBusinessType = data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce';
  const isPersonalType = data.websiteType?.id === 'personal' || data.websiteType?.id === 'portfolio';
  const isEcommerceType = data.websiteType?.id === 'ecommerce';

  // Update wizard data when form changes
  React.useEffect(() => {
    const structureData = {
      type: selectedType,
      selectedSections: selectedType === 'single-page' ? selectedSections : undefined,
      selectedPages: selectedType === 'multi-page' ? selectedPages : undefined,
      navigationStyle,
      hasGallery: features.hasGallery,
      hasBlog: features.hasBlog,
      hasEcommerce: features.hasEcommerce || isEcommerceType
    };

    updateData('websiteStructure', structureData);
  }, [selectedType, selectedSections, selectedPages, navigationStyle, features, isEcommerceType, updateData]);

  const structureTypes = [
    {
      id: 'single-page',
      title: 'Single Page Website',
      description: 'All content on one scrollable page with smooth navigation between sections',
      icon: FileText,
      pros: ['Fast loading', 'Great for mobile', 'Focused message', 'Easy to maintain'],
      cons: ['Limited content space', 'Less SEO opportunities'],
      bestFor: ['Small businesses', 'Personal portfolios', 'Event pages', 'Landing pages'],
      popular: true
    },
    {
      id: 'multi-page',
      title: 'Multi-Page Website',
      description: 'Separate pages for different content sections with traditional navigation',
      icon: Grid3X3,
      pros: ['More content space', 'Better SEO', 'Organized content', 'Scalable'],
      cons: ['More complex', 'Longer load times', 'More maintenance'],
      bestFor: ['Large businesses', 'Content-heavy sites', 'E-commerce', 'Blogs'],
      popular: false
    }
  ];

  const getSectionOptions = () => {
    const baseSections = [
      { id: 'hero', name: 'Hero/Welcome', icon: Home, required: true, description: 'Main introduction section' },
      { id: 'about', name: 'About', icon: Info, required: true, description: 'About you/your business' },
      { id: 'contact', name: 'Contact', icon: Mail, required: true, description: 'Contact information and form' }
    ];

    const businessSections = [
      { id: 'services', name: 'Services', icon: Briefcase, required: false, description: 'Services you offer' },
      { id: 'testimonials', name: 'Testimonials', icon: Star, required: false, description: 'Customer reviews' },
      { id: 'team', name: 'Team', icon: Users, required: false, description: 'Team member profiles' },
      { id: 'gallery', name: 'Gallery', icon: Image, required: false, description: 'Photo gallery' },
      { id: 'blog', name: 'Blog Preview', icon: MessageSquare, required: false, description: 'Recent blog posts' }
    ];

    const personalSections = [
      { id: 'portfolio', name: 'Portfolio', icon: Briefcase, required: false, description: 'Your work showcase' },
      { id: 'skills', name: 'Skills', icon: Star, required: false, description: 'Your expertise' },
      { id: 'experience', name: 'Experience', icon: Users, required: false, description: 'Work history' },
      { id: 'gallery', name: 'Gallery', icon: Image, required: false, description: 'Photo gallery' }
    ];

    if (isBusinessType) {
      return [...baseSections, ...businessSections];
    } else if (isPersonalType) {
      return [...baseSections, ...personalSections];
    } else {
      return baseSections;
    }
  };

  const getPageOptions = () => {
    const basePages = [
      { id: 'home', name: 'Home', icon: Home, required: true, description: 'Main landing page' },
      { id: 'about', name: 'About', icon: Info, required: true, description: 'About page' },
      { id: 'contact', name: 'Contact', icon: Mail, required: true, description: 'Contact page' }
    ];

    const businessPages = [
      { id: 'services', name: 'Services', icon: Briefcase, required: false, description: 'Services page' },
      { id: 'portfolio', name: 'Portfolio', icon: Image, required: false, description: 'Work showcase' },
      { id: 'team', name: 'Team', icon: Users, required: false, description: 'Team page' },
      { id: 'blog', name: 'Blog', icon: MessageSquare, required: false, description: 'Blog section' },
      { id: 'testimonials', name: 'Testimonials', icon: Star, required: false, description: 'Customer reviews' }
    ];

    const ecommercePages = [
      { id: 'products', name: 'Products', icon: ShoppingCart, required: true, description: 'Product catalog' },
      { id: 'cart', name: 'Shopping Cart', icon: ShoppingCart, required: true, description: 'Cart and checkout' }
    ];

    const personalPages = [
      { id: 'portfolio', name: 'Portfolio', icon: Briefcase, required: false, description: 'Work showcase' },
      { id: 'resume', name: 'Resume', icon: FileText, required: false, description: 'Resume/CV page' },
      { id: 'blog', name: 'Blog', icon: MessageSquare, required: false, description: 'Personal blog' }
    ];

    let pages = [...basePages];
    
    if (isEcommerceType) {
      pages = [...pages, ...ecommercePages, ...businessPages];
    } else if (isBusinessType) {
      pages = [...pages, ...businessPages];
    } else if (isPersonalType) {
      pages = [...pages, ...personalPages];
    }

    return pages;
  };

  const navigationStyles = [
    { id: 'horizontal', name: 'Horizontal Top', icon: Menu, description: 'Traditional top navigation bar' },
    { id: 'vertical', name: 'Vertical Side', icon: Layers, description: 'Side navigation menu' },
    { id: 'hamburger', name: 'Mobile Hamburger', icon: Grid3X3, description: 'Collapsible mobile-first menu' }
  ];

  const handleTypeSelect = (type: 'single-page' | 'multi-page') => {
    setSelectedType(type);
    
    // Auto-select required items
    if (type === 'single-page') {
      const requiredSections = getSectionOptions()
        .filter(section => section.required)
        .map(section => section.id);
      setSelectedSections(requiredSections);
    } else {
      const requiredPages = getPageOptions()
        .filter(page => page.required)
        .map(page => page.id);
      setSelectedPages(requiredPages);
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    const section = getSectionOptions().find(s => s.id === sectionId);
    if (section?.required) return; // Don't allow toggling required sections

    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handlePageToggle = (pageId: string) => {
    const page = getPageOptions().find(p => p.id === pageId);
    if (page?.required) return; // Don't allow toggling required pages

    setSelectedPages(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const sectionOptions = getSectionOptions();
  const pageOptions = getPageOptions();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Layout className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Choose Your Website Structure
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Select the layout that best fits your content and goals.
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

      {/* Content Selection */}
      {selectedType && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-green-600" />
            {selectedType === 'single-page' ? 'Page Sections' : 'Website Pages'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(selectedType === 'single-page' ? sectionOptions : pageOptions).map((item) => {
              const isSelected = selectedType === 'single-page' 
                ? selectedSections.includes(item.id)
                : selectedPages.includes(item.id);
              const IconComponent = item.icon;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 p-4",
                    item.required && "opacity-100 cursor-default",
                    isSelected 
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800" 
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  onClick={() => 
                    selectedType === 'single-page' 
                      ? handleSectionToggle(item.id)
                      : handlePageToggle(item.id)
                  }
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <Checkbox
                        checked={isSelected}
                        disabled={item.required}
                        className="pointer-events-none"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-green-900 dark:text-green-100" : "text-gray-900 dark:text-white"
                        )}>
                          {item.name}
                        </span>
                        {item.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Style */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Menu className="w-5 h-5 mr-2 text-purple-600" />
          Navigation Style
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {navigationStyles.map((style) => {
            const isSelected = navigationStyle === style.id;
            const IconComponent = style.icon;

            return (
              <Card
                key={style.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 p-4",
                  isSelected 
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-800" 
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600"
                )}
                onClick={() => setNavigationStyle(style.id)}
              >
                <div className="text-center space-y-2">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mx-auto",
                    isSelected ? "bg-purple-100 dark:bg-purple-800" : "bg-gray-100 dark:bg-gray-700"
                  )}>
                    <IconComponent className={cn(
                      "w-5 h-5",
                      isSelected ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
                    )} />
                  </div>
                  <div>
                    <h4 className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-purple-900 dark:text-purple-100" : "text-gray-900 dark:text-white"
                    )}>
                      {style.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {style.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Features */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Star className="w-5 h-5 mr-2 text-orange-600" />
          Additional Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                <Checkbox
                  id="gallery"
                  checked={features.hasGallery}
                  onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, hasGallery: checked as boolean }))}
                />
              </div>
              <div>
                <Label htmlFor="gallery" className="font-medium text-sm text-gray-900 dark:text-white flex items-center">
                  <Image className="w-4 h-4 mr-2" />
                  Photo Gallery
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Showcase images or portfolio pieces
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                <Checkbox
                  id="blog"
                  checked={features.hasBlog}
                  onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, hasBlog: checked as boolean }))}
                />
              </div>
              <div>
                <Label htmlFor="blog" className="font-medium text-sm text-gray-900 dark:text-white flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Blog Section
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Share articles and updates
                </p>
              </div>
            </div>
          </Card>

          {!isEcommerceType && (
            <Card className="p-4">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  <Checkbox
                    id="ecommerce"
                    checked={features.hasEcommerce}
                    onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, hasEcommerce: checked as boolean }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ecommerce" className="font-medium text-sm text-gray-900 dark:text-white flex items-center">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    E-commerce
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Sell products online
                  </p>
                </div>
              </div>
            </Card>
          )}
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
            Your Website Structure Summary
          </h4>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">Structure Type:</span>
              <span className="text-blue-700 dark:text-blue-300 ml-2">{selectedType === 'single-page' ? 'Single Page' : 'Multi-Page'}</span>
            </div>
            
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">Navigation:</span>
              <span className="text-blue-700 dark:text-blue-300 ml-2">{navigationStyles.find(s => s.id === navigationStyle)?.name}</span>
            </div>
            
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                {selectedType === 'single-page' ? 'Sections' : 'Pages'}:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(selectedType === 'single-page' ? selectedSections : selectedPages).map((item, index) => {
                  const option = (selectedType === 'single-page' ? sectionOptions : pageOptions).find(opt => opt.id === item);
                  return (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {option?.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
            
            {(features.hasGallery || features.hasBlog || features.hasEcommerce) && (
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Additional Features:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {features.hasGallery && <Badge variant="secondary" className="text-xs">Photo Gallery</Badge>}
                  {features.hasBlog && <Badge variant="secondary" className="text-xs">Blog</Badge>}
                  {features.hasEcommerce && <Badge variant="secondary" className="text-xs">E-commerce</Badge>}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Step8WebsiteStructure;
