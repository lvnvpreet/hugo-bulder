import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useWizardStore } from '../../store/wizard';
import { useGenerationStore } from '../../store/generation';
import { Check, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface GenerationStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const GenerationStep: React.FC<GenerationStepProps> = ({ 
  onNext, 
  onPrevious 
}) => {
  const { data } = useWizardStore();
  const { 
    isGenerating, 
    progress, 
    currentStep, 
    error, 
    startGeneration 
  } = useGenerationStore();

  const handleStartGeneration = async () => {
    try {
      await startGeneration(data);
      // On successful completion, proceed to next step
      onNext();
    } catch (err) {
      // Error is handled by the store
      console.error('Generation failed:', err);
    }
  };

  const generationSteps = [
    { id: 'analyzing', name: 'Analyzing Requirements', status: 'completed' },
    { id: 'content', name: 'Generating Content', status: currentStep === 'content' ? 'current' : 'pending' },
    { id: 'design', name: 'Creating Design', status: currentStep === 'design' ? 'current' : 'pending' },
    { id: 'structure', name: 'Building Structure', status: currentStep === 'structure' ? 'current' : 'pending' },
    { id: 'optimization', name: 'Optimizing Performance', status: currentStep === 'optimization' ? 'current' : 'pending' },
    { id: 'finalization', name: 'Final Touches', status: currentStep === 'finalization' ? 'current' : 'pending' },
  ];

  const getStepStatus = (stepId: string) => {
    const stepIndex = generationSteps.findIndex(s => s.id === stepId);
    const currentIndex = generationSteps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          {isGenerating ? 'Creating Your Website' : 'Ready to Generate'}
        </CardTitle>
        <p className="text-muted-foreground text-center">
          {isGenerating 
            ? 'Please wait while we build your website with AI' 
            : 'Review your choices and start the generation process'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isGenerating && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Configuration Summary</h3>              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Name:</span>
                  <span className="font-medium">{data.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Website Type:</span>
                  <Badge variant="secondary">{data.websiteType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Design Style:</span>
                  <Badge variant="secondary">{data.designStyle}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color Scheme:</span>
                  <Badge variant="secondary">{data.colorScheme}</Badge>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Features:</span>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {data.selectedFeatures?.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature.replace('-', ' ')}
                      </Badge>
                    ))}
                    {(data.selectedFeatures?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(data.selectedFeatures?.length || 0) - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <h4 className="font-medium">What happens next?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>AI analyzes your requirements</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Content generation with GPT</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Custom design creation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Hugo site generation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Generation Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-3">
              {generationSteps.map((step) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      status === 'completed' 
                        ? 'bg-green-500 text-white' 
                        : status === 'current'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {status === 'completed' ? (
                        <Check className="w-4 h-4" />
                      ) : status === 'current' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`${
                      status === 'completed' 
                        ? 'text-green-600 dark:text-green-400' 
                        : status === 'current'
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Generation Failed</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            disabled={isGenerating}
          >
            Previous
          </Button>
          {!isGenerating && !error && (
            <Button onClick={handleStartGeneration}>
              Start Generation
            </Button>
          )}
          {error && (
            <Button onClick={handleStartGeneration}>
              Retry Generation
            </Button>
          )}
          {isGenerating && (
            <Button disabled>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Generating...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
