import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { BusinessTypeGuard } from '../../common/guards/business-type.guard';
import { BusinessTypes } from '../../common/decorators/business-types.decorator';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { AuthenticatedRequest } from '../../types/express-types';

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@Controller('invoices/bank-accounts')
@UseGuards(JwtAuthGuard, SubscriptionGuard, BusinessTypeGuard)
@BusinessTypes('RETAIL')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bank account for a location' })
  @ApiResponse({ status: 201, description: 'Bank account created successfully' })
  create(@Request() req: AuthenticatedRequest, @Body() createBankAccountDto: CreateBankAccountDto) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.create(tenantId, createBankAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank accounts for a location' })
  @ApiResponse({ status: 200, description: 'List of bank accounts' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('locationId', ParseUUIDPipe) locationId: string,
  ) {
    const tenantId = req.user.tenantId;
    console.log('[BankAccount] findAll called - tenantId:', tenantId, 'locationId:', locationId);
    const result = await this.bankAccountService.findAll(tenantId, locationId);
    console.log('[BankAccount] findAll result:', result.length, 'records');
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bank account' })
  @ApiResponse({ status: 200, description: 'Bank account details' })
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bank account' })
  @ApiResponse({ status: 200, description: 'Bank account updated successfully' })
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.update(tenantId, id, updateBankAccountDto);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set bank account as default for its location' })
  @ApiResponse({ status: 200, description: 'Bank account set as default' })
  setDefault(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.setDefault(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bank account' })
  @ApiResponse({ status: 200, description: 'Bank account deleted successfully' })
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.remove(tenantId, id);
  }

  @Post(':id/upload-qr')
  @ApiOperation({ summary: 'Upload QR code for bank account' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'QR code uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  uploadQRCode(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|svg)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.uploadQRCode(tenantId, id, file);
  }

  @Delete(':id/qr-code')
  @ApiOperation({ summary: 'Delete QR code from bank account' })
  @ApiResponse({ status: 200, description: 'QR code deleted successfully' })
  deleteQRCode(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.bankAccountService.deleteQRCode(tenantId, id);
  }
}
