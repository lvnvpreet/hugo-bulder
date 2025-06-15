import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useWizardStore } from '../../store/wizard';
import { useGenerationStore } from '../../store/generation';
import { CheckCircle, Globe, Download, Settings, Eye } from 'lucide-react';

interface CompletionStepProps {
  onNext?: () => void;
  onPrevious: () => void;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({ 
  onPrevious 
}) => {
  const { data, resetWizard } = useWizardStore();
  const { result } = useGenerationStore();
  const handleCreateNew = () => {
    resetWizard();
    window.location.href = '/wizard';
  };

  const handleGoToProjects = () => {
    window.location.href = '/projects';
  };

  const handlePreview = () => {
    if (result?.previewUrl) {
      window.open(result.previewUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
          Congratulations!
        </CardTitle>        <p className="text-muted-foreground">
          Your website "{data.name}" has been successfully created
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Website Summary</h3>
          <div className="space-y-3">            <div className="flex justify-between">
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
              <span className="text-muted-foreground">Domain:</span>
              <span className="font-medium">
                {data.domain || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Features:</span>
              <div className="flex flex-wrap gap-1 max-w-xs">
                {data.selectedFeatures?.slice(0, 2).map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature.replace('-', ' ')}
                  </Badge>
                ))}
                {(data.selectedFeatures?.length || 0) > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{(data.selectedFeatures?.length || 0) - 2} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold">Your Website is Ready!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handlePreview}
                className="flex items-center gap-2"
                disabled={!result.previewUrl}
              >
                <Eye className="w-4 h-4" />
                Preview Website
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex items-center gap-2"
                disabled={!result.downloadUrl}
              >
                <Download className="w-4 h-4" />
                Download Files
              </Button>
            </div>
            
            {result.deploymentUrl && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">Live Website URL</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                  Your website is now live and accessible at:
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-sm">
                    {result.deploymentUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(result.deploymentUrl, '_blank')}
                  >
                    Visit
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-semibold">What's Next?</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Customize Further</p>
                <p className="text-muted-foreground">Fine-tune your website in the project dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Connect Domain</p>
                <p className="text-muted-foreground">Set up your custom domain for the website</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Launch & Share</p>
                <p className="text-muted-foreground">Your website is ready to share with the world</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleCreateNew}
            >
              Create New Website
            </Button>
            <Button onClick={handleGoToProjects}>
              Go to Projects
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
