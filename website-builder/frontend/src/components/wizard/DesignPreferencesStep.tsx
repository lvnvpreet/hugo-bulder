import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizardStore } from '../../store/wizard';
import { designPreferencesSchema, type DesignPreferences } from '../../utils/validation';
import { colorSchemes, designStyles } from '../../types';

interface DesignPreferencesStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

export const DesignPreferencesStep: React.FC<DesignPreferencesStepProps> = ({ 
  onNext, 
  onPrevious 
}) => {
  const { data, updateData } = useWizardStore();
    const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<DesignPreferences>({
    resolver: zodResolver(designPreferencesSchema),    defaultValues: {
      colorScheme: (data.colorScheme || 'blue') as any,
      designStyle: (data.designStyle || 'modern') as any,
      customColors: data.customColors || {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#06b6d4'
      }
    }
  });

  const colorScheme = watch('colorScheme');
  const designStyle = watch('designStyle');
  const onSubmit = (formData: DesignPreferences) => {
    updateData(formData as any);
    onNext();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Choose Your Design Style
        </CardTitle>
        <p className="text-muted-foreground text-center">
          Select colors and design elements that match your vision
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Color Scheme</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colorSchemes.map((scheme) => (
                <div
                  key={scheme.name}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                    colorScheme === scheme.name ? 'border-primary' : 'border-border'
                  }`}
                  onClick={() => setValue('colorScheme', scheme.name)}
                >
                  <div className="flex space-x-1 mb-2">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: scheme.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: scheme.secondary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: scheme.accent }}
                    />
                  </div>
                  <p className="text-sm font-medium capitalize">{scheme.name}</p>
                </div>
              ))}
            </div>
            {errors.colorScheme && (
              <p className="text-sm text-red-500">{errors.colorScheme.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Design Style</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {designStyles.map((style) => (
                <div
                  key={style.id}
                  className={`cursor-pointer rounded-lg border-2 p-6 transition-all hover:shadow-md ${
                    designStyle === style.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setValue('designStyle', style.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold">{style.name}</h4>
                    {designStyle === style.id && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {style.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {style.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.designStyle && (
              <p className="text-sm text-red-500">{errors.designStyle.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preview</h3>
            <div className="rounded-lg border p-6 bg-gradient-to-br from-background to-muted">
              <div className="space-y-4">
                <div className="h-4 bg-primary rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted-foreground/20 rounded w-full"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-5/6"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-primary rounded px-4 flex items-center">
                    <div className="h-2 bg-primary-foreground rounded w-12"></div>
                  </div>
                  <div className="h-8 bg-secondary rounded px-4 flex items-center">
                    <div className="h-2 bg-secondary-foreground rounded w-12"></div>
                  </div>
                </div>
              </div>
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
