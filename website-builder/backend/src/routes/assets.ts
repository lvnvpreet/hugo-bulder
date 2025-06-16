import { Router, Response, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { assetService, UploadedFile } from '../services/AssetService';
import { authMiddleware } from '../middleware/auth';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import { assetSchemas } from '../validation/assetSchemas';
import { asyncHandler } from '../middleware/errorHandler';
import rateLimit from 'express-rate-limit';

// Define AuthenticatedRequest interface
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
    plan: string;
    emailVerified: boolean;
  };
}

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'temp');

// Ensure upload directory exists
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10,
    fields: 20,
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Rate limiting for upload endpoints
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /assets - Get user's assets with pagination and filtering
/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: Get user's assets with pagination and filtering
 *     description: Retrieve a paginated list of assets belonging to the authenticated user with optional filtering by project, type, and search
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter assets by project ID
 *       - in: query
 *         name: assetType
 *         schema:
 *           type: string
 *           enum: [IMAGE, VIDEO, AUDIO, DOCUMENT, OTHER]
 *         description: Filter assets by type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of assets per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search assets by filename or tags
 *     responses:
 *       200:
 *         description: Assets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AssetUpload'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  validateQuery(assetSchemas.query),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await assetService.getUserAssets(req.user.id, {
      projectId: req.query.projectId as string,
      assetType: req.query.assetType as any,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      search: req.query.search as string,
    });

    res.json({
      success: true,
      data: result.assets,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /assets/upload - Upload single file
/**
 * @swagger
 * /api/assets/upload:
 *   post:
 *     summary: Upload a single file
 *     description: Upload a single file to the user's asset library with optional project association and processing options
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 10MB)
 *               projectId:
 *                 type: string
 *                 description: Optional project ID to associate the asset with
 *               usage:
 *                 type: string
 *                 enum: [LOGO, HERO_IMAGE, GALLERY, ICON, DOCUMENT, OTHER]
 *                 description: Intended usage of the asset
 *               generateThumbnail:
 *                 type: boolean
 *                 default: true
 *                 description: Generate thumbnail for images
 *               generateWebP:
 *                 type: boolean
 *                 default: false
 *                 description: Generate WebP version for images
 *               resizeOptions:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: integer
 *                     minimum: 1
 *                   height:
 *                     type: integer
 *                     minimum: 1
 *                   quality:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                 description: Image resize options
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetUpload'
 *       400:
 *         description: Bad request - no file provided or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: NO_FILE_PROVIDED
 *                     message:
 *                       type: string
 *                       example: No file provided
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: File too large
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/upload',
  uploadRateLimit,
  upload.single('file'),
  validate(assetSchemas.upload),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'No file provided',
        },
      });
      return;
    }

    const uploadOptions = {
      userId: req.user.id,
      projectId: req.body.projectId,
      usage: req.body.usage,
      generateThumbnail: req.body.generateThumbnail,
      generateWebP: req.body.generateWebP,
      resizeOptions: req.body.resizeOptions,
    };

    const asset = await assetService.uploadFile(req.file as UploadedFile, uploadOptions);

    res.status(201).json({
      success: true,
      data: asset,
      message: 'File uploaded successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /assets/upload/bulk - Upload multiple files
/**
 * @swagger
 * /api/assets/upload/bulk:
 *   post:
 *     summary: Upload multiple files
 *     description: Upload multiple files at once to the user's asset library with shared processing options
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Files to upload (max 10 files, 10MB each)
 *               projectId:
 *                 type: string
 *                 description: Optional project ID to associate all assets with
 *               usage:
 *                 type: string
 *                 enum: [LOGO, HERO_IMAGE, GALLERY, ICON, DOCUMENT, OTHER]
 *                 description: Intended usage for all assets
 *               generateThumbnail:
 *                 type: boolean
 *                 default: true
 *                 description: Generate thumbnails for images
 *               generateWebP:
 *                 type: boolean
 *                 default: false
 *                 description: Generate WebP versions for images
 *               resizeOptions:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: integer
 *                     minimum: 1
 *                   height:
 *                     type: integer
 *                     minimum: 1
 *                   quality:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                 description: Image resize options applied to all files
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AssetUpload'
 *       400:
 *         description: Bad request - no files provided
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: Files too large or too many files
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/upload/bulk',
  uploadRateLimit,
  upload.array('files', 10),
  validate(assetSchemas.bulkUpload),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES_PROVIDED',
          message: 'No files provided',
        },
      });
      return;
    }

    const uploadOptions = {
      userId: req.user.id,
      projectId: req.body.projectId,
      usage: req.body.usage,
      generateThumbnail: req.body.generateThumbnail,
      generateWebP: req.body.generateWebP,
      resizeOptions: req.body.resizeOptions,
    };

    const assets = await assetService.uploadFiles(files as UploadedFile[], uploadOptions);

    res.status(201).json({
      success: true,
      data: assets,
      message: `${assets.length} file(s) uploaded successfully`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        totalFiles: files.length,
        successfulUploads: assets.length,
      },
    });  })
);

// GET /assets/stats - Get asset usage statistics (must be before :id routes)
/**
 * @swagger
 * /api/assets/stats:
 *   get:
 *     summary: Get asset usage statistics
 *     description: Retrieve statistics about the user's asset usage including storage used, file counts by type, etc.
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Get stats for a specific project only
 *     responses:
 *       200:
 *         description: Asset statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalAssets:
 *                           type: integer
 *                           description: Total number of assets
 *                         totalSize:
 *                           type: integer
 *                           description: Total storage used in bytes
 *                         byType:
 *                           type: object
 *                           properties:
 *                             IMAGE:
 *                               type: integer
 *                             VIDEO:
 *                               type: integer
 *                             AUDIO:
 *                               type: integer
 *                             DOCUMENT:
 *                               type: integer
 *                             OTHER:
 *                               type: integer
 *                         storageLimit:
 *                           type: integer
 *                           description: Storage limit in bytes based on user plan
 *                         usagePercentage:
 *                           type: number
 *                           description: Percentage of storage limit used
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.query.projectId as string | undefined;
    const stats = await assetService.getAssetStats(req.user.id, projectId);

    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// GET /assets/:id - Get single asset
/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Get single asset details
 *     description: Retrieve detailed information about a specific asset by ID
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetUpload'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: ASSET_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: Asset not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(  '/:id',
  validateParams(assetSchemas.assetId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = req.params.id;
    if (!assetId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Asset ID is required',
        },
      });
      return;
    }

    const asset = await assetService.getAsset(assetId, req.user.id);

    if (!asset) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: asset,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// PUT /assets/:id - Update asset metadata
/**
 * @swagger
 * /api/assets/{id}:
 *   put:
 *     summary: Update asset metadata
 *     description: Update metadata for an existing asset (filename, alt text, caption, etc.)
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: New filename for the asset
 *               alt:
 *                 type: string
 *                 description: Alt text for images
 *               caption:
 *                 type: string
 *                 description: Caption text
 *               usage:
 *                 type: string
 *                 enum: [LOGO, HERO_IMAGE, GALLERY, ICON, DOCUMENT, OTHER]
 *                 description: Asset usage category
 *               projectId:
 *                 type: string
 *                 description: Associate asset with a different project
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssetUpload'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Asset not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put(
  '/:id',
  validateParams(assetSchemas.assetId),
  validate(assetSchemas.update),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = req.params.id;
    if (!assetId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Asset ID is required',
        },
      });
      return;
    }

    const asset = await assetService.updateAsset(assetId, req.user.id, req.body);

    res.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// DELETE /assets/:id - Delete asset
/**
 * @swagger
 * /api/assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     description: Permanently delete an asset and its associated files from storage
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Asset deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Asset not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id',
  validateParams(assetSchemas.assetId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = req.params.id;
    if (!assetId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Asset ID is required',
        },
      });
      return;
    }

    const success = await assetService.deleteAsset(assetId, req.user.id);

    res.json({
      success,
      message: 'Asset deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });  })
);

/*
 * @swagger
 * /api/assets/{id}/download:
 *   get:
 *     summary: Download asset file
 *     description: Download the actual file content of an asset with proper headers for download
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: File download initiated
 *         headers:
 *           Content-Type:
 *             description: MIME type of the file
 *             schema:
 *               type: string
 *           Content-Disposition:
 *             description: Filename for download
 *             schema:
 *               type: string
 *           Content-Length:
 *             description: File size in bytes
 *             schema:
 *               type: integer
 *         content:
 *           
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Asset or file not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id/download',
  validateParams(assetSchemas.assetId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = req.params.id;
    if (!assetId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Asset ID is required',
        },
      });
      return;
    }

    const asset = await assetService.getAsset(assetId, req.user.id);

    if (!asset) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, asset.filePath);

    if (!await fs.pathExists(filePath)) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found on disk',
        },
      });
      return;
    }

    // Set appropriate headers
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${asset.originalName}"`);
    res.setHeader('Content-Length', asset.fileSize);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  })
);

// GET /assets/:id/serve - Serve asset file (for direct viewing)
/*
 * @swagger
 * /api/assets/{id}/serve:
 *   get:
 *     summary: Serve asset file for direct viewing
 *     description: Serve the asset file with appropriate headers for direct viewing in browser (not download)
 *     tags: [Assets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: File served successfully
 *         headers:
 *           Content-Type:
 *             description: MIME type of the file
 *             schema:
 *               type: string
 *           Content-Length:
 *             description: File size in bytes
 *             schema:
 *               type: integer
 *           Cache-Control:
 *             description: Cache control header
 *             schema:
 *               type: string
 *               example: 'public, max-age=31536000' *           X-Alt-Text:
 *             description: Alt text for images (if available)
 *             schema:
 *               type: string
 *         content:
 *         
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Asset or file not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id/serve',
  validateParams(assetSchemas.assetId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = req.params.id;
    if (!assetId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Asset ID is required',
        },
      });
      return;
    }

    const asset = await assetService.getAsset(assetId, req.user.id);

    if (!asset) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
        },
      });
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, asset.filePath);

    if (!await fs.pathExists(filePath)) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found on disk',
        },
      });
      return;
    }

    // Set appropriate headers for serving
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', asset.fileSize);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Add alt text for images
    if (asset.assetType === 'IMAGE' && asset.alt) {
      res.setHeader('X-Alt-Text', asset.alt);
    }

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  })
);

// POST /assets/cleanup - Cleanup temporary files (admin only)
router.post(
  '/cleanup',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Only allow admin users to trigger cleanup
    // In a real app, you'd check for admin role
    await assetService.cleanupTempFiles();

    res.json({
      success: true,
      message: 'Temporary files cleaned up successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

export default router;
