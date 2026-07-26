import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global search across hospitals, packages and platform users',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    example: 'apollo',
    description: 'Search term (minimum 2 characters)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results (max 5 per entity)',
    schema: {
      example: {
        query: 'apollo',
        results: {
          hospitals: [{ id: 3, name: 'Apollo Clinic', isActive: true }],
          packages: [{ id: 2, name: 'PREMIUM', monthlyPrice: 7999 }],
          users: [
            {
              id: '2f6c0f2a-1f5e-4a1d-9b2e-6c1f0a3d4e5f',
              name: 'Platform Admin',
              email: 'admin@platform.com',
              role: 'PLATFORM_ADMIN',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'q is required (min 2 characters)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query.q);
  }
}
