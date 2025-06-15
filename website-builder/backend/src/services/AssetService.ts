import { PrismaClient, AssetType } from '@prisma/client';
import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { AppError } from '../middleware/errorHandler';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export interface ProcessedImage {
  originalPath: string;
  thumbnailPath?: string;
  webpPath?: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
  variants: ImageVariant[];
}

export interface ImageVariant {
  name: string;
  path: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
}

export interface AssetUploadOptions {
  userId: string;
  projectId?: string;
  usage?: string;
  generateThumbnail?: boolean;
  generateWebP?: boolean;
  resizeOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
}

export interface AssetData {
  id: string;
  userId: string;
  projectId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  assetType: AssetType;
  usage?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  alt?: string;
  caption?: string;
  isProcessed: boolean;
  isActive: boolean;
  uploadedAt: Date;
}

export class AssetService {
  private prisma: PrismaClient;
  private uploadDir: string;
  private maxFileSize: number;
  private allowedMimeTypes: Set<string>;
  private imageFormats: Set<string>;

  constructor() {
    this.prisma = new PrismaClient();
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
    
    this.allowedMimeTypes = new Set([
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      
      // Documents
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      
      // Videos (for future use)
      'video/mp4',
      'video/webm',
      'video/ogg',
      
      // Audio (for future use)
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
    ]);

    this.imageFormats = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
    ]);

    this.ensureUploadDirectories();
  }

  /**
   * Ensure upload directories exist
   */
  private async ensureUploadDirectories(): Promise<void> {
    const directories = [
      this.uploadDir,
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'thumbnails'),
      path.join(this.uploadDir, 'webp'),
      path.join(this.uploadDir, 'documents'),
      path.join(this.uploadDir, 'videos'),
      path.join(this.uploadDir, 'audio'),
      path.join(this.uploadDir, 'temp'),
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
    }
  }

  /**
   * Upload and process a single file
   */
  async uploadFile(file: UploadedFile, options: AssetUploadOptions): Promise<AssetData> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;

      // Determine asset type and storage path
      const assetType = this.determineAssetType(file.mimetype);
      const storageDir = this.getStorageDirectory(assetType);
      const filePath = path.join(storageDir, uniqueFilename);

      // Move file to final destination
      await fs.move(file.path, filePath);

      // Process file based on type
      let processedData: any = {};
      if (this.isImageFile(file.mimetype)) {
        processedData = await this.processImage(filePath, options);
      }

      // Save to database
      const assetData = await this.prisma.assetUpload.create({
        data: {
          userId: options.userId,
          projectId: options.projectId,
          filename: uniqueFilename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: path.relative(this.uploadDir, filePath),
          assetType,
          usage: options.usage,
          dimensions: processedData.dimensions,
          isProcessed: true,
          isActive: true,
        },
      });

      return this.formatAssetData(assetData);
    } catch (error) {
      // Clean up uploaded file on error
      if (fs.existsSync(file.path)) {
        await fs.remove(file.path);
      }
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: UploadedFile[], options: AssetUploadOptions): Promise<AssetData[]> {
    const results: AssetData[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error: any) {
        errors.push(`${file.originalname}: ${error.message}`);
      }
    }    if (errors.length > 0 && results.length === 0) {
      throw new AppError(`All uploads failed: ${errors.join(', ')}`, 400, 'FILE_UPLOAD_FAILED');
    }

    return results;
  }

  /**
   * Process image file
   */
  private async processImage(filePath: string, options: AssetUploadOptions): Promise<ProcessedImage> {
    const variants: ImageVariant[] = [];
    
    try {
      // Get image metadata
      const metadata = await sharp(filePath).metadata();
      const { width = 0, height = 0 } = metadata;

      let processedPath = filePath;

      // Resize if needed
      if (options.resizeOptions) {
        const { maxWidth, maxHeight, quality = 85 } = options.resizeOptions;
        
        if ((maxWidth && width > maxWidth) || (maxHeight && height > maxHeight)) {
          const resizedFilename = `resized_${path.basename(filePath)}`;
          const resizedPath = path.join(path.dirname(filePath), resizedFilename);
          
          await sharp(filePath)
            .resize(maxWidth, maxHeight, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality })
            .toFile(resizedPath);

          // Replace original with resized
          await fs.move(resizedPath, filePath);
          processedPath = filePath;
        }
      }

      // Generate thumbnail
      let thumbnailPath: string | undefined;
      if (options.generateThumbnail !== false) {
        const thumbnailFilename = `thumb_${path.basename(filePath, path.extname(filePath))}.jpg`;
        thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);
        
        const thumbnailBuffer = await sharp(processedPath)
          .resize(300, 300, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        await fs.writeFile(thumbnailPath, thumbnailBuffer);
        
        variants.push({
          name: 'thumbnail',
          path: path.relative(this.uploadDir, thumbnailPath),
          width: 300,
          height: 300,
          fileSize: thumbnailBuffer.length,
          format: 'jpeg',
        });
      }

      // Generate WebP version
      let webpPath: string | undefined;
      if (options.generateWebP !== false && metadata.format !== 'webp') {
        const webpFilename = `${path.basename(filePath, path.extname(filePath))}.webp`;
        webpPath = path.join(this.uploadDir, 'webp', webpFilename);
        
        const webpBuffer = await sharp(processedPath)
          .webp({ quality: 85 })
          .toBuffer();

        await fs.writeFile(webpPath, webpBuffer);
        
        variants.push({
          name: 'webp',
          path: path.relative(this.uploadDir, webpPath),
          width,
          height,
          fileSize: webpBuffer.length,
          format: 'webp',
        });
      }

      const finalStats = await fs.stat(processedPath);

      return {
        originalPath: path.relative(this.uploadDir, processedPath),
        thumbnailPath: thumbnailPath ? path.relative(this.uploadDir, thumbnailPath) : undefined,
        webpPath: webpPath ? path.relative(this.uploadDir, webpPath) : undefined,
        dimensions: { width, height },
        fileSize: finalStats.size,
        variants,
      };    } catch (error) {
      throw new AppError(`Failed to process image: ${error}`, 500, 'IMAGE_PROCESSING_FAILED');
    }
  }

  /**
   * Get user's assets
   */
  async getUserAssets(
    userId: string,
    options: {
      projectId?: string;
      assetType?: AssetType;
      page?: number;
      pageSize?: number;
      search?: string;
    } = {}
  ): Promise<{
    assets: AssetData[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { projectId, assetType, page = 1, pageSize = 20, search } = options;

    const where: any = {
      userId,
      isActive: true,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (assetType) {
      where.assetType = assetType;
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
        { usage: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      this.prisma.assetUpload.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.assetUpload.count({ where }),
    ]);

    return {
      assets: assets.map(this.formatAssetData),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get single asset
   */
  async getAsset(assetId: string, userId: string): Promise<AssetData | null> {
    const asset = await this.prisma.assetUpload.findFirst({
      where: {
        id: assetId,
        userId,
        isActive: true,
      },
    });

    return asset ? this.formatAssetData(asset) : null;
  }

  /**
   * Update asset metadata
   */
  async updateAsset(
    assetId: string,
    userId: string,
    updates: {
      alt?: string;
      caption?: string;
      usage?: string;
    }
  ): Promise<AssetData> {    const asset = await this.prisma.assetUpload.findFirst({
      where: {
        id: assetId,
        userId,
        isActive: true,
      },
    });

    if (!asset) {
      throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');
    }

    const updatedAsset = await this.prisma.assetUpload.update({
      where: { id: assetId },
      data: updates,
    });

    return this.formatAssetData(updatedAsset);
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string, userId: string): Promise<boolean> {    const asset = await this.prisma.assetUpload.findFirst({
      where: {
        id: assetId,
        userId,
        isActive: true,
      },
    });

    if (!asset) {
      throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');
    }

    // Mark as inactive instead of hard delete
    await this.prisma.assetUpload.update({
      where: { id: assetId },
      data: { isActive: false },
    });

    // Clean up physical files (optional - could be done by background job)
    try {
      const fullPath = path.join(this.uploadDir, asset.filePath);
      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
      }

      // Clean up associated files (thumbnails, webp versions)
      const baseName = path.basename(asset.filename, path.extname(asset.filename));
      const thumbnailPath = path.join(this.uploadDir, 'thumbnails', `thumb_${baseName}.jpg`);
      const webpPath = path.join(this.uploadDir, 'webp', `${baseName}.webp`);

      if (await fs.pathExists(thumbnailPath)) {
        await fs.remove(thumbnailPath);
      }

      if (await fs.pathExists(webpPath)) {
        await fs.remove(webpPath);
      }
    } catch (error) {
      console.error('Error cleaning up asset files:', error);
      // Don't throw error here as the database record is already marked inactive
    }

    return true;
  }

  /**
   * Get asset usage statistics
   */
  async getAssetStats(userId: string, projectId?: string): Promise<{
    totalAssets: number;
    totalSize: number;
    assetsByType: Record<AssetType, number>;
    recentUploads: number;
  }> {
    const where: any = {
      userId,
      isActive: true,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const [totalAssets, assets, recentUploads] = await Promise.all([
      this.prisma.assetUpload.count({ where }),
      this.prisma.assetUpload.findMany({
        where,
        select: {
          assetType: true,
          fileSize: true,
        },
      }),
      this.prisma.assetUpload.count({
        where: {
          ...where,
          uploadedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);
    const assetsByType = assets.reduce((acc, asset) => {
      acc[asset.assetType] = (acc[asset.assetType] || 0) + 1;
      return acc;
    }, {} as Record<AssetType, number>);

    return {
      totalAssets,
      totalSize,
      assetsByType,
      recentUploads,
    };
  }

  /**
   * Clean up expired temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    const tempDir = path.join(this.uploadDir, 'temp');
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  /**
   * Validate uploaded file
   */  private validateFile(file: UploadedFile): void {
    if (!file) {
      throw new AppError('No file provided', 400, 'INVALID_FILE');
    }

    if (file.size > this.maxFileSize) {
      throw new AppError(`File size exceeds ${this.maxFileSize} bytes`, 413, 'FILE_TOO_LARGE');
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new AppError(`File type ${file.mimetype} not allowed`, 400, 'INVALID_FILE_TYPE');
    }

    if (!file.originalname || file.originalname.trim() === '') {
      throw new AppError('Invalid filename', 400, 'INVALID_FILENAME');
    }
  }

  /**
   * Determine asset type from MIME type
   */
  private determineAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) {
      return AssetType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return AssetType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return AssetType.AUDIO;
    } else if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) {
      return AssetType.DOCUMENT;
    } else {
      return AssetType.OTHER;
    }
  }

  /**
   * Get storage directory for asset type
   */
  private getStorageDirectory(assetType: AssetType): string {
    switch (assetType) {
      case AssetType.IMAGE:
        return path.join(this.uploadDir, 'images');
      case AssetType.VIDEO:
        return path.join(this.uploadDir, 'videos');
      case AssetType.AUDIO:
        return path.join(this.uploadDir, 'audio');
      case AssetType.DOCUMENT:
        return path.join(this.uploadDir, 'documents');
      default:
        return this.uploadDir;
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    return this.imageFormats.has(mimeType);
  }

  /**
   * Format asset data for API response
   */
  private formatAssetData(asset: any): AssetData {
    return {
      id: asset.id,
      userId: asset.userId,
      projectId: asset.projectId,
      filename: asset.filename,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      filePath: asset.filePath,
      assetType: asset.assetType,
      usage: asset.usage,
      dimensions: asset.dimensions,
      alt: asset.alt,
      caption: asset.caption,
      isProcessed: asset.isProcessed,
      isActive: asset.isActive,
      uploadedAt: asset.uploadedAt,
    };
  }
}

// Singleton instance
export const assetService = new AssetService();
