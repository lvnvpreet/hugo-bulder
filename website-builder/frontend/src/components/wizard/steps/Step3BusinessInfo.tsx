import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Building2, User, Calendar, Users as UsersIcon } from 'lucide-react';
import { cn } from '../../../utils';

const Step3BusinessInfo: React.FC = () => {
  const { data, updateData, getStepErrors } = useWizardStore();
  const [formData, setFormData] = React.useState({
    name: data.businessInfo?.name || '',
    description: data.businessInfo?.description || '',
    tagline: data.businessInfo?.tagline || '',
    established: data.businessInfo?.established || undefined,
    employeeCount: data.businessInfo?.employeeCount || '',
    selectedSubcategory: data.businessCategory?.selectedSubCategory?.id || '',
    specialization: '',
    additionalFields: {} as Record<string, string>
  });

  const [charCounts, setCharCounts] = React.useState({
    description: formData.description.length,
    tagline: formData.tagline.length
  });

  const isBusinessType = data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce';
  const errors = getStepErrors(3);

  const employeeCountOptions = [
    { value: '1', label: 'Just me (1)' },
    { value: '2-10', label: 'Small team (2-10)' },
    { value: '11-50', label: 'Growing business (11-50)' },
    { value: '51-200', label: 'Medium business (51-200)' },
    { value: '201-500', label: 'Large business (201-500)' },
    { value: '500+', label: 'Enterprise (500+)' }
  ];

  // Get available subcategories and selected subcategory info
  const availableSubcategories = data.businessCategory?.subCategories || [];
  const selectedSubcategoryData = availableSubcategories.find(sub => sub.id === formData.selectedSubcategory);

  // Real-time form validation and updates
  React.useEffect(() => {
    const businessInfoData = {
      name: formData.name,
      description: formData.description,
      tagline: formData.tagline || undefined,
      established: formData.established || undefined,
      employeeCount: formData.employeeCount || undefined,
      selectedSubcategory: selectedSubcategoryData || undefined,
      specialization: formData.specialization || undefined,
      additionalFields: formData.additionalFields
    };

    updateData('businessInfo', businessInfoData);
  }, [formData, updateData]);

  // Separate effect to update businessCategory selectedSubCategory
  React.useEffect(() => {
    if (selectedSubcategoryData && data.businessCategory && 
        data.businessCategory.selectedSubCategory?.id !== selectedSubcategoryData.id) {
      updateData('businessCategory', {
        ...data.businessCategory,
        selectedSubCategory: selectedSubcategoryData
      });
    }
  }, [formData.selectedSubcategory, data.businessCategory, updateData]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update character counts
    if (field === 'description' || field === 'tagline') {
      setCharCounts(prev => ({
        ...prev,
        [field]: String(value).length
      }));
    }
  };

  const getFieldConfig = () => {
    if (isBusinessType) {
      return {
        nameLabel: 'Business Name',
        namePlaceholder: 'Enter your business name',
        descriptionLabel: 'Business Description',
        descriptionPlaceholder: 'Describe what your business does, your mission, and what makes you unique...',
        taglineLabel: 'Business Tagline',
        taglinePlaceholder: 'A catchy phrase that captures your business essence',
        showEstablished: true,
        showEmployeeCount: true,
        icon: Building2
      };
    } else {
      return {
        nameLabel: 'Your Name',
        namePlaceholder: 'Enter your name',
        descriptionLabel: 'About You',
        descriptionPlaceholder: 'Tell visitors about yourself, your background, skills, and what you do...',
        taglineLabel: 'Professional Title or Tagline',
        taglinePlaceholder: 'e.g., "Creative Designer & Problem Solver"',
        showEstablished: false,
        showEmployeeCount: false,
        icon: User
      };
    }
  };

  const config = getFieldConfig();
  const IconComponent = config.icon;

  return (
    <div className="space-y-6">      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <IconComponent className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isBusinessType ? 'Tell us about your business' : 'Tell us about yourself'}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {isBusinessType 
            ? 'This information will be used to personalize your website content and structure.'
            : 'This information will help create a personal website that represents you well.'
          }
        </p>
      </div>

      {/* Form */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.nameLabel} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={config.namePlaceholder}
              className={cn(
                "w-full",
                errors.some(e => e.includes('name')) && "border-red-500 focus:ring-red-500"
              )}
            />
            {errors.some(e => e.includes('name')) && (
              <p className="text-sm text-red-600">
                {errors.find(e => e.includes('name'))}
              </p>
            )}
          </div>

          {/* Subcategory Selection - Only for business types with subcategories */}
          {isBusinessType && availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Type of {data.businessCategory?.name || 'Business'} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.selectedSubcategory}
                onValueChange={(value) => handleInputChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select your ${data.businessCategory?.industry?.toLowerCase() || 'business'} type`} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{subcategory.name}</span>
                        <span className="text-xs text-gray-500">{subcategory.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSubcategoryData && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  🎯 Great! We'll customize your website with {selectedSubcategoryData.name.toLowerCase()}-specific features.
                </p>
              )}
            </div>
          )}

          {/* Specialization Selection - Only if subcategory has specializations */}
          {selectedSubcategoryData?.specializations && selectedSubcategoryData.specializations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="specialization" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Specialization <span className="text-gray-400">(Optional)</span>
              </Label>
              <Select
                value={formData.specialization}
                onValueChange={(value) => handleInputChange('specialization', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your specialization" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSubcategoryData.specializations.map((specialization) => (
                    <SelectItem key={specialization} value={specialization}>
                      {specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic Required Fields - Based on selected subcategory */}
          {selectedSubcategoryData?.requiredFields && selectedSubcategoryData.requiredFields.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Additional Information for {selectedSubcategoryData.name}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSubcategoryData.requiredFields.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field} <span className="text-gray-400">(Optional)</span>
                      </Label>
                      <Input
                        id={field}
                        type="text"
                        value={formData.additionalFields[field] || ''}
                        onChange={(e) => {
                          const newAdditionalFields = {
                            ...formData.additionalFields,
                            [field]: e.target.value
                          };
                          setFormData(prev => ({
                            ...prev,
                            additionalFields: newAdditionalFields
                          }));
                        }}
                        placeholder={`Enter your ${field.toLowerCase()}`}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.descriptionLabel} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={config.descriptionPlaceholder}
              rows={4}
              className={cn(
                "w-full resize-none",
                errors.some(e => e.includes('description')) && "border-red-500 focus:ring-red-500"
              )}
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <div>
                {errors.some(e => e.includes('description')) && (
                  <p className="text-sm text-red-600">
                    {errors.find(e => e.includes('description'))}
                  </p>
                )}
              </div>
              <p className={cn(
                "text-xs",
                charCounts.description > 450 ? "text-red-500" : "text-gray-500"
              )}>
                {charCounts.description}/500 characters
              </p>
            </div>
          </div>

          {/* Tagline Field */}
          <div className="space-y-2">
            <Label htmlFor="tagline" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.taglineLabel} <span className="text-gray-400">(Optional)</span>
            </Label>
            <Input
              id="tagline"
              type="text"
              value={formData.tagline}
              onChange={(e) => handleInputChange('tagline', e.target.value)}
              placeholder={config.taglinePlaceholder}
              className="w-full"
              maxLength={100}
            />
            <p className={cn(
              "text-xs",
              charCounts.tagline > 90 ? "text-red-500" : "text-gray-500"
            )}>
              {charCounts.tagline}/100 characters
            </p>
          </div>

          {/* Business-specific fields */}
          {config.showEstablished && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Year Established */}
              <div className="space-y-2">
                <Label htmlFor="established" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Year Established <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="established"
                  type="number"
                  value={formData.established || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('established', value ? parseInt(value) : '' as any);
                  }}
                  placeholder="e.g., 2020"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="w-full"
                />
              </div>

              {/* Employee Count */}
              <div className="space-y-2">
                <Label htmlFor="employeeCount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <UsersIcon className="w-4 h-4 inline mr-1" />
                  Team Size <span className="text-gray-400">(Optional)</span>
                </Label>
                <Select
                  value={formData.employeeCount}
                  onValueChange={(value) => handleInputChange('employeeCount', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeCountOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Preview Card */}
      {formData.name && formData.description && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                  <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Preview</h3>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{formData.name}</h4>
                {formData.tagline && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">{formData.tagline}</p>
                )}
                {selectedSubcategoryData && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedSubcategoryData.name}
                    </Badge>
                    {formData.specialization && (
                      <Badge variant="secondary" className="text-xs">
                        {formData.specialization}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {formData.description}
              </p>
              
              {(formData.established || formData.employeeCount) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.established && (
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      Est. {formData.established}
                    </Badge>
                  )}
                  {formData.employeeCount && (
                    <Badge variant="secondary" className="text-xs">
                      <UsersIcon className="w-3 h-3 mr-1" />
                      {employeeCountOptions.find(opt => opt.value === formData.employeeCount)?.label}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Services Preview - Only if subcategory selected */}
      {selectedSubcategoryData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Website Features for {selectedSubcategoryData.name}
                </h3>
              </div>
              
              <p className="text-green-700 dark:text-green-300 text-sm">
                Based on your selection, we'll include these {selectedSubcategoryData.name.toLowerCase()}-specific features:
              </p>
              
              <div className="flex flex-wrap gap-2">
                {selectedSubcategoryData.services.map((service, index) => (
                  <Badge key={index} variant="outline" className="text-xs border-green-300 text-green-700">
                    ✓ {service}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}      {/* Tips */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
          💡 Tips for {selectedSubcategoryData ? `${selectedSubcategoryData.name.toLowerCase()}` : 'your business'}:
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          {isBusinessType ? (
            selectedSubcategoryData ? (
              // Subcategory-specific tips
              selectedSubcategoryData.id === 'doctors' ? (
                <>
                  <li>• Highlight your medical specializations and expertise</li>
                  <li>• Mention your medical education and certifications</li>
                  <li>• Include patient care philosophy and approach</li>
                  <li>• Consider mentioning accepted insurance plans</li>
                </>
              ) : selectedSubcategoryData.id === 'dentists' ? (
                <>
                  <li>• Showcase dental services and procedures you offer</li>
                  <li>• Mention any specialized dental technology you use</li>
                  <li>• Highlight patient comfort and care approach</li>
                  <li>• Consider including before/after treatment examples</li>
                </>
              ) : selectedSubcategoryData.id === 'therapists' ? (
                <>
                  <li>• Describe your therapy approach and methodologies</li>
                  <li>• Mention areas of specialization and expertise</li>
                  <li>• Highlight patient outcomes and success stories</li>
                  <li>• Include information about treatment plans</li>
                </>
              ) : selectedSubcategoryData.id === 'clinics' ? (
                <>
                  <li>• List all medical services and specialties offered</li>
                  <li>• Highlight your medical staff and their qualifications</li>
                  <li>• Mention modern equipment and facilities</li>
                  <li>• Include information about urgent care availability</li>
                </>
              ) : (
                // Default business tips
                <>
                  <li>• Clearly explain what your business does and who you serve</li>
                  <li>• Mention what makes you different from competitors</li>
                  <li>• Include your mission, values, or what drives you</li>
                  <li>• Keep it engaging but professional</li>
                </>
              )
            ) : (
              // General business tips
              <>
                <li>• Clearly explain what your business does and who you serve</li>
                <li>• Mention what makes you different from competitors</li>
                <li>• Include your mission, values, or what drives you</li>
                <li>• Keep it engaging but professional</li>
              </>
            )
          ) : (
            <>
              <li>• Highlight your key skills and expertise areas</li>
              <li>• Mention your background and experience</li>
              <li>• Share what you're passionate about</li>
              <li>• Keep it authentic and personal</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Step3BusinessInfo;
