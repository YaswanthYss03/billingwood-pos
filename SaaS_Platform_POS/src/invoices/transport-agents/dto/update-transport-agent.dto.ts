import { PartialType } from '@nestjs/swagger';
import { CreateTransportAgentDto } from './create-transport-agent.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTransportAgentDto extends PartialType(CreateTransportAgentDto) {
  @ApiPropertyOptional({ description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
