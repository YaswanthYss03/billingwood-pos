import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileUploadService {
  private supabase: SupabaseClient | null = null;
  private bucketName = 'invoice-documents';
  private isSupabaseConfigured = false;

  // Allowed file types
  private allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
  ];

  // Max file size: 5MB
  private maxFileSize = 5 * 1024 * 1024;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isSupabaseConfigured = true;
      console.log('✅ FileUploadService: Supabase Storage configured');
    } else {
      console.warn('⚠️  FileUploadService: Supabase Storage not configured. File uploads will fail.');
      console.warn('   Add SUPABASE_SERVICE_ROLE_KEY to .env file to enable file uploads.');
      console.warn('   Get it from: Supabase Dashboard > Project Settings > API > service_role key');
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param file - Multer file object
   * @param folder - Folder path in bucket (e.g., 'logos', 'signatures')
   * @param tenantId - Tenant ID for organizing files
   * @param locationId - Location ID for organizing files
   * @returns Public URL of uploaded file
   */
  async uploadToSupabase(
    file: Express.Multer.File,
    folder: string,
    tenantId: string,
    locationId?: string,
  ): Promise<string> {
    // Check if Supabase is configured
    if (!this.isSupabaseConfigured || !this.supabase) {
      throw new InternalServerErrorException(
        'File upload not available. Supabase Storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env file.'
      );
    }

    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExt}`;

    // Construct file path: folder/tenantId/locationId/filename
    let filePath = `${folder}/${tenantId}`;
    if (locationId) {
      filePath += `/${locationId}`;
    }
    filePath += `/${fileName}`;

    try {
      // Upload file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new InternalServerErrorException(`Supabase upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param fileUrl - Full public URL of the file
   */
  async deleteFromSupabase(fileUrl: string): Promise<void> {
    if (!fileUrl) {
      return; // Nothing to delete
    }

    // Check if Supabase is configured
    if (!this.isSupabaseConfigured || !this.supabase) {
      throw new InternalServerErrorException(
        'File deletion not available. Supabase Storage is not configured.'
      );
    }

    try {
      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(fileUrl);

      if (!filePath) {
        throw new BadRequestException('Invalid file URL');
      }

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new InternalServerErrorException(`Supabase delete failed: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check if file has content
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }
  }

  /**
   * Extract file path from Supabase public URL
   * Example URL: https://xxx.supabase.co/storage/v1/object/public/invoice-documents/logos/tenant123/file.png
   * Returns: logos/tenant123/file.png
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Find 'invoice-documents' in path
      const bucketIndex = pathParts.indexOf(this.bucketName);
      
      if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
        return null;
      }

      // Everything after bucket name is the file path
      return pathParts.slice(bucketIndex + 1).join('/');
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if bucket exists, create if not (admin task)
   */
  async ensureBucketExists(): Promise<void> {
    if (!this.isSupabaseConfigured || !this.supabase) {
      console.warn('⚠️  Cannot ensure bucket exists: Supabase not configured');
      return;
    }

    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      
      const exists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!exists) {
        await this.supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: this.maxFileSize,
        });
      }
    } catch (error) {
      console.error('Failed to ensure bucket exists:', error.message);
      // Don't throw - bucket might already exist
    }
  }
}
