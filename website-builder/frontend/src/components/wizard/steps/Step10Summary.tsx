import { useState, useEffect } from 'react';
import { CheckCircleIcon, PlayIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, ShareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWizardStore } from '../../../store/wizardStore';
import { toast } from 'sonner';
import { projectsAPI } from '../../../services/api';
import { api } from '../../../services/api';

export default function Step10Summary() {
  const { data, setGenerationComplete, clearData, isGenerationComplete } = useWizardStore();
  const [isGenerating, setIsGenerating] = useState(false);  const [showPreview, setShowPreview] = useState(false);
  const [themeRecommendation, setThemeRecommendation] = useState<any>(null);
  // New state variables for real API integration
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Load theme recommendation on component mount
  useEffect(() => {
    loadThemeRecommendation();
  }, []);

  const loadThemeRecommendation = async () => {
    try {
      // Create project first to get projectId if we don't have one
      let currentProjectId = projectId;
      
      if (!currentProjectId) {
        const projectResponse = await projectsAPI.create({
          name: data.businessInfo?.name || 'Generated Website',
          description: data.businessInfo?.description || '',
          wizardData: data,
          type: data.websiteType?.category || 'business'
        });
        
        currentProjectId = (projectResponse as any).id || (projectResponse as any).data?.id;
        setProjectId(currentProjectId);
      }      // Get theme recommendation
      const response = await api.get(`/generations/detect-theme/${currentProjectId}`) as any;
      const result = response.data;
      setThemeRecommendation(result.data);
    } catch (error) {
      console.error('Failed to load theme recommendation:', error);
      // Don't show error to user as this is optional
    }
  };  // Wizard data validation function
  const validateWizardData = (wizardData: any): boolean => {
    const requiredFields = [
      'businessInfo.name',
      'businessInfo.description',
      'websiteType.category',
      'businessCategory.name',
      'websitePurpose.goals'
      // Removed: 'themeConfig.hugoTheme' since theme is auto-detected
    ];

    const missing: string[] = [];

    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], wizardData);
      if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      console.error('❌ Missing wizard data fields:', missing);
      return false;
    }

    console.log('✅ Wizard data is complete');
    return true;
  };

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
    } if (data.websitePurpose?.goals?.length) {
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
    } if (data.servicesSelection?.selectedServices?.length) {
      summary.push({
        title: 'Services',
        content: data.servicesSelection.selectedServices.map(s => s.name).join(', ')
      });
    } if (data.locationInfo) {
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
    }    if (data.themeConfig) {
      const colorScheme = data.themeConfig.colorScheme?.primary;
      const font = data.themeConfig.typography?.headingFont;
      summary.push({
        title: 'Theme & Style',
        content: `Colors: ${colorScheme || 'Default'}, Font: ${font || 'Default'} (Theme will be auto-detected)`
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
  }; const handleGenerateWebsite = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setCurrentStep('Initializing...');

      console.log('🚀 Starting generation process...');

      // STEP 1: Validate wizard data before proceeding
      if (!validateWizardData(data)) {
        throw new Error('Please complete all wizard steps before proceeding');
      }

      // STEP 2: Verify project status
      console.log('🔍 Checking project status...');
      setCurrentStep('Checking project status...');
      setProgress(5);

      // If we have an existing projectId, check its status
      let currentProjectId = projectId;
      let project = null;
      if (currentProjectId) {
        try {
          // First check project readiness via health endpoint
          const readiness = await checkGenerationReadiness(currentProjectId);
          console.log('📊 Generation readiness:', readiness);

          if (!readiness.ready) {
            console.log('🚫 Generation not ready:', readiness.reason);
          }

          const projectResponse = await api.get(`/projects/${currentProjectId}`) as any;
          project = projectResponse.data;

          console.log('📊 Project status:', {
            id: project.id,
            isCompleted: project.isCompleted,
            hasWizardData: !!project.wizardData
          });
        } catch (projectError: any) {
          console.warn('Could not fetch existing project, will create new one:', projectError.message);
          currentProjectId = null;
        }
      }

      // STEP 3: Project Creation (if needed)
      if (!currentProjectId) {
        setCurrentStep('Creating project...');
        setProgress(10);

        // Before creating the project, add this logging
        console.log('🔍 Creating project with data:', {
          name: data.businessInfo?.name || 'Generated Website',
          description: data.businessInfo?.description || data.businessDescription?.description || '',
          wizardData: data,
          type: data.websiteType?.category || 'business'
        });

        // Create a new project
        const projectResponse = await projectsAPI.create({
          name: data.businessInfo?.name || 'Generated Website',
          description: data.businessInfo?.description || data.businessDescription?.description || '',
          wizardData: data,
          type: data.websiteType?.category || 'business'
        });

        console.log('✅ Project created:', projectResponse);

        currentProjectId = (projectResponse as any).id || (projectResponse as any).data?.id;
        project = projectResponse;
      }

      setProgress(25);
      setCurrentStep('Project ready');

      // STEP 4: Auto-complete project if needed
      if (project && !project.isCompleted) {
        console.log('⚠️ Project not completed, attempting to complete...');
        setCurrentStep('Completing project setup...');
        setProgress(30);

        try {
          await api.post(`/projects/${currentProjectId}/complete`);
          console.log('✅ Project completed successfully');
        } catch (completeError: any) {
          console.error('❌ Failed to complete project:', completeError);
          throw new Error('Project could not be completed. Please ensure all wizard steps are filled out.');
        }
      }      // STEP 5: Start generation
      console.log('🎯 Starting website generation...');
      setCurrentStep('Starting website generation...');
      setProgress(40);

      console.log('Using auto-detection for Hugo theme');

      const generationResponse = await projectsAPI.generateContent(currentProjectId!, {
        // Removed: hugoTheme - will be auto-detected
        autoDetectTheme: true,
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

      console.log('🚀 Generation response:', generationResponse);      const newGenerationId = (generationResponse as any).generationId || (generationResponse as any).data?.generationId;
      console.log('✅ Generation started with ID:', newGenerationId);

      setProgress(50);
      setCurrentStep('Generation started, processing content...');

      // STEP 6: Status Polling
      pollGenerationStatus(newGenerationId);

    } catch (error: any) {
      console.error('❌ Generation process failed:', error);

      // Provide specific error messages
      if (error.response?.status === 400) {
        const errorCode = error.response.data?.error?.code;
        const errorMessage = error.response.data?.error?.message;

        switch (errorCode) {
          case 'PROJECT_NOT_COMPLETED':
            setError('Project setup is incomplete. Please complete all wizard steps and try again.');
            break;
          case 'VALIDATION_ERROR':
            setError('Invalid generation settings. Please check your configuration and try again.');
            break;
          default:
            setError(`Generation failed: ${errorMessage || 'Unknown error'}`);
        }
      } else if (error.response?.status === 409) {
        setError('A website is already being generated for this project. Please wait for it to complete.');
      } else if (error.response?.status === 404) {
        setError('Project not found. Please try creating a new project.');
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Status polling function
  const pollGenerationStatus = async (generationId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++; const response = await api.get(`/generations/${generationId}/status`) as any;
        const status = response.data;

        console.log(`📊 Generation status (${attempts}/${maxAttempts}):`, status);

        if (status.status === 'COMPLETED') {
          console.log('🎉 Generation completed successfully!');
          setGenerationResult({
            previewUrl: status.previewUrl,
            downloadUrl: status.downloadUrl,
            content: status.content
          });
          setProgress(100);
          setCurrentStep('Website generation completed!');
          setGenerationComplete(true);
          toast.success('Website generated successfully!');
          return;
        }

        if (status.status === 'FAILED') {
          console.log('❌ Generation failed');
          setError('Website generation failed. Please try again.');
          return;
        }

        if (['PENDING', 'GENERATING_CONTENT', 'BUILDING_SITE', 'PACKAGING'].includes(status.status)) {
          setProgress(status.progress || progress + 5);
          setCurrentStep(status.currentStep || 'Processing...');

          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setError('Generation is taking longer than expected. Please check back later.');
          }
          return;
        }

      } catch (error) {
        console.error('❌ Status polling failed:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to get generation status. Please refresh the page.');
        }
      }
    };

    poll();
  };
  // Health check function
  const checkGenerationReadiness = async (projectId: string) => {
    try {
      const response = await api.get(`/health/generation-readiness/${projectId}`) as any;
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return { ready: false, reason: 'Health check failed' };
    }
  };

  // Wrapper for button click
  const handleGenerateClick = () => {
    handleGenerateWebsite();
  }; const handleStartOver = () => {
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
            </div>          </div>

          {/* Theme Recommendation Preview */}
          {themeRecommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🎨</span>
                <h3 className="font-semibold text-blue-900">
                  Recommended Theme: {themeRecommendation.recommendedTheme}
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {Math.round(themeRecommendation.confidence)}% confidence
                </span>
              </div>
              
              <p className="text-blue-700 text-sm mb-4">
                {themeRecommendation.explanation}
              </p>
              
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Why this theme? (Click to expand)
                </summary>
                <ul className="mt-2 space-y-1 text-blue-600">
                  {themeRecommendation.reasons.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

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
