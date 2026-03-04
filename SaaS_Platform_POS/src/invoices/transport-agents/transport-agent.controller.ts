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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { BusinessTypeGuard } from '../../common/guards/business-type.guard';
import { BusinessTypes } from '../../common/decorators/business-types.decorator';
import { TransportAgentService } from './transport-agent.service';
import { CreateTransportAgentDto } from './dto/create-transport-agent.dto';
import { UpdateTransportAgentDto } from './dto/update-transport-agent.dto';
import { AuthenticatedRequest } from '../../types/express-types';

@ApiTags('Transport Agents')
@ApiBearerAuth()
@Controller('invoices/transport-agents')
@UseGuards(JwtAuthGuard, SubscriptionGuard, BusinessTypeGuard)
@BusinessTypes('RETAIL')
export class TransportAgentController {
  constructor(private readonly transportAgentService: TransportAgentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transport agent for a location' })
  @ApiResponse({ status: 201, description: 'Transport agent created successfully' })
  create(@Request() req: AuthenticatedRequest, @Body() createTransportAgentDto: CreateTransportAgentDto) {
    const tenantId = req.user.tenantId;
    return this.transportAgentService.create(tenantId, createTransportAgentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transport agents for a location' })
  @ApiResponse({ status: 200, description: 'List of transport agents' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('locationId', ParseUUIDPipe) locationId: string,
  ) {
    const tenantId = req.user.tenantId;
    console.log('[TransportAgent] findAll called - tenantId:', tenantId, 'locationId:', locationId);
    const result = await this.transportAgentService.findAll(tenantId, locationId);
    console.log('[TransportAgent] findAll result:', result.length, 'records');
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transport agent' })
  @ApiResponse({ status: 200, description: 'Transport agent details' })
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.transportAgentService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transport agent' })
  @ApiResponse({ status: 200, description: 'Transport agent updated successfully' })
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTransportAgentDto: UpdateTransportAgentDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.transportAgentService.update(tenantId, id, updateTransportAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transport agent' })
  @ApiResponse({ status: 200, description: 'Transport agent deleted successfully' })
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.transportAgentService.remove(tenantId, id);
  }
}
