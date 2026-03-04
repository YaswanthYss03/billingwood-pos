import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Response,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  QueryInvoiceDto,
} from './dto';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create invoice - Professional Plan RETAIL only' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async create(
    @CurrentUser() user: any,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    const tenantId = user.tenantId;
    const userId = user.id;
    const locationId = createInvoiceDto.locationId || user.locationId;

    const invoice = await this.invoicesService.create(
      tenantId,
      userId,
      locationId,
      createInvoiceDto,
    );

    return {
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    };
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get invoice dashboard metrics' })
  async getDashboard(
    @CurrentUser() user: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('locationId') locationId?: string,
  ) {
    const metrics = await this.invoicesService.getDashboardMetrics(
      user.tenantId,
      { fromDate, toDate, locationId },
    );

    return {
      success: true,
      data: metrics,
    };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List all invoices with filters' })
  async findAll(
    @CurrentUser() user: any,
    @Query() queryDto: QueryInvoiceDto,
  ) {
    const result = await this.invoicesService.findAll(user.tenantId, queryDto);

    return {
      success: true,
      ...result,
    };
  }

  // PDF download - must come BEFORE @Get(':id') to avoid route conflict
  @Get(':id/pdf')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadPDF(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Response() res: ExpressResponse,
  ) {
    console.log('========================');
    console.log('PDF ENDPOINT HIT!');
    console.log('PDF download requested for invoice:', id, 'by tenant:', user.tenantId);
    console.log('User:', JSON.stringify(user, null, 2));
    console.log('========================');
    
    try {
      console.log('Starting PDF generation...');
      const pdfBuffer = await this.pdfService.generatePdf(user.tenantId, id);
      console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
      console.log('PDF sent to client');
    } catch (error) {
      console.error('========================');
      console.error('ERROR generating PDF:', error);
      console.error('Error stack:', error.stack);
      console.error('========================');
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const invoice = await this.invoicesService.findOne(user.tenantId, id);

    return {
      success: true,
      data: invoice,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update invoice (DRAFT only)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    const invoice = await this.invoicesService.update(
      user.tenantId,
      id,
      updateInvoiceDto,
    );

    return {
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    };
  }

  @Post(':id/send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark invoice as SENT (deducts inventory)' })
  async markAsSent(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const invoice = await this.invoicesService.markAsSent(user.tenantId, id);

    return {
      success: true,
      message: 'Invoice marked as sent',
      data: invoice,
    };
  }

  @Post(':id/payments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Record payment for invoice' })
  async recordPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() paymentDto: RecordPaymentDto,
  ) {
    const payment = await this.invoicesService.recordPayment(
      user.tenantId,
      id,
      paymentDto,
    );

    return {
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel invoice (soft delete)' })
  async cancel(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    await this.invoicesService.cancel(user.tenantId, id);

    return {
      success: true,
      message: 'Invoice cancelled successfully',
    };
  }

}
