import React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { 
  Lightbulb, 
  Target, 
  Users, 
  Award,
  Zap,
  Heart,
  CheckCircle
} from 'lucide-react';

const Step5BusinessDescription: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [description, setDescription] = React.useState(data.businessDescription?.description || '');
  const [whatWeDo, setWhatWeDo] = React.useState(data.businessDescription?.whatWeDo || '');
  const [whyChooseUs, setWhyChooseUs] = React.useState(data.businessDescription?.whyChooseUs || '');
  const [targetAudience, setTargetAudience] = React.useState(data.businessDescription?.targetAudience || '');
  const [keyBenefits, setKeyBenefits] = React.useState<string[]>(data.businessDescription?.keyBenefits || []);
  const [uniqueSellingPoints, setUniqueSellingPoints] = React.useState<string[]>(data.businessDescription?.uniqueSellingPoints || []);

  const handleSave = () => {
    const businessDescriptionData = {
      description,
      whatWeDo,
      whyChooseUs,
      targetAudience,
      keyBenefits,
      uniqueSellingPoints
    };
    
    updateData('businessDescription', businessDescriptionData);
  };

  React.useEffect(() => {
    handleSave();
  }, [description, whatWeDo, whyChooseUs, targetAudience, keyBenefits, uniqueSellingPoints]);

  const addKeyBenefit = () => {
    setKeyBenefits([...keyBenefits, '']);
  };

  const updateKeyBenefit = (index: number, value: string) => {
    const updated = [...keyBenefits];
    updated[index] = value;
    setKeyBenefits(updated.filter(benefit => benefit.trim() !== ''));
  };

  const removeKeyBenefit = (index: number) => {
    setKeyBenefits(keyBenefits.filter((_, i) => i !== index));
  };

  const addUniqueSellingPoint = () => {
    setUniqueSellingPoints([...uniqueSellingPoints, '']);
  };

  const updateUniqueSellingPoint = (index: number, value: string) => {
    const updated = [...uniqueSellingPoints];
    updated[index] = value;
    setUniqueSellingPoints(updated.filter(point => point.trim() !== ''));
  };

  const removeUniqueSellingPoint = (index: number) => {
    setUniqueSellingPoints(uniqueSellingPoints.filter((_, i) => i !== index));
  };

  const quickDescriptionTemplates = [
    {
      type: 'Professional Services',
      template: 'We provide professional [service type] solutions to help businesses [achieve goal]. With [years] years of experience, we deliver high-quality results that exceed expectations.',
      icon: Award
    },
    {
      type: 'Technology',
      template: 'We develop innovative [technology/software] solutions that help companies [solve problem]. Our cutting-edge approach ensures [key benefit] for our clients.',
      icon: Zap
    },
    {
      type: 'Creative Services',
      template: 'We create stunning [creative work] that captures your brand\'s essence and connects with your audience. Our passion for design drives everything we do.',
      icon: Heart
    },
    {
      type: 'Consulting',
      template: 'We help businesses [achieve outcome] through expert consulting and strategic guidance. Our proven methodology has helped [number] companies succeed.',
      icon: Target
    }
  ];

  const useTemplate = (template: string) => {
    setDescription(template);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tell us about your business
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Help visitors understand what you do, why you're different, and why they should choose you.
          This information will be used throughout your website.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Description */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Business Description
                </h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">
                  What does your business do? *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business, what you do, and what makes you unique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This will be your main business description. Keep it clear and engaging.
                </p>
              </div>

              {/* Quick Templates */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Templates:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickDescriptionTemplates.map((template, index) => {
                    const IconComponent = template.icon;
                    return (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => useTemplate(template.template)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <IconComponent className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {template.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {template.template.substring(0, 80)}...
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* What We Do */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  What We Do
                </h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatWeDo" className="text-gray-700 dark:text-gray-300">
                  Detailed services and offerings
                </Label>
                <Textarea
                  id="whatWeDo"
                  placeholder="Explain your services, products, or solutions in detail..."
                  value={whatWeDo}
                  onChange={(e) => setWhatWeDo(e.target.value)}
                  className="min-h-[100px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Describe your main services or products in more detail.
                </p>
              </div>
            </div>
          </Card>

          {/* Why Choose Us */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Why Choose Us
                </h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whyChooseUs" className="text-gray-700 dark:text-gray-300">
                  What makes you different?
                </Label>
                <Textarea
                  id="whyChooseUs"
                  placeholder="What sets you apart from competitors? Your unique advantages..."
                  value={whyChooseUs}
                  onChange={(e) => setWhyChooseUs(e.target.value)}
                  className="min-h-[100px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Highlight your competitive advantages and what makes you special.
                </p>
              </div>
            </div>
          </Card>

          {/* Target Audience */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Target Audience
                </h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-gray-700 dark:text-gray-300">
                  Who are your ideal customers?
                </Label>
                <Textarea
                  id="targetAudience"
                  placeholder="Describe your ideal customers, their needs, and demographics..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="min-h-[80px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Understanding your audience helps create more targeted content.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Benefits */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Key Benefits
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addKeyBenefit}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  Add
                </Button>
              </div>
              
              <div className="space-y-3">
                {keyBenefits.map((benefit, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      placeholder="e.g., Fast delivery, Expert support..."
                      value={benefit}
                      onChange={(e) => updateKeyBenefit(index, e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeKeyBenefit(index)}
                      className="shrink-0 dark:border-gray-600 dark:text-gray-300"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {keyBenefits.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Click "Add" to add key benefits
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Unique Selling Points */}
          <Card className="p-6 bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Unique Selling Points
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addUniqueSellingPoint}
                  className="dark:border-gray-600 dark:text-gray-300"
                >
                  Add
                </Button>
              </div>
              
              <div className="space-y-3">
                {uniqueSellingPoints.map((point, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      placeholder="e.g., 24/7 support, Money-back guarantee..."
                      value={point}
                      onChange={(e) => updateUniqueSellingPoint(index, e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeUniqueSellingPoint(index)}
                      className="shrink-0 dark:border-gray-600 dark:text-gray-300"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {uniqueSellingPoints.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Click "Add" to add selling points
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Preview */}
          {description && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Preview
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    {description.substring(0, 200)}
                    {description.length > 200 && '...'}
                  </p>
                  {keyBenefits.length > 0 && (
                    <div className="space-y-1">
                      {keyBenefits.slice(0, 3).map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-blue-700 dark:text-blue-300">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Tips */}
      <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
            💡 Pro Tips
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <li>• Keep your business description clear and jargon-free</li>
            <li>• Focus on benefits to customers, not just features</li>
            <li>• Use specific examples and numbers when possible</li>
            <li>• Think about what problems you solve for customers</li>
            <li>• Make it scannable with bullet points and short paragraphs</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default Step5BusinessDescription;
