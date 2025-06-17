import { useState } from 'react';
import { SwatchIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useWizardStore } from '../../../store/wizardStore';

const COLOR_SCHEMES = [
  {
    name: 'Modern Blue',
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#1f2937'
  },
  {
    name: 'Forest Green',
    primary: '#059669',
    secondary: '#047857',
    accent: '#10b981',
    background: '#ffffff',
    text: '#1f2937'
  },
  {
    name: 'Sunset Orange',
    primary: '#ea580c',
    secondary: '#c2410c',
    accent: '#fb923c',
    background: '#ffffff',
    text: '#1f2937'
  },
  {
    name: 'Royal Purple',
    primary: '#7c3aed',
    secondary: '#6d28d9',
    accent: '#a78bfa',
    background: '#ffffff',
    text: '#1f2937'
  },
  {
    name: 'Crimson Red',
    primary: '#dc2626',
    secondary: '#b91c1c',
    accent: '#f87171',
    background: '#ffffff',
    text: '#1f2937'
  },
  {
    name: 'Slate Gray',
    primary: '#475569',
    secondary: '#334155',
    accent: '#64748b',
    background: '#ffffff',
    text: '#1f2937'
  }
];

const FONTS = {
  heading: [
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Montserrat', value: 'Montserrat' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Lato', value: 'Lato' },
    { name: 'Playfair Display', value: 'Playfair Display' },
    { name: 'Source Sans Pro', value: 'Source Sans Pro' }
  ],
  body: [
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Lato', value: 'Lato' },
    { name: 'Source Sans Pro', value: 'Source Sans Pro' },
    { name: 'Nunito', value: 'Nunito' },
    { name: 'PT Sans', value: 'PT Sans' },
    { name: 'Merriweather', value: 'Merriweather' }
  ]
};

// UPDATED: Remove theme selection, keep only colors and fonts
export default function Step9ThemeConfig() {
  const { data, updateData } = useWizardStore();
  const [activeTab, setActiveTab] = useState<'colors' | 'typography'>('colors');

  // REMOVED: Theme selection logic
  // REMOVED: HUGO_THEMES array
  // REMOVED: handleThemeSelect function

  const handleColorChange = (colorType: string, color: string) => {
    updateData('themeConfig', {
      ...data.themeConfig,
      colorScheme: {
        ...data.themeConfig?.colorScheme,
        [colorType]: color
      }
    });
  };

  const handleColorSchemeSelect = (scheme: typeof COLOR_SCHEMES[0]) => {
    updateData('themeConfig', {
      ...data.themeConfig,
      colorScheme: scheme,
      typography: data.themeConfig?.typography || {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSize: 'medium' as 'small' | 'medium' | 'large'
      },
      layout: data.themeConfig?.layout || {
        headerStyle: 'standard',
        footerStyle: 'standard',
        sidebarEnabled: false
      }
    });
  };

  const handleTypographyChange = (property: string, value: any) => {
    updateData('themeConfig', {
      ...data.themeConfig,
      typography: {
        ...data.themeConfig?.typography,
        [property]: value
      }
    });
  };

  const handleCustomColorChange = (colorType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(colorType, event.target.value);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Customize Your Website Appearance
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose colors and fonts that match your brand. We'll automatically select the best theme for your business type.
        </p>
      </div>

      {/* Tab Navigation - REMOVED theme tab */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { key: 'colors', label: 'Colors', icon: SwatchIcon },
            { key: 'typography', label: 'Typography', icon: PencilIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === key
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Choose Your Brand Colors
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a color scheme or customize individual colors
            </p>
          </div>

          {/* Preset Color Schemes */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Preset Color Schemes
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {COLOR_SCHEMES.map((scheme) => (
                <button
                  key={scheme.name}
                  onClick={() => handleColorSchemeSelect(scheme)}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    data.themeConfig?.colorScheme?.primary === scheme.primary
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">
                    {scheme.name}
                  </h5>
                  <div className="flex space-x-1">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: scheme.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: scheme.secondary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: scheme.accent }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Custom Colors
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">              {[
                { key: 'primary', label: 'Primary Color', description: 'Main brand color' },
                { key: 'secondary', label: 'Secondary Color', description: 'Secondary brand color' },
                { key: 'accent', label: 'Accent Color', description: 'Highlights and calls-to-action' },
                { key: 'background', label: 'Background Color', description: 'Page background' },
                { key: 'text', label: 'Text Color', description: 'Main text color' }
              ].map(({ key, label, description }) => {
                const colorScheme = data.themeConfig?.colorScheme;
                const currentValue = colorScheme ? (colorScheme as any)[key] || '#2563eb' : '#2563eb';
                
                return (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={currentValue}
                      onChange={(e) => handleCustomColorChange(key, e)}
                      className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                        placeholder="#2563eb"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Typography Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose fonts that reflect your brand personality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Heading Font */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Heading Font
              </label>
              <select
                value={data.themeConfig?.typography?.headingFont || 'Inter'}
                onChange={(e) => handleTypographyChange('headingFont', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                {FONTS.heading.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
              <div 
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                style={{ fontFamily: data.themeConfig?.typography?.headingFont || 'Inter' }}
              >
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  Sample Heading Text
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  This is how your headings will look
                </p>
              </div>
            </div>

            {/* Body Font */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Body Font
              </label>
              <select
                value={data.themeConfig?.typography?.bodyFont || 'Inter'}
                onChange={(e) => handleTypographyChange('bodyFont', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                {FONTS.body.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
              <div 
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                style={{ fontFamily: data.themeConfig?.typography?.bodyFont || 'Inter' }}
              >
                <p className="text-gray-900 dark:text-white">
                  This is sample body text that shows how your content will appear to visitors. 
                  The font choice affects readability and your brand's personality.
                </p>
              </div>
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Font Size
            </label>
            <div className="flex space-x-4">
              {[
                { value: 'small', label: 'Small', description: 'Compact and minimal' },
                { value: 'medium', label: 'Medium', description: 'Standard and readable' },
                { value: 'large', label: 'Large', description: 'Bold and prominent' }
              ].map((size) => (
                <button
                  key={size.value}
                  onClick={() => handleTypographyChange('fontSize', size.value)}
                  className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                    data.themeConfig?.typography?.fontSize === size.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {size.label}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {size.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Summary */}
      {data.themeConfig?.colorScheme && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            🎨 Appearance Configuration
          </h4>
          <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <p>• Colors: {data.themeConfig.colorScheme.primary} (Primary)</p>
            <p>• Heading Font: {data.themeConfig?.typography?.headingFont || 'Inter'}</p>
            <p>• Body Font: {data.themeConfig?.typography?.bodyFont || 'Inter'}</p>
            <p>• Font Size: {data.themeConfig?.typography?.fontSize || 'medium'}</p>
            <p className="text-blue-600 dark:text-blue-400 font-medium mt-2">
              ✨ We'll automatically choose the perfect theme based on your business type!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
