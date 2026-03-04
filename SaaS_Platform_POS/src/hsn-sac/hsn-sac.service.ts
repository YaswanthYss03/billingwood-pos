import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class HsnSacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search HSN codes by code or description
   */
  async searchHSN(query: string, limit: number = 20) {
    if (!query || query.length < 2) {
      return [];
    }

    const results = await this.prisma.hSNCode.findMany({
      where: {
        OR: [
          {
            code: {
              startsWith: query,
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: limit,
      orderBy: {
        code: 'asc',
      },
    });

    return results;
  }

  /**
   * Search SAC codes by code or description
   */
  async searchSAC(query: string, limit: number = 20) {
    if (!query || query.length < 2) {
      return [];
    }

    const results = await this.prisma.sACCode.findMany({
      where: {
        OR: [
          {
            code: {
              startsWith: query,
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: limit,
      orderBy: {
        code: 'asc',
      },
    });

    return results;
  }

  /**
   * Get HSN code details by exact code
   */
  async findHSNByCode(code: string) {
    const hsnCode = await this.prisma.hSNCode.findUnique({
      where: { code },
    });

    if (!hsnCode) {
      throw new NotFoundException(`HSN code ${code} not found`);
    }

    return hsnCode;
  }

  /**
   * Get SAC code details by exact code
   */
  async findSACByCode(code: string) {
    const sacCode = await this.prisma.sACCode.findUnique({
      where: { code },
    });

    if (!sacCode) {
      throw new NotFoundException(`SAC code ${code} not found`);
    }

    return sacCode;
  }

  /**
   * Seed HSN codes from data array
   */
  async seedHSNCodes(codes: Array<{ code: string; description: string; chapter?: string; heading?: string; gstRate?: number }>) {
    const result = await this.prisma.hSNCode.createMany({
      data: codes.map(c => ({
        code: c.code,
        description: c.description,
        chapter: c.chapter || c.code.substring(0, 2),
        heading: c.heading || c.code.substring(0, 4),
        gstRate: c.gstRate,
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      count: result.count,
      message: `Seeded ${result.count} HSN codes`,
    };
  }

  /**
   * Seed SAC codes from data array
   */
  async seedSACCodes(codes: Array<{ code: string; description: string; category?: string; gstRate?: number }>) {
    const result = await this.prisma.sACCode.createMany({
      data: codes.map(c => ({
        code: c.code,
        description: c.description,
        category: c.category,
        gstRate: c.gstRate,
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      count: result.count,
      message: `Seeded ${result.count} SAC codes`,
    };
  }

  /**
   * Get total counts
   */
  async getCounts() {
    const [hsnCount, sacCount] = await Promise.all([
      this.prisma.hSNCode.count(),
      this.prisma.sACCode.count(),
    ]);

    return {
      hsnCount,
      sacCount,
      totalCodes: hsnCount + sacCount,
    };
  }
}
