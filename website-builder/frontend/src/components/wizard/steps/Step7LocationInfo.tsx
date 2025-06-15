import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  MapPin, 
  Globe, 
  Building, 
  Navigation,
  Plus,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../../utils';

const Step7LocationInfo: React.FC = () => {
  const { data, updateData } = useWizardStore();
  const [formData, setFormData] = React.useState({
    address: data.locationInfo?.address || '',
    city: data.locationInfo?.city || '',
    state: data.locationInfo?.state || '',
    zipCode: data.locationInfo?.zipCode || '',
    country: data.locationInfo?.country || 'United States',
    serviceAreas: data.locationInfo?.serviceAreas || [],
    isOnlineOnly: data.locationInfo?.isOnlineOnly || false
  });

  const [newServiceArea, setNewServiceArea] = React.useState('');
  const [errors, setErrors] = React.useState<string[]>([]);
  const isBusinessType = data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce';

  // Update wizard data when form changes
  React.useEffect(() => {
    const locationData = {
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: formData.country,
      serviceAreas: formData.serviceAreas,
      isOnlineOnly: formData.isOnlineOnly,
      coordinates: undefined // Could be added later with geocoding
    };

    updateData('locationInfo', locationData);
  }, [formData, updateData]);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleAddServiceArea = () => {
    if (newServiceArea.trim() && !formData.serviceAreas.includes(newServiceArea.trim())) {
      const updatedAreas = [...formData.serviceAreas, newServiceArea.trim()];
      handleInputChange('serviceAreas', updatedAreas);
      setNewServiceArea('');
    }
  };

  const handleRemoveServiceArea = (areaToRemove: string) => {
    const updatedAreas = formData.serviceAreas.filter(area => area !== areaToRemove);
    handleInputChange('serviceAreas', updatedAreas);
  };

  const suggestedServiceAreas = [
    'Greater Metropolitan Area',
    'Surrounding Counties',
    'Statewide',
    'Regional (Multi-state)',
    'National',
    'International'
  ];
  const getLocationTypeConfig = () => {
    if (isBusinessType) {
      return {
        title: 'Where is your business located?',
        description: 'Help customers find you and understand your service areas.',
        showServiceAreas: true,
        addressLabel: 'Business Address',
        addressPlaceholder: 'Enter your business address'
      };
    } else {
      return {
        title: 'Where are you based?',
        description: 'This helps potential clients or collaborators understand your location.',
        showServiceAreas: false,
        addressLabel: 'Location',
        addressPlaceholder: 'City, State or Region'
      };
    }
  };

  const config = getLocationTypeConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {config.title}
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {config.description}
        </p>
      </div>

      {/* Online Only Toggle */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="mt-1">
            <Checkbox
              id="online-only"
              checked={formData.isOnlineOnly}
              onCheckedChange={(checked) => handleInputChange('isOnlineOnly', checked as boolean)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="online-only" className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              {isBusinessType ? 'Online/Remote Business Only' : 'Remote Work Only'}
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {isBusinessType 
                ? 'Check this if your business operates entirely online without a physical location'
                : 'Check this if you work remotely and don\'t need to specify a physical location'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Location Form */}
      {!formData.isOnlineOnly && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Physical Location
              </h3>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {config.addressLabel} <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={config.addressPlaceholder}
                className="w-full"
              />
            </div>

            {/* City, State, Zip Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  className={cn(
                    "w-full",
                    errors.some(e => e.includes('City')) && "border-red-500 focus:ring-red-500"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  State/Province <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State or Province"
                  className={cn(
                    "w-full",
                    errors.some(e => e.includes('State')) && "border-red-500 focus:ring-red-500"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ZIP/Postal Code <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="ZIP or Postal Code"
                  className="w-full"
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Country
              </Label>
              <Input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Country"
                className="w-full"
              />
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">Please fix the following errors:</span>
                </div>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Service Areas (Business Only) */}
      {config.showServiceAreas && !formData.isOnlineOnly && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Navigation className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Service Areas
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Where do you provide your services? This helps customers understand if you serve their area.
            </p>

            {/* Add Service Area */}
            <div className="flex space-x-2">
              <Input
                type="text"
                value={newServiceArea}
                onChange={(e) => setNewServiceArea(e.target.value)}
                placeholder="Enter a service area (e.g., Downtown, Suburbs, Statewide)"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleAddServiceArea()}
              />
              <Button
                type="button"
                onClick={handleAddServiceArea}
                disabled={!newServiceArea.trim()}
                className="px-4"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Current Service Areas */}
            {formData.serviceAreas.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Service Areas:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {formData.serviceAreas.map((area, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span>{area}</span>
                      <button
                        onClick={() => handleRemoveServiceArea(area)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Service Areas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quick Add:
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestedServiceAreas.map((area) => (
                  <Button
                    key={area}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!formData.serviceAreas.includes(area)) {
                        handleInputChange('serviceAreas', [...formData.serviceAreas, area]);
                      }
                    }}
                    disabled={formData.serviceAreas.includes(area)}
                    className="text-xs"
                  >
                    {formData.serviceAreas.includes(area) ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    {area}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Location Summary */}
      {(formData.city || formData.isOnlineOnly) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                Location Information Summary
              </h4>
              
              {formData.isOnlineOnly ? (
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ {isBusinessType ? 'Online/Remote Business' : 'Remote Work'} - No physical location needed
                </p>
              ) : (
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                  <p>
                    ✓ <strong>Location:</strong> {formData.city}{formData.state && `, ${formData.state}`}{formData.country && `, ${formData.country}`}
                  </p>
                  {formData.address && (
                    <p>✓ <strong>Address:</strong> {formData.address}</p>
                  )}
                  {config.showServiceAreas && formData.serviceAreas.length > 0 && (
                    <p>
                      ✓ <strong>Service Areas:</strong> {formData.serviceAreas.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Help Text */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
          💡 Location Tips:
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Your location helps with search engine optimization (SEO)</li>
          <li>• Service areas help customers understand if you can help them</li>
          <li>• You can always update this information later</li>
          {isBusinessType && (
            <li>• Consider listing specific neighborhoods or regions you serve</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Step7LocationInfo;
