-- AlterTable
ALTER TABLE "site_generations" ADD COLUMN     "contentOptions" JSONB,
ADD COLUMN     "currentStep" TEXT DEFAULT 'Initializing...',
ADD COLUMN     "customizations" JSONB,
ADD COLUMN     "progress" INTEGER DEFAULT 0;
