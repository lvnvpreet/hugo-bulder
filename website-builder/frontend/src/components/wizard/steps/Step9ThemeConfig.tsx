import { useState } from 'react';
import { PaintBrushIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { useWizardStore } from '../../../store/wizardStore';

const HUGO_THEMES = [
  {
    id: 'business-pro',
    name: 'Business Pro',
    description: 'Professional business theme with modern styling',
    category: 'Business'
  },
  {
    id: 'ananke',
    name: 'Ananke',
    description: 'Hugo default theme with clean design',
    category: 'Business'
  },
  {
    id: 'papermod',
    name: 'PaperMod',
    description: 'Clean and fast theme with excellent typography',
    category: 'Blog'
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    description: 'Modern theme for creative professionals',
    category: 'Portfolio'
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern theme perfect for technology companies',
    category: 'Technology'
  },
  {
    id: 'restaurant-deluxe',
    name: 'Restaurant Deluxe',
    description: 'Elegant theme for restaurants and food businesses',
    category: 'Restaurant'
  },
  {
    id: 'medical-care',
    name: 'Medical Care',
    description: 'Professional theme for healthcare providers',
    category: 'Healthcare'
  },
  {
    id: 'retail-store',
    name: 'Retail Store',
    description: 'Perfect theme for online stores and retail businesses',
    category: 'E-commerce'
  }
];

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
  }
];

export default function Step9ThemeConfig() {
  const { data, updateData } = useWizardStore();
  const [activeTab, setActiveTab] = useState<'theme' | 'colors' | 'typography'>('theme');

  const handleThemeSelect = (themeId: string) => {
    updateData('themeConfig', {
      ...data.themeConfig,
      hugoTheme: themeId,
      colorScheme: data.themeConfig?.colorScheme || COLOR_SCHEMES[0],
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

  const handleColorSchemeSelect = (scheme: typeof COLOR_SCHEMES[0]) => {
    updateData('themeConfig', {
      ...data.themeConfig,
      hugoTheme: data.themeConfig?.hugoTheme || HUGO_THEMES[0].id,
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Customize Your Website Theme
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose a professional theme and customize colors that match your brand
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { key: 'theme', label: 'Theme', icon: PaintBrushIcon },
            { key: 'colors', label: 'Colors', icon: SwatchIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'theme' | 'colors' | 'typography')}
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

      {/* Theme Selection */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Choose Your Hugo Theme
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HUGO_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={`relative text-left border-2 rounded-xl p-6 transition-all ${
                  data.themeConfig?.hugoTheme === theme.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {theme.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {theme.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Scheme Selection */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Choose Color Scheme
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {scheme.name}
                </h4>
                <div className="flex space-x-2">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: scheme.secondary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: scheme.accent }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Summary */}
      {(data.themeConfig?.hugoTheme || data.themeConfig?.colorScheme) && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
            Theme Configuration Summary
          </h4>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            {data.themeConfig?.hugoTheme && (
              <p>• Theme: {HUGO_THEMES.find(t => t.id === data.themeConfig?.hugoTheme)?.name}</p>
            )}            {data.themeConfig?.colorScheme && (
              <p>• Color Scheme: Custom ({data.themeConfig.colorScheme.primary})</p>
            )}
          </div>
        </div>
      )}    </div>
  );
}
