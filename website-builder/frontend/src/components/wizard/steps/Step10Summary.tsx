import { useState, useEffect } from 'react';
import { CheckCircleIcon, PlayIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, ShareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWizardStore } from '../../../store/wizardStore';
import { toast } from 'sonner';
import { projectsAPI } from '../../../services/api';
import { api } from '../../../services/api';

export default function Step10Summary() {
  const { data, setGenerationComplete, clearData, isGenerationComplete } = useWizardStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [themeRecommendation, setThemeRecommendation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [isLoadingTheme, setIsLoadingTheme] = useState<boolean>(false);

  // Load theme recommendation on component mount
  useEffect(() => {
    if (!isCreatingProject && !projectId && !themeRecommendation) {
      loadThemeRecommendation();
    }
  }, []); // Empty dependency array to run only once

  // Enhanced theme recommendation loading that tries wizard-first approach
  const loadThemeRecommendation = async () => {
    setIsLoadingTheme(true);

    try {
      console.log('🎨 Loading theme recommendation...');

      // METHOD 1: Try to get theme recommendation directly from wizard data (no project needed)
      if (data.websiteType) {
        console.log('🔍 Attempting wizard-based theme detection');

        try {
          const response = await api.post('/generations/detect-theme-wizard', {
            wizardData: data
          }) as any;

          console.log('📥 Wizard theme response:', response);

          if (response?.data?.success && response.data.data) {
            setThemeRecommendation(response.data.data);
            console.log('✅ Theme recommendation from wizard data:', response.data.data);
            setIsLoadingTheme(false);
            return; // Success, no need for project-based detection
          }
        } catch (wizardError: any) {
          console.warn('⚠️ Wizard-based theme detection failed:', wizardError.message);
          // Continue to fallback method
        }
      }

      // METHOD 2: Use fallback theme recommendation (no API calls needed)
      console.log('🔄 Using fallback theme recommendation');
      const fallbackTheme = getFallbackTheme();
      setThemeRecommendation(fallbackTheme);
      console.log('✅ Fallback theme recommendation set:', fallbackTheme);

    } catch (error: any) {
      console.error('❌ Failed to load theme recommendation:', error);

      // Provide fallback theme recommendation based on website type
      const fallbackTheme = getFallbackTheme();
      setThemeRecommendation(fallbackTheme);
      console.log('🔄 Using fallback theme recommendation:', fallbackTheme);
    } finally {
      setIsLoadingTheme(false);
    }
  };

  // Fallback theme selection based on wizard data
  const getFallbackTheme = () => {
    const websiteType = data.websiteType?.id?.toLowerCase();
    const businessCategory = data.businessCategory?.id?.toLowerCase();

    let themeId = 'ananke'; // default
    let confidence = 60;
    let reasons = ['Default theme selected'];

    // Simple logic for fallback theme selection
    if (businessCategory === 'restaurant' || businessCategory === 'food') {
      themeId = 'restaurant';
      confidence = 80;
      reasons = ['Perfect for restaurant and food businesses'];
    } else if (businessCategory === 'technology' || businessCategory === 'tech') {
      themeId = 'clarity';
      confidence = 85;
      reasons = ['Optimized for technology companies'];
    } else if (websiteType === 'blog') {
      themeId = 'papermod';
      confidence = 90;
      reasons = ['Excellent for blog websites'];
    } else if (websiteType === 'ecommerce') {
      themeId = 'hargo';
      confidence = 85;
      reasons = ['E-commerce ready theme'];
    } else if (websiteType === 'portfolio') {
      themeId = 'terminal';
      confidence = 80;
      reasons = ['Great for portfolios and creative work'];
    } else if (websiteType === 'business') {
      themeId = 'bigspring';
      confidence = 75;
      reasons = ['Professional business theme'];
    }

    return {
      recommendedTheme: themeId,
      confidence,
      reasons,
      explanation: `We've selected ${themeId} as a good match for your ${websiteType || 'website'} with ${confidence}% confidence.`,
      fallback: 'ananke'
    };
  };

  // Generate unique project name to avoid 409 conflicts
  const generateUniqueProjectName = (baseName: string, attempt: number = 0): string => {
    if (attempt === 0) {
      return baseName;
    }
    return `${baseName} (${attempt})`;
  };

  // Create project with conflict handling
  const createProjectWithRetry = async (maxAttempts = 5): Promise<string> => {
    const baseName = data.businessInfo?.name || 'Generated Website';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const projectName = generateUniqueProjectName(baseName, attempt);
        console.log(`🔍 Attempting to create project: "${projectName}" (attempt ${attempt + 1})`);

        const projectResponse = await projectsAPI.create({
          name: projectName,
          description: data.businessInfo?.description || '',
          wizardData: data,
          type: data.websiteType?.category || 'business'
        });

        const projectId = (projectResponse as any).id || (projectResponse as any).data?.id;
        console.log('✅ Project created successfully with ID:', projectId);
        return projectId;

      } catch (createError: any) {
        console.error(`❌ Attempt ${attempt + 1} failed:`, createError.message);

        if (createError?.response?.status === 409) {
          console.log('⚠️ Project name conflict, trying with different name...');
          // Continue to next attempt with modified name
          continue;
        } else {
          // Different error, don't retry
          throw createError;
        }
      }
    }

    throw new Error(`Failed to create project after ${maxAttempts} attempts. Please try with a different name.`);
  };

  // Find existing project by wizard data similarity
  const findExistingProject = async (): Promise<string | null> => {
    try {
      console.log('🔍 Looking for existing projects...');
      const response = await api.get('/projects') as any;

      if (response?.data?.success && response.data.data) {
        const projects = response.data.data;
        const businessName = data.businessInfo?.name?.toLowerCase();
        const websiteType = data.websiteType?.category?.toLowerCase();

        // Look for projects with similar names or website types
        const similarProject = projects.find((project: any) => {
          const projectName = project.name?.toLowerCase();
          const projectType = project.type?.toLowerCase();

          return (businessName && projectName?.includes(businessName)) ||
            (websiteType && projectType === websiteType);
        });

        if (similarProject) {
          console.log('✅ Found existing similar project:', similarProject.id);
          return similarProject.id;
        }
      }

      return null;
    } catch (error: any) {
      console.warn('⚠️ Could not search for existing projects:', error.message);
      return null;
    }
  };

  // Wizard data validation function
  const validateWizardData = (wizardData: any): boolean => {
    const requiredFields = [
      'businessInfo.name',
      'websiteType.category',
      'businessCategory.name'
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
        content: `${data.websiteType.category} - ${data.websiteType.description || 'Professional website'}`
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
    }

    if (data.locationInfo) {
      summary.push({
        title: 'Business Location',
        content: data.locationInfo.type === 'online' ?
          'Online Business' :
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
  };

  // ✅ FIXED: Enhanced polling with better error handling and corrected logic
  const pollGenerationStatus = async (generationId: string) => {
    const maxAttempts = 120; // 10 minutes at 5-second intervals
    let attempts = 0;

    const poll = async () => {
      attempts++;
      console.log(`📊 Polling attempt ${attempts}/${maxAttempts} for generation:`, generationId);

      try {
        const statusResponse = await api.get(`/generations/${generationId}/status`) as any;
        
        // ✅ FIXED: Handle response structure properly
        const statusData = statusResponse?.data?.data || statusResponse?.data;
        
        console.log('📈 Generation status response:', statusResponse);
        console.log('📈 Generation status data:', statusData);

        if (!statusData) {
          throw new Error('Invalid status response structure');
        }

        const status = statusData.status;
        const progressValue = statusData.progress || (progress < 90 ? progress + 5 : progress);
        const stepMessage = statusData.currentStep || 'Processing...';

        // Update UI
        setProgress(progressValue);
        setCurrentStep(stepMessage);

        if (status === 'COMPLETED') {
          console.log('🎉 Generation completed successfully');
          setGenerationResult({
            previewUrl: statusData.previewUrl || statusData.siteUrl,
            downloadUrl: statusData.downloadUrl || statusData.siteUrl,
            content: statusData.content
          });
          setProgress(100);
          setCurrentStep('Website generation completed!');
          setGenerationComplete(true);
          setIsGenerating(false);
          toast.success('Website generated successfully!');
          return;
        }

        if (status === 'FAILED') {
          console.log('❌ Generation failed');
          const errorMessage = statusData.errorLog || statusData.error || 'Website generation failed. Please try again.';
          setError(errorMessage);
          setIsGenerating(false);
          return;
        }

        // ✅ FIXED: Handle all in-progress states
        if (['PENDING', 'INITIALIZING', 'BUILDING_STRUCTURE', 'APPLYING_THEME', 'GENERATING_CONTENT', 'BUILDING_SITE', 'PACKAGING'].includes(status)) {
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setError('Generation is taking longer than expected. Please check back later.');
            setIsGenerating(false);
          }
          return;
        }

        // Unknown status
        console.warn('⚠️ Unknown generation status:', status);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Generation status is unclear. Please refresh the page.');
          setIsGenerating(false);
        }

      } catch (error: any) {
        console.error('❌ Status polling failed:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to get generation status. Please refresh the page.');
          setIsGenerating(false);
        }
      }
    };

    poll();
  };

  // ✅ FIXED: Main generation function with improved error handling
  const handleGenerateWebsite = async () => {
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

      // STEP 2: Try to find existing project first
      console.log('🔍 Checking for existing projects...');
      setCurrentStep('Checking for existing projects...');
      setProgress(5);

      let currentProjectId = projectId;
      let project = null;

      // Try to find existing project first
      if (!currentProjectId) {
        currentProjectId = await findExistingProject();
        if (currentProjectId) {
          setProjectId(currentProjectId);
          console.log('✅ Using existing project:', currentProjectId);
        }
      }

      // STEP 3: Get or create project
      if (currentProjectId) {
        try {
          console.log('🔍 Fetching existing project:', currentProjectId);
          const projectResponse = await api.get(`/projects/${currentProjectId}`) as any;
          project = projectResponse.data?.data || projectResponse.data;
          console.log('✅ Found existing project:', project?.id);
        } catch (projectError: any) {
          console.warn('❌ Could not fetch existing project, will create new one:', projectError.message);
          currentProjectId = null;
        }
      }

      // STEP 4: Create project if needed
      if (!currentProjectId) {
        setCurrentStep('Creating project...');
        setProgress(10);

        try {
          currentProjectId = await createProjectWithRetry();
          setProjectId(currentProjectId);

          // Fetch the created project
          const projectResponse = await api.get(`/projects/${currentProjectId}`) as any;
          project = projectResponse.data?.data || projectResponse.data;
          console.log('✅ Project fetched after creation:', project);

        } catch (createError: any) {
          console.error('❌ Failed to create project:', createError);
          throw new Error(`Failed to create project: ${createError.message}`);
        }
      }

      setProgress(25);
      setCurrentStep('Project ready');

      // STEP 5: Force project completion
      console.log('🔧 Forcing project completion...');
      setCurrentStep('Completing project setup...');
      setProgress(30);

      try {
        console.log('🔧 Calling project completion endpoint...');
        const completeResponse = await api.post(`/projects/${currentProjectId}/complete`);
        console.log('✅ Project completion endpoint called successfully');

        // Re-fetch the project to confirm completion
        console.log('🔍 Re-fetching project to verify completion...');
        const updatedProjectResponse = await api.get(`/projects/${currentProjectId}`) as any;

        // Handle response structure properly
        project = updatedProjectResponse.data?.data || updatedProjectResponse.data || updatedProjectResponse;

        console.log('🔍 Project after completion:', {
          id: project?.id,
          name: project?.name,
          isCompleted: project?.isCompleted,
          businessCategory: project?.wizardData?.businessCategory?.id,
          businessName: project?.wizardData?.businessInfo?.name
        });

        if (project?.isCompleted) {
          console.log('✅ Project is completed, proceeding to generation...');
        } else {
          console.log('⚠️ Project not completed, but proceeding anyway...');
        }

      } catch (completeError: any) {
        console.error('❌ Failed to complete project:', completeError);
        console.error('Error details:', completeError.response?.data);
        console.log('⚠️ Proceeding with generation despite completion error...');
      }

      setProgress(35);
      setCurrentStep('Starting website generation...');

      // STEP 6: Start the generation process
      console.log('🎬 Starting generation for project:', currentProjectId);
      console.log('🎯 Proceeding with generation...');

      try {
        const generatePayload = {
          hugoTheme: themeRecommendation?.recommendedTheme || 'ananke',
          customizations: {
            colors: data.themeConfig?.colorScheme || {
              name: 'Default',
              primary: '#3b82f6',
              secondary: '#1e40af',
              accent: '#60a5fa',
              background: '#ffffff',
              text: '#1f2937'
            },
            fonts: data.themeConfig?.typography || {
              headingFont: 'Inter',
              bodyFont: 'Inter',
              fontSize: 'medium'
            },
            layout: data.themeConfig?.layout || {
              headerStyle: 'standard',
              footerStyle: 'standard',
              sidebarEnabled: false
            }
          },
          contentOptions: {
            generateSampleContent: true,
            contentTone: 'professional',
            includeImages: true,
            seoOptimized: true
          }
        };

        console.log('📤 Generation payload:', generatePayload);

        const generateResponse = await api.post(`/generations/${currentProjectId}/start`, generatePayload) as any;

        console.log('🎯 Generation response:', generateResponse);

        // ✅ FIXED: Check response structure properly
        if (!generateResponse.data?.success && !generateResponse.success) {
          const errorMessage = generateResponse.data?.error?.message || 
                              generateResponse.error?.message || 
                              'Failed to start generation';
          throw new Error(errorMessage);
        }

        // ✅ FIXED: Extract generation ID correctly
        const generationId = generateResponse.data?.data?.generationId || 
                            generateResponse.data?.generationId ||
                            generateResponse.generationId;

        if (!generationId) {
          console.error('❌ No generation ID in response:', generateResponse);
          throw new Error('No generation ID received from server');
        }

        console.log('📝 Generation ID:', generationId);

        setProgress(40);
        setCurrentStep('Generation started, monitoring progress...');

        // STEP 7: Poll for completion
        await pollGenerationStatus(generationId);

      } catch (generationError: any) {
        console.error('❌ Generation start failed:', generationError);
        console.error('❌ Generation error response:', generationError.response?.data);

        // Log the specific error details for debugging
        if (generationError.response?.data?.error) {
          console.error('❌ Error details:', {
            code: generationError.response.data.error.code,
            message: generationError.response.data.error.message,
            details: generationError.response.data.error.details
          });
        }

        throw new Error(
          generationError.response?.data?.error?.message ||
          generationError.message ||
          'Failed to start website generation'
        );
      }

    } catch (error: any) {
      console.error('❌ Generation failed:', error);
      setError(error.message || 'Website generation failed');
      setIsGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    handleGenerateWebsite();
  };

  const handleStartOver = () => {
    clearData();
    setProjectId(null); // Clear cached project ID
    setThemeRecommendation(null); // Clear theme recommendation
  };

  const summary = getWizardSummary();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
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

          {/* Theme Recommendation Preview */}
          {isLoadingTheme ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <h3 className="font-semibold text-gray-700">
                  Analyzing your requirements to recommend the perfect theme...
                </h3>
              </div>
            </div>
          ) : themeRecommendation ? (
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
                  Why this theme?
                </summary>
                <ul className="mt-2 ml-4 space-y-1 text-blue-600">
                  {themeRecommendation.reasons?.map((reason: string, index: number) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
              </details>
            </div>
          ) : null}

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
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
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
      )}

      {/* Generation Complete */}
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

          {/* Download and Preview Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <ArrowDownTrayIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Download Your Website
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Download the complete Hugo website as a ZIP file. Contains all source files, content, and assets.
              </p>
              <button
                onClick={() => generationResult?.downloadUrl && window.open(generationResult.downloadUrl, '_blank')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Download ZIP File
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <EyeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preview Your Website
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                View a live preview of your generated website before downloading or deploying.
              </p>
              <button
                onClick={() => generationResult?.previewUrl && window.open(generationResult.previewUrl, '_blank')}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Preview Site
              </button>
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