import { NextRequest, NextResponse } from 'next/server';
import { HostResponseSchema, ErrorResponseSchema } from '@/schemas';
import { hostCache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get host from cache
    const cached = hostCache.get(id);
    
    if (!cached) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: `Host with ID ${id} not found`,
        },
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }
    
    // Return host data with features and summary
    const response = HostResponseSchema.parse({
      host: cached.host,
      features: cached.features,
      summary: cached.summary || null,
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch host',
      },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}