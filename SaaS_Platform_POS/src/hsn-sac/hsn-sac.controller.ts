import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HsnSacService } from './hsn-sac.service';

@ApiTags('HSN/SAC Codes')
@ApiBearerAuth()
@Controller('hsn-sac')
@UseGuards(JwtAuthGuard)
export class HsnSacController {
  constructor(private readonly hsnSacService: HsnSacService) {}

  @Get('hsn/search')
  @ApiOperation({ summary: 'Search HSN codes (autocomplete)' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (code or description)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 20)' })
  @ApiResponse({ status: 200, description: 'List of matching HSN codes' })
  searchHSN(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.hsnSacService.searchHSN(query, limit ? parseInt(limit.toString()) : 20);
  }

  @Get('hsn/:code')
  @ApiOperation({ summary: 'Get HSN code details by exact code' })
  @ApiResponse({ status: 200, description: 'HSN code details' })
  @ApiResponse({ status: 404, description: 'HSN code not found' })
  getHSNByCode(@Param('code') code: string) {
    return this.hsnSacService.findHSNByCode(code);
  }

  @Get('sac/search')
  @ApiOperation({ summary: 'Search SAC codes (autocomplete)' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (code or description)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 20)' })
  @ApiResponse({ status: 200, description: 'List of matching SAC codes' })
  searchSAC(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.hsnSacService.searchSAC(query, limit ? parseInt(limit.toString()) : 20);
  }

  @Get('sac/:code')
  @ApiOperation({ summary: 'Get SAC code details by exact code' })
  @ApiResponse({ status: 200, description: 'SAC code details' })
  @ApiResponse({ status: 404, description: 'SAC code not found' })
  getSACByCode(@Param('code') code: string) {
    return this.hsnSacService.findSACByCode(code);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get total HSN/SAC code counts' })
  @ApiResponse({ status: 200, description: 'Code counts' })
  getCounts() {
    return this.hsnSacService.getCounts();
  }

  @Post('seed/hsn')
  @ApiOperation({ summary: 'Seed HSN codes (admin only)' })
  @ApiResponse({ status: 200, description: 'HSN codes seeded successfully' })
  @HttpCode(HttpStatus.OK)
  seedHSN(@Body() body: { codes: Array<{ code: string; description: string; chapter?: string; heading?: string; gstRate?: number }> }) {
    return this.hsnSacService.seedHSNCodes(body.codes);
  }

  @Post('seed/sac')
  @ApiOperation({ summary: 'Seed SAC codes (admin only)' })
  @ApiResponse({ status: 200, description: 'SAC codes seeded successfully' })
  @HttpCode(HttpStatus.OK)
  seedSAC(@Body() body: { codes: Array<{ code: string; description: string; category?: string; gstRate?: number }> }) {
    return this.hsnSacService.seedSACCodes(body.codes);
  }
}
