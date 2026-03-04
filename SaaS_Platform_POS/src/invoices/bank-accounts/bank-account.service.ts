import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { FileUploadService } from '../../common/services/file-upload.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}

  /**
   * Create a new bank account for a location
   */
  async create(tenantId: string, dto: CreateBankAccountDto) {
    // Verify location belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found or does not belong to your tenant');
    }

    // Check for duplicate account name in the same location
    const existing = await this.prisma.bankAccount.findUnique({
      where: {
        locationId_accountName: {
          locationId: dto.locationId,
          accountName: dto.accountName,
        },
      },
    });

    if (existing) {
      throw new ConflictException('An account with this name already exists for this location');
    }

    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { locationId: dto.locationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create bank account
    return this.prisma.bankAccount.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        accountName: dto.accountName,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolderName: dto.accountHolderName,
        ifscCode: dto.ifscCode,
        branchName: dto.branchName,
        accountType: dto.accountType || 'CURRENT',
        upiId: dto.upiId,
        isDefault: dto.isDefault || false,
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Get all bank accounts for a location
   */
  async findAll(tenantId: string, locationId: string) {
    console.log('[BankAccountService] findAll - tenantId:', tenantId, 'locationId:', locationId);
    
    // Validate required parameter
    if (!locationId) {
      console.log('[BankAccountService] No locationId provided, returning empty array');
      return [];
    }

    // Verify location belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
    });

    console.log('[BankAccountService] Location found:', location ? 'YES' : 'NO');

    // If location doesn't exist or doesn't belong to tenant, return empty array
    // This is more RESTful than throwing 404
    if (!location) {
      console.log('[BankAccountService] Location not found or wrong tenant, returning empty array');
      return [];
    }

    const result = await this.prisma.bankAccount.findMany({
      where: { tenantId, locationId, isActive: true },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });
    
    console.log('[BankAccountService] Query result:', result.length, 'records');
    return result;
  }

  /**
   * Get a single bank account
   */
  async findOne(tenantId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  /**
   * Update bank account
   */
  async update(tenantId: string, id: string, dto: UpdateBankAccountDto) {
    const account = await this.findOne(tenantId, id);

    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { locationId: account.locationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Check for duplicate account name if changing name
    if (dto.accountName && dto.accountName !== account.accountName) {
      const existing = await this.prisma.bankAccount.findUnique({
        where: {
          locationId_accountName: {
            locationId: account.locationId,
            accountName: dto.accountName,
          },
        },
      });

      if (existing) {
        throw new ConflictException('An account with this name already exists for this location');
      }
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolderName: dto.accountHolderName,
        ifscCode: dto.ifscCode,
        branchName: dto.branchName,
        accountType: dto.accountType,
        upiId: dto.upiId,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Set as default account
   */
  async setDefault(tenantId: string, id: string) {
    const account = await this.findOne(tenantId, id);

    // Unset other defaults
    await this.prisma.bankAccount.updateMany({
      where: { locationId: account.locationId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });

    // Set this as default
    return this.prisma.bankAccount.update({
      where: { id },
      data: { isDefault: true },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Delete bank account (soft delete)
   */
  async remove(tenantId: string, id: string) {
    const account = await this.findOne(tenantId, id);

    // Check if account is being used in any invoices
    const invoiceCount = await this.prisma.invoice.count({
      where: { bankAccountId: id },
    });

    if (invoiceCount > 0) {
      throw new BadRequestException(
        `Cannot delete this bank account as it is used in ${invoiceCount} invoice(s). You can deactivate it instead.`,
      );
    }

    // Delete associated QR code if exists
    if (account.qrCodeUrl) {
      try {
        await this.fileUploadService.deleteFromSupabase(account.qrCodeUrl);
      } catch (error) {
        // Log error but don't fail the deletion
        console.error('Failed to delete QR code:', error.message);
      }
    }

    // Soft delete (set isActive = false)
    return this.prisma.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Upload QR code for bank account
   */
  async uploadQRCode(tenantId: string, id: string, file: Express.Multer.File) {
    const account = await this.findOne(tenantId, id);

    // Delete old QR code if exists
    if (account.qrCodeUrl) {
      try {
        await this.fileUploadService.deleteFromSupabase(account.qrCodeUrl);
      } catch (error) {
        console.error('Failed to delete old QR code:', error.message);
      }
    }

    // Upload new QR code
    const qrCodeUrl = await this.fileUploadService.uploadToSupabase(
      file,
      'qr-codes',
      tenantId,
      account.locationId,
    );

    // Update account with QR code URL
    return this.prisma.bankAccount.update({
      where: { id },
      data: { qrCodeUrl },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Delete QR code from bank account
   */
  async deleteQRCode(tenantId: string, id: string) {
    const account = await this.findOne(tenantId, id);

    if (!account.qrCodeUrl) {
      throw new BadRequestException('This account does not have a QR code');
    }

    // Delete from Supabase
    await this.fileUploadService.deleteFromSupabase(account.qrCodeUrl);

    // Remove URL from database
    return this.prisma.bankAccount.update({
      where: { id },
      data: { qrCodeUrl: null },
    });
  }
}
