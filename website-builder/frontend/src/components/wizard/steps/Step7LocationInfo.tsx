// =============================================================================
// STEP 7: LOCATION & CONTACT INFORMATION (DARK MODE FIXED)
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../../store/wizardStore';
import { Card } from '../../ui/card';
import { cn } from '../../../utils';

const Step7LocationInfo: React.FC = () => {
  const { data, updateData } = useWizardStore();

  interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }

  interface ContactInfo {
    email: string;
    phone: string;
    website: string;
    socialMedia: {
      facebook: string;
      instagram: string;
      twitter: string;
      linkedin: string;
    };
  }

  interface LocationData {
    hasPhysicalLocation: boolean;
    address: Address;
    serviceAreas: string[];
    isOnlineOnly: boolean;
    locationType: 'physical' | 'online' | 'both'; // Add this line
    contactInfo: ContactInfo;
  }

  const [locationData, setLocationData] = useState<LocationData>({
    hasPhysicalLocation: data.locationInfo?.hasPhysicalLocation ?? true,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      ...(data.locationInfo?.address || {})
    },
    serviceAreas: data.locationInfo?.serviceAreas && Array.isArray(data.locationInfo.serviceAreas)
      ? data.locationInfo.serviceAreas
      : [''],
    isOnlineOnly: data.locationInfo?.isOnlineOnly ?? false,
    locationType: data.locationInfo?.locationType || 'physical', // Add this line
    // NEW: Contact Information
    contactInfo: {
      email: '',
      phone: '',
      website: '',
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: ''
      },
      ...(data.locationInfo?.contactInfo || {})
    }
  });

  const handleLocationTypeChange = (type: 'physical' | 'online' | 'both') => {
    const newData = {
      ...locationData,
      locationType: type, // Store the exact selection
      hasPhysicalLocation: type === 'physical' || type === 'both',
      isOnlineOnly: type === 'online'
    };

    console.log(newData);

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  const handleAddressChange = (field: string, value: string) => {
    const newData = {
      ...locationData,
      address: {
        ...(locationData.address || {}), // Ensure address is an object
        [field]: value
      }
    };

    console.log(newData);

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  const handleServiceAreaChange = (index: number, value: string) => {
    const currentAreas = Array.isArray(locationData.serviceAreas) ? locationData.serviceAreas : [''];
    const newAreas = [...currentAreas]; // Ensure serviceAreas is an array
    newAreas[index] = value;

    const newData = {
      ...locationData,
      serviceAreas: newAreas
    };

    console.log(newData);

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  const addServiceArea = () => {
    const currentAreas = Array.isArray(locationData.serviceAreas) ? locationData.serviceAreas : [''];
    const newData = {
      ...locationData,
      serviceAreas: [...currentAreas, '']
    };

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  const removeServiceArea = (index: number) => {
    const currentAreas = Array.isArray(locationData.serviceAreas) ? locationData.serviceAreas : [''];
    const newData = {
      ...locationData,
      serviceAreas: currentAreas.filter((_, i) => i !== index)
    };

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  // NEW: Contact Info Handlers
  const handleContactInfoChange = (field: string, value: string) => {
    const newData = {
      ...locationData,
      contactInfo: {
        ...(locationData.contactInfo || {}), // Ensure contactInfo is an object
        [field]: value
      }
    };

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    const newData = {
      ...locationData,
      contactInfo: {
        ...(locationData.contactInfo || {}), // Ensure contactInfo is an object
        socialMedia: {
          ...(locationData.contactInfo?.socialMedia || {}), // Ensure socialMedia is an object
          [platform]: value
        }
      }
    };

    setLocationData(newData);
    updateData('locationInfo', newData);
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation function for the step
  const validateStep = () => {
    const errors: string[] = [];
    
    // Validate email if provided
    if (locationData.contactInfo?.email && !isValidEmail(locationData.contactInfo.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Validate required fields for physical locations
    if (locationData.hasPhysicalLocation) {
      if (!locationData.address?.city?.trim()) {
        errors.push('City is required for physical locations');
      }
      if (!locationData.address?.state?.trim()) {
        errors.push('State/Province is required for physical locations');
      }
    }
    
    return errors;
  };

  // Use effect to validate when data changes
  useEffect(() => {
    const errors = validateStep();
    // You can use this errors array to show validation messages
    // or pass it to your wizard store for step validation
  }, [locationData]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleContactInfoChange('phone', formatted);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Location & Contact Information
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Help customers find and contact you by providing location and contact details.
          This information improves local SEO and makes it easy for customers to reach you.
        </p>
      </div>

      {/* Location Type Selection */}
      <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Business Location Type
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleLocationTypeChange('physical')}
            className={cn(
              "p-4 border rounded-lg text-center transition-all duration-200",
              locationData.locationType === 'physical'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            )}
          >
            <div className="text-2xl mb-2">🏢</div>
            <h4 className="font-medium text-gray-900 dark:text-white">Physical Location</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Customers visit your location</p>
          </button>

          <button
            onClick={() => handleLocationTypeChange('online')}
            className={cn(
              "p-4 border rounded-lg text-center transition-all duration-200",
              locationData.locationType === 'online'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            )}
          >
            <div className="text-2xl mb-2">💻</div>
            <h4 className="font-medium text-gray-900 dark:text-white">Online Only</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Remote services only</p>
          </button>

          <button
            onClick={() => handleLocationTypeChange('both')}
            className={cn(
              "p-4 border rounded-lg text-center transition-all duration-200",
              locationData.locationType === 'both'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            )}
          >
            <div className="text-2xl mb-2">🌐</div>
            <h4 className="font-medium text-gray-900 dark:text-white">Both</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Physical + online services</p>
          </button>
        </div>
      </Card>

      {/* Physical Address */}
      {locationData.hasPhysicalLocation && (
        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Business Address
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Street Address
              </label>
              <input
                type="text"
                value={locationData.address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder="123 Main Street"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                City
              </label>
              <input
                type="text"
                value={locationData.address.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                State/Province
              </label>
              <input
                type="text"
                value={locationData.address.state}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder="State"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                value={locationData.address.zipCode}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                placeholder="12345"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Country
              </label>
              <input
                type="text"
                value={locationData.address.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                placeholder="United States"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Contact Information */}
      <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Contact Information
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Provide ways for customers to contact you. This information will be displayed on your website.
        </p>

        <div className="space-y-6">
          {/* Email and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={locationData.contactInfo.email}
                onChange={(e) => handleContactInfoChange('email', e.target.value)}
                placeholder="info@yourbusiness.com"
                className={cn(
                  "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
                  locationData.contactInfo.email && !isValidEmail(locationData.contactInfo.email)
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600"
                )}
              />
              {locationData.contactInfo.email && !isValidEmail(locationData.contactInfo.email) && (
                <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Phone Number
              </label>
              <input
                type="tel"
                value={locationData.contactInfo.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                maxLength={14}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Current Website (Optional)
            </label>
            <input
              type="url"
              value={locationData.contactInfo.website}
              onChange={(e) => handleContactInfoChange('website', e.target.value)}
              placeholder="www.yourbusiness.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If you have an existing website, we can reference it for content ideas
            </p>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Social Media Profiles (Optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Facebook */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">f</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Facebook</label>
                  <input
                    type="url"
                    value={locationData.contactInfo.socialMedia.facebook}
                    onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/yourbusiness"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <span className="text-pink-600 dark:text-pink-400 font-semibold">📷</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Instagram</label>
                  <input
                    type="url"
                    value={locationData.contactInfo.socialMedia.instagram}
                    onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/yourbusiness"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Twitter */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">🐦</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Twitter/X</label>
                  <input
                    type="url"
                    value={locationData.contactInfo.socialMedia.twitter}
                    onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/yourbusiness"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-blue-700 dark:text-blue-400 font-semibold">in</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={locationData.contactInfo.socialMedia.linkedin}
                    onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourbusiness"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Service Areas */}
      <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Areas
          </h3>
          <button
            onClick={addServiceArea}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            + Add Area
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Where do you provide services? This helps with local SEO and helps customers understand your coverage area.
        </p>

        <div className="space-y-3">
          {(Array.isArray(locationData.serviceAreas) ? locationData.serviceAreas : ['']).map((area, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="text"
                value={area || ''}
                onChange={(e) => handleServiceAreaChange(index, e.target.value)}
                placeholder="e.g., Seattle, WA or 'Within 50 miles of downtown'"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {(Array.isArray(locationData.serviceAreas) ? locationData.serviceAreas : ['']).length > 1 && (
                <button
                  onClick={() => removeServiceArea(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Contact Summary */}
      {(locationData.contactInfo?.email || locationData.contactInfo?.phone) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
            📞 Contact Information Summary:
          </h4>
          <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
            {locationData.contactInfo?.email && (
              <p><strong>Email:</strong> {locationData.contactInfo.email}</p>
            )}
            {locationData.contactInfo?.phone && (
              <p><strong>Phone:</strong> {locationData.contactInfo.phone}</p>
            )}
            {locationData.contactInfo?.website && (
              <p><strong>Website:</strong> {locationData.contactInfo.website}</p>
            )}
            {locationData.contactInfo?.socialMedia && Object.values(locationData.contactInfo.socialMedia).some(url => url) && (
              <p><strong>Social Media:</strong> {Object.values(locationData.contactInfo.socialMedia).filter(url => url).length} profiles added</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 Location & Contact Tips:
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Complete address information helps with Google Maps integration</li>
          <li>• Service areas improve local search rankings</li>
          <li>• Professional email addresses build trust (avoid @gmail.com for business)</li>
          <li>• Social media profiles increase online credibility</li>
          <li>• Phone numbers should be easily readable and clickable on mobile</li>
          <li>• Consider mentioning nearby landmarks or neighborhoods for better local SEO</li>
        </ul>
      </div>
    </div>
  );
};

export default Step7LocationInfo;