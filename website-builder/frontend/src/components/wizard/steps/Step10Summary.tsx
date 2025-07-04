import { useState, useEffect } from 'react';
import { CheckCircleIcon, PlayIcon, DocumentIcon, EyeIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWizardStore } from '../../../store/wizardStore';
import { toast } from 'sonner';
import { projectsAPI } from '../../../services/api';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useGenerationStore } from '../../../store/generation';

export default function Step10Summary() {
  const { data, setGenerationComplete, clearData, isGenerationComplete } = useWizardStore();
  const { isAuthenticated, loginAsGuest, isLoading: authLoading } = useAuth();
  
  const [themeRecommendation, setThemeRecommendation] = useState<any>(null);
  
  // Use the generation store for tracking progress
  const { 
    isGenerating, 
    progress, 
    currentStep, 
    error,
    result: generationResult,
    startGeneration,
    setError,
    reset: resetGeneration
  } = useGenerationStore();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoadingTheme, setIsLoadingTheme] = useState<boolean>(false);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 Step10Summary state:', {
      isGenerationComplete,
      isGenerating,
      hasGenerationResult: !!generationResult,
      error,
      progress,
      currentStep
    });
  }, [isGenerationComplete, isGenerating, generationResult, error, progress, currentStep]);

  // Ensure user is authenticated (create guest session if needed)
  useEffect(() => {
    const ensureAuthentication = async () => {
      if (!authLoading && !isAuthenticated) {
        try {
          console.log('🔐 Creating guest session for website generation...');
          await loginAsGuest();
          console.log('✅ Guest session created successfully');
        } catch (error) {
          console.error('❌ Failed to create guest session:', error);
          toast.error('Failed to initialize session. Please try again.');
        }
      }
    };

    ensureAuthentication();
  }, [authLoading, isAuthenticated, loginAsGuest]);
  // Load theme recommendation on component mount
  useEffect(() => {
    if (!projectId && !themeRecommendation && isAuthenticated) {
      loadThemeRecommendation();
    }
  }, [isAuthenticated]);
  // Update wizard completion status when generation completes
  useEffect(() => {
    if (!isGenerating && generationResult && !error) {
      setGenerationComplete(true);
      toast.success('Website generated successfully!');
    }
  }, [isGenerating, generationResult, error, setGenerationComplete]);

  // Reset generation completion state if there's no valid generation result
  // This prevents showing the completion page from persisted state without actual generation
  useEffect(() => {
    if (isGenerationComplete && !generationResult && !isGenerating) {
      console.log('🔧 Resetting generation completion state - no valid result found');
      setGenerationComplete(false);
      resetGeneration();
    }
  }, [isGenerationComplete, generationResult, isGenerating, setGenerationComplete, resetGeneration]);

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

    // Healthcare-specific logic
    if (businessCategory === 'healthcare') {
      themeId = 'bigspring';
      confidence = 85;
      reasons = ['Professional and trustworthy design perfect for healthcare practices', 'Clean layout that builds patient confidence', 'Mobile-friendly for patients on the go'];
    }
    // Simple logic for other business categories
    else if (businessCategory === 'restaurant' || businessCategory === 'food') {
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
      explanation: `We've selected ${themeId} as a good match for your ${businessCategory === 'healthcare' ? 'healthcare practice' : (websiteType || 'website')} with ${confidence}% confidence.`,
      fallback: 'ananke'
    };
  };

  // Generate truly unique project name using business name + timestamp
  const generateUniqueProjectName = (baseName: string): string => {
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    
    // Clean the base name (remove special characters, limit length)
    const cleanBaseName = baseName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .trim()
      .substring(0, 40); // Limit length to 40 chars
    
    return `${cleanBaseName}-${dateStr}-${timestamp}`;
  };

  // Simplified create project function (no retry needed!)
  const createProject = async (): Promise<string> => {
    const baseName = data.businessInfo?.name || 'Generated Website';
    const projectName = generateUniqueProjectName(baseName);
    
    console.log(`🏗️ Creating project: "${projectName}"`);

    try {
      const projectResponse = await projectsAPI.create({
        name: projectName,
        description: data.businessInfo?.description || '',
        wizardData: data,
        type: data.websiteType?.category || 'business'
      });

      const projectId = (projectResponse as any).id || (projectResponse as any).data?.id;
      console.log('✅ Project created successfully with ID:', projectId, 'Name:', projectName);
      return projectId;

    } catch (createError: any) {
      console.error('❌ Failed to create project:', createError);
      throw new Error(`Failed to create project: ${createError.message}`);
    }
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

  // Helper function to format address object into readable string
  const formatAddress = (address: any) => {
    if (!address) return 'Physical Location';
    
    const parts = [];
    
    // Add street if available
    if (address.street && address.street.trim()) {
      parts.push(address.street.trim());
    }
    
    // Add city if available
    if (address.city && address.city.trim()) {
      parts.push(address.city.trim());
    }
    
    // Add state if available
    if (address.state && address.state.trim()) {
      parts.push(address.state.trim());
    }
    
    // Add zipCode if available
    if (address.zipCode && address.zipCode.trim()) {
      parts.push(address.zipCode.trim());
    }
    
    // Add country if available and different from default
    if (address.country && address.country.trim() && address.country.trim() !== 'India') {
      parts.push(address.country.trim());
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Physical Location';
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
        content: data.locationInfo.isOnlineOnly === true ?
          'Online Business' :
          formatAddress(data.locationInfo.address) // ✅ Fixed: Use helper function instead of raw object
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
  // ✅ Main generation function with improved error handling
  const handleGenerateWebsite = async () => {
    console.log('🎯 [DEBUG] handleGenerateWebsite called');
    console.log('🎯 [DEBUG] Current data state:', JSON.stringify(data, null, 2));
    console.log('🎯 [DEBUG] Current projectId:', projectId);
    console.log('🎯 [DEBUG] Theme recommendation:', themeRecommendation);
    
    // Check authentication first
    if (!isAuthenticated) {
      toast.error('Please wait for authentication to complete');
      return;
    }
    
    try {
      // Reset the generation store
      resetGeneration();
      console.log('🚀 Starting generation process...');
      
      // STEP 1: Validate wizard data before proceeding
      console.log('🔍 [DEBUG] Starting data validation...');
      
      if (!validateWizardData(data)) {
        console.error('❌ [DEBUG] Data validation failed');
        console.log('🔍 [DEBUG] Current data for validation:', JSON.stringify(data, null, 2));
        throw new Error('Please complete all wizard steps before proceeding');
      }
      
      console.log('✅ [DEBUG] Data validation passed');

      // STEP 2: Try to find existing project first
      console.log('🔍 Checking for existing projects...');

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
      console.log('🏢 [DEBUG] Starting project resolution...');
      console.log('🏢 [DEBUG] Current projectId:', currentProjectId);
      
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

      // STEP 4: Create project if needed (SIMPLIFIED - No retry logic!)
      if (!currentProjectId) {
        try {
          console.log('🏗️ No existing project found, creating new project...');
          currentProjectId = await createProject(); // ✅ Much simpler!
          setProjectId(currentProjectId);

          // Fetch the created project
          const projectResponse = await api.get(`/projects/${currentProjectId}`) as any;
          project = projectResponse.data?.data || projectResponse.data;
          console.log('✅ Project fetched after creation:', {
            id: project?.id,
            name: project?.name,
            type: project?.type
          });

        } catch (createError: any) {
          console.error('❌ Failed to create project:', createError);
          throw new Error(`Failed to create project: ${createError.message}`);
        }
      }

      // STEP 5: Force project completion
      console.log('🔧 Forcing project completion...');

      try {
        console.log('🔧 Calling project completion endpoint...');
        const completeResponse = await api.post(`/projects/${currentProjectId}/complete`) as any;
        console.log('✅ Project marked as complete:', completeResponse.data);

        // Re-fetch the project to confirm completion
        console.log('🔍 Re-fetching project to verify completion...');
        const updatedProjectResponse = await api.get(`/projects/${currentProjectId}`) as any;
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

      // STEP 6: Start the generation process
      console.log('🎬 Starting generation for project:', currentProjectId);
      console.log('🎯 Proceeding with generation...');

      // Final validation - ensure we have a valid project ID
      if (!currentProjectId) {
        throw new Error('Unable to obtain valid project ID for generation');
      }

      // Use the Generation store to start and monitor the generation
      try {        // Start generation with the GenerationStore
        await startGeneration(currentProjectId, data);
        
        // The status will be automatically tracked by the store
        // and updates will be reflected in the UI through the
        // store's progress and currentStep values
        
        console.log('📝 Generation started successfully');
        
        // Generation is now running and status is tracked by the store
        // The UI should automatically update as progress is made
        // Wizard completion will be handled by the useEffect when generation finishes
      } catch (generationError: any) {
        console.log('🚨 [DEBUG] ===== GENERATION ERROR CAUGHT =====');
        console.error('❌ Generation start failed:', generationError);
        console.log('🚨 [DEBUG] Error type:', typeof generationError);
        console.log('🚨 [DEBUG] Error constructor:', generationError.constructor?.name);
        console.log('🚨 [DEBUG] Error message:', generationError.message);
        console.log('🚨 [DEBUG] Error stack:', generationError.stack);
        
        // Deep dive into response error
        if (generationError.response) {
          console.log('🚨 [DEBUG] Response exists');
          console.log('🚨 [DEBUG] Response status:', generationError.response.status);
          console.log('🚨 [DEBUG] Response statusText:', generationError.response.statusText);
          console.log('🚨 [DEBUG] Response headers:', generationError.response.headers);
          console.log('🚨 [DEBUG] Response data:', generationError.response.data);
          console.log('🚨 [DEBUG] Response data type:', typeof generationError.response.data);
          
          if (generationError.response.data) {
            console.log('🚨 [DEBUG] Response data keys:', Object.keys(generationError.response.data));
          }
        } else {
          console.log('🚨 [DEBUG] No response object in error');
        }
        
        // Check for network/connection errors
        if (generationError.code) {
          console.log('🚨 [DEBUG] Error code:', generationError.code);
        }
        
        if (generationError.config) {
          console.log('🚨 [DEBUG] Request config URL:', generationError.config.url);
          console.log('🚨 [DEBUG] Request config method:', generationError.config.method);
          console.log('🚨 [DEBUG] Request config baseURL:', generationError.config.baseURL);
          console.log('🚨 [DEBUG] Request config timeout:', generationError.config.timeout);
        }

        console.error('❌ Generation error response:', generationError.response?.data);

        // Log the specific error details for debugging
        if (generationError.response?.data?.error) {
          console.error('❌ Error details:', {
            code: generationError.response.data.error.code,
            message: generationError.response.data.error.message,
            details: generationError.response.data.error.details
          });
        }

        const errorMessage = generationError.response?.data?.error?.message ||
          generationError.message ||
          'Failed to start website generation';
          
        console.log('🚨 [DEBUG] Final error message to throw:', errorMessage);

        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.log('🚨 [DEBUG] ===== OUTER CATCH BLOCK =====');
      console.error('❌ Generation failed:', error);
      
      const finalErrorMessage = error.message || 'Website generation failed';
      console.log('🚨 [DEBUG] Final error message for UI:', finalErrorMessage);
      
      // Set error in generation store
      setError(finalErrorMessage);
      
      // Also show toast for immediate user feedback
      toast.error(`Generation failed: ${finalErrorMessage}`);
    }
  };

  const handleGenerateClick = () => {
    handleGenerateWebsite();
  };
  const handleStartOver = () => {
    console.log('🔄 Starting over - resetting all state');
    clearData();
    resetGeneration();
    setProjectId(null); // Clear cached project ID
    setThemeRecommendation(null); // Clear theme recommendation
  };

  const summary = getWizardSummary();
  return (
    <div className="space-y-8">
      {/* Debug Panel - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <details className="cursor-pointer">
            <summary className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🐛 Debug Info (Development Only)
            </summary>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <p><strong>Wizard Complete:</strong> {isGenerationComplete ? '✅' : '❌'}</p>
              <p><strong>Is Generating:</strong> {isGenerating ? '🔄' : '❌'}</p>
              <p><strong>Has Result:</strong> {generationResult ? '✅' : '❌'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
              <p><strong>Progress:</strong> {progress}%</p>
              <p><strong>Current Step:</strong> {currentStep || 'None'}</p>
              <button
                onClick={() => {
                  console.log('🔧 Manual reset triggered');
                  setGenerationComplete(false);
                  resetGeneration();
                }}
                className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
              >
                Reset State
              </button>
            </div>
          </details>
        </div>
      )}

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

      {/* Show generation form if not completed or no valid result */}
      {(!isGenerationComplete || !generationResult) && (
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
      )}      {/* Generation Complete - Only show if we have actual generation results */}
      {isGenerationComplete && generationResult && (
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
          </div>          {/* Download and Preview Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <ArrowDownTrayIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Built Website
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Download the built website ready for deployment. Contains optimized HTML, CSS, and assets.
              </p>
              <button
                onClick={() => generationResult?.siteUrl && window.open(generationResult.siteUrl, '_blank')}
                disabled={!generationResult?.siteUrl}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                Download Built Site
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <DocumentIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Source Code
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Download the complete Hugo source code. Includes themes, content files, and configuration.
              </p>
              <button
                onClick={() => generationResult?.sourceUrl && window.open(generationResult.sourceUrl, '_blank')}
                disabled={!generationResult?.sourceUrl}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
              >
                Download Source
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
              </p>              <button
                onClick={() => generationResult?.previewUrl && window.open(generationResult.previewUrl, '_blank')}
                disabled={!generationResult?.previewUrl}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors"
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