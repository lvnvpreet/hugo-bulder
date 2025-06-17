import { useState } from 'react';
import { CheckCircleIcon, PlayIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, ShareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWizardStore } from '../../../store/wizardStore';
import { toast } from 'sonner';
import { projectsAPI } from '../../../services/api';

export default function Step10Summary() {
  const { data, setGenerationComplete, clearData, isGenerationComplete } = useWizardStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Supported Hugo themes (must match backend)
  const SUPPORTED_THEMES = [
    'ananke', 'papermod', 'business-pro', 'restaurant-deluxe', 
    'medical-care', 'creative-studio', 'tech-startup', 'retail-store', 
    'academic', 'mainroad', 'clarity', 'terminal'
  ];
    // New state variables for real API integration
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Generate a summary of all wizard data
  const getWizardSummary = () => {
    const summary = [];
    
    if (data.websiteType) {
      summary.push({
        title: 'Website Type',
        content: `${data.websiteType.category} - ${data.websiteType.description}`
      });
    }

    if (data.businessCategory) {
      summary.push({
        title: 'Business Category',
        content: data.businessCategory.name
      });
    }

    if (data.businessInfo) {
      summary.push({
        title: 'Business Information',
        content: `${data.businessInfo.name}${data.businessInfo.tagline ? ` - ${data.businessInfo.tagline}` : ''}`
      });
    }    if (data.websitePurpose?.goals?.length) {
      summary.push({
        title: 'Website Purpose',
        content: data.websitePurpose.goals.join(', ')
      });
    }

    if (data.businessDescription) {
      summary.push({
        title: 'Business Description',
        content: data.businessDescription.description.substring(0, 100) + '...'
      });
    }    if (data.servicesSelection?.selectedServices?.length) {
      summary.push({
        title: 'Services',
        content: data.servicesSelection.selectedServices.map(s => s.name).join(', ')
      });
    }    if (data.locationInfo) {
      summary.push({
        title: 'Location',
        content: data.locationInfo.isOnlineOnly ? 'Online Business' : 
                data.locationInfo.address ? data.locationInfo.address : 'Physical Location'
      });
    }

    if (data.websiteStructure) {
      summary.push({
        title: 'Website Structure',
        content: `${data.websiteStructure.type === 'single-page' ? 'Single Page' : 'Multi-Page'} Website`
      });
    }

    if (data.themeConfig) {
      const theme = data.themeConfig.hugoTheme;
      const colorScheme = data.themeConfig.colorScheme?.primary;
      const font = data.themeConfig.typography?.headingFont;
      summary.push({
        title: 'Theme & Style',
        content: `Theme: ${theme || 'Default'}, Colors: ${colorScheme || 'Default'}, Font: ${font || 'Default'}`
      });
    }

    if (data.additionalRequirements) {
      const features = [];
      if (data.additionalRequirements.seoFocus?.length) features.push('SEO Optimized');
      if (data.additionalRequirements.integrations?.length) features.push('Third-party Integrations');
      if (data.additionalRequirements.specialFeatures?.length) features.push('Special Features');
      
      if (features.length > 0) {
        summary.push({
          title: 'Additional Features',
          content: features.join(', ')
        });
      }
    }

    return summary;
  };  const handleGenerateWebsite = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setCurrentStep('Initializing...');
      try {
      // STEP 1: Project Creation
      setCurrentStep('Creating project...');
      setProgress(10);
      
      // Create a new project
      const projectResponse = await projectsAPI.create({
        name: data.businessInfo?.name || 'Generated Website',
        description: data.businessInfo?.description || data.businessDescription?.description || '',
        wizardData: data,
        type: data.websiteType?.category || 'business'
      });
      
      const projectId = (projectResponse as any).id || (projectResponse as any).data?.id;
      
      setProgress(25);
      setCurrentStep('Project created successfully');
      
      // STEP 2: Start Generation
      setCurrentStep('Starting content generation...');
      setProgress(30);      // Validate and get theme
      const selectedTheme = data.themeConfig?.hugoTheme || 'business-pro';
      const validTheme = SUPPORTED_THEMES.includes(selectedTheme) ? selectedTheme : 'business-pro';
      
      if (selectedTheme !== validTheme) {
        console.warn(`Theme '${selectedTheme}' is not supported, using '${validTheme}' instead`);
        toast.info(`Using ${validTheme} theme for generation`);
      }
      
      console.log('Using Hugo theme:', validTheme);
      
      const generationResponse = await projectsAPI.generateContent(projectId, {
        hugoTheme: validTheme,
        customizations: {
          colors: data.themeConfig?.colorScheme,
          fonts: data.themeConfig?.typography
        },
        contentOptions: {
          tone: 'professional',
          includeSEO: true,
          generateSampleContent: true
        }
      });
        const newGenerationId = (generationResponse as any).generationId || (generationResponse as any).data?.generationId;
      setProgress(40);
      setCurrentStep('Generation started, processing content...');
      
      // STEP 3: Status Polling
      const pollStatus = async () => {
        try {          const statusResponse = await projectsAPI.getGenerationStatus(newGenerationId);
          const status = (statusResponse as any).data || statusResponse;
          
          // Update UI progress
          setProgress(status.progress || 40);
          setCurrentStep(status.currentStep || 'Processing...');
          
          // Handle different status states
          if (status.status === 'COMPLETED') {
            // Success: store results and complete
            setGenerationResult({
              previewUrl: status.previewUrl,
              downloadUrl: status.downloadUrl,
              content: status.content
            });
            setProgress(100);
            setCurrentStep('Website generation completed!');
            setGenerationComplete(true);
            toast.success('Website generated successfully!');
          } else if (status.status === 'FAILED') {
            // Error: throw exception
            throw new Error(status.error || 'Generation failed');
          } else {
            // Still processing: continue polling
            setTimeout(pollStatus, 2000);
          }
        } catch (error: any) {
          console.error('Polling error:', error);
          throw error;
        }
      };
      
      // Start polling
      setTimeout(pollStatus, 2000);
        } catch (error: any) {
      console.error('Generation failed:', error);
      
      // Check if it's a theme validation error
      if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('theme')) {
        setError('Theme validation failed. Please go back to Step 9 and select a different theme.');
        toast.error('Invalid theme selected. Please go back to Step 9 and choose a supported theme.');
      } else {
        setError(error.message || 'An unexpected error occurred');
      }
      
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && isRetryableError(error)) {
        toast.error(`Generation failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => handleGenerateWebsite(retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
      
      // Final failure
      if (!error.response?.data?.error?.message?.includes('theme')) {
        toast.error('Generation failed: ' + (error.message || 'Unknown error'));
      }
      setIsGenerating(false);
    }
  };
  
  // Helper function to determine if error is retryable
  const isRetryableError = (error: any) => {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ECONNABORTED' ||
           (error.response && error.response.status >= 500);
  };
  
  // Wrapper for button click
  const handleGenerateClick = () => {
    handleGenerateWebsite(0);
  };const handleStartOver = () => {
    // Reset the wizard data and go back to step 1
    clearData();
  };

  const summary = getWizardSummary();

  return (
    <div className="space-y-8">
      {/* Header */}      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {isGenerationComplete ? 'Website Generated Successfully!' : 'Review & Generate Your Website'}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {isGenerationComplete 
            ? 'Your Hugo website has been generated and is ready for download and deployment.'
            : 'Review your website configuration and generate your Hugo-powered website.'
          }
        </p>
      </div>

      {!isGenerationComplete && (
        <>
          {/* Configuration Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <DocumentIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Website Configuration Summary
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {summary.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Website Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <EyeIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Website Preview
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
            </div>
            
            {showPreview && (
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <div 
                    className="max-w-2xl mx-auto p-6 rounded-lg border"
                    style={{
                      backgroundColor: data.themeConfig?.colorScheme?.background || '#ffffff',
                      color: data.themeConfig?.colorScheme?.text || '#1f2937',
                      borderColor: data.themeConfig?.colorScheme?.primary || '#e5e7eb'
                    }}
                  >
                    <h1 
                      className="text-2xl font-bold mb-4"
                      style={{ 
                        color: data.themeConfig?.colorScheme?.primary || '#1f2937',
                        fontFamily: data.themeConfig?.typography?.headingFont || 'system-ui'
                      }}
                    >
                      {data.businessInfo?.name || 'Your Website'}
                    </h1>
                    <p className="mb-4">
                      {data.businessInfo?.tagline || data.businessDescription?.description?.substring(0, 150) || 'Welcome to our website'}
                    </p>
                    <button
                      className="px-6 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: data.themeConfig?.colorScheme?.primary || '#3b82f6' }}
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">{currentStep}</p>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{progress}% complete</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button 
                onClick={handleGenerateClick} 
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Retry Generation
              </button>
            </div>
          )}

          {/* Generation Options */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <PlayIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Ready to Generate Your Website?
                </h3>
                <p className="text-blue-700 dark:text-blue-300 mb-4">
                  We'll create a complete Hugo website with your chosen theme, content, and configuration. 
                  The generated site will include all necessary files and can be deployed immediately.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">                  <button
                    onClick={handleGenerateClick}
                    disabled={isGenerating}
                    className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Generating Website...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4 mr-2" />
                        Generate Website
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}      {/* Generation Complete */}
      {isGenerationComplete && (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                  Website Generation Complete!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  Your Hugo website has been successfully generated with all your customizations.
                </p>
              </div>
            </div>
          </div>

          {/* Download and Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                <ArrowDownTrayIcon className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Download Files
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Download your complete Hugo website source code and assets.
                </p>                <button 
                  onClick={() => {
                    if (generationResult?.downloadUrl) {
                      window.open(generationResult.downloadUrl, '_blank');
                    } else {
                      toast.error('Download URL not available');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Download ZIP
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                <EyeIcon className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Preview Site
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  View your website in a new tab to see how it looks.
                </p>                <button 
                  onClick={() => {
                    if (generationResult?.previewUrl) {
                      window.open(generationResult.previewUrl, '_blank');
                    } else {
                      toast.error('Preview URL not available');
                    }
                  }}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Open Preview
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                <ShareIcon className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Deploy Site
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Deploy your website to Netlify, Vercel, or GitHub Pages.
                </p>
                <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                  Deploy Now
                </button>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Next Steps
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <p>Download and extract your website files to your local machine.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <p>Install Hugo on your computer to preview and edit your site locally.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </div>
                <p>Customize your content by editing the Markdown files in the content directory.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  4
                </div>
                <p>Deploy your site to a hosting platform for the world to see.</p>
              </div>
            </div>
          </div>

          {/* Create Another Site */}
          <div className="text-center">
            <button
              onClick={handleStartOver}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Another Website
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
