import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWizardStore } from '../../store/wizard';
import { featuresSelectionSchema, type FeaturesSelection } from '../../utils/validation';
import { availableFeatures } from '../../types';

interface FeaturesSelectionStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const FeaturesSelectionStep: React.FC<FeaturesSelectionStepProps> = ({ 
  onNext, 
  onPrevious 
}) => {
  const { data, updateData } = useWizardStore();
  
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors }  } = useForm<FeaturesSelection>({
    resolver: zodResolver(featuresSelectionSchema),
    defaultValues: {
      selectedFeatures: data.selectedFeatures || ['responsive-design', 'seo'],
      integrations: data.integrations || []
    }
  });

  const selectedFeatures = watch('selectedFeatures') || [];
  const selectedIntegrations = watch('integrations') || [];

  const toggleFeature = (featureId: string) => {
    const current = selectedFeatures;
    const updated = current.includes(featureId)
      ? current.filter(id => id !== featureId)
      : [...current, featureId];
    setValue('selectedFeatures', updated);
  };

  const toggleIntegration = (integrationId: string) => {
    const current = selectedIntegrations;
    const updated = current.includes(integrationId)
      ? current.filter(id => id !== integrationId)
      : [...current, integrationId];
    setValue('integrations', updated);
  };

  const onSubmit = (formData: FeaturesSelection) => {
    updateData({ featuresSelection: formData } as any);
    onNext();
  };  // Create a flat array of all features for searching
  const allFeatures = [
    ...availableFeatures.core,
    ...availableFeatures.advanced, 
    ...availableFeatures.marketing,
    ...availableFeatures.integrations
  ];

  const coreFeatures = availableFeatures.core;
  const advancedFeatures = availableFeatures.advanced;
  const marketingFeatures = availableFeatures.marketing;
  const integrationFeatures = availableFeatures.integrations;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Choose Your Features
        </CardTitle>
        <p className="text-muted-foreground text-center">
          Select the features and integrations you want for your website
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                Core Features
                <Badge variant="secondary" className="ml-2">Recommended</Badge>
              </h3>              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coreFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md ${
                      selectedFeatures.includes(feature.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedFeatures.includes(feature.id)}
                        onChange={() => toggleFeature(feature.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>            <div>
              <h3 className="text-lg font-semibold mb-4">Advanced Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advancedFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md ${
                      selectedFeatures.includes(feature.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedFeatures.includes(feature.id)}
                        onChange={() => toggleFeature(feature.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>            <div>
              <h3 className="text-lg font-semibold mb-4">Marketing & Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketingFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md ${
                      selectedFeatures.includes(feature.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedFeatures.includes(feature.id)}
                        onChange={() => toggleFeature(feature.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>            <div>
              <h3 className="text-lg font-semibold mb-4">Integrations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md ${
                      selectedIntegrations.includes(feature.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => toggleIntegration(feature.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedIntegrations.includes(feature.id)}
                        onChange={() => toggleIntegration(feature.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {errors.selectedFeatures && (
            <p className="text-sm text-red-500">{errors.selectedFeatures.message}</p>
          )}          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Selected Features Summary</h4>
            <div className="flex flex-wrap gap-2">
              {selectedFeatures.map((featureId) => {
                const feature = allFeatures.find(f => f.id === featureId);
                return feature ? (
                  <Badge key={featureId} variant="secondary">
                    {feature.name}
                  </Badge>
                ) : null;
              })}
              {selectedIntegrations.map((integrationId) => {
                const integration = allFeatures.find(f => f.id === integrationId);
                return integration ? (
                  <Badge key={integrationId} variant="outline">
                    {integration.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>
            <Button type="submit">
              Next
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
