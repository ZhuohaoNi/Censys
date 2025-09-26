import { NextRequest, NextResponse } from 'next/server';
import { SummaryResponseSchema, ErrorResponseSchema } from '@/schemas';
import { persistentHostCache } from '@/lib/persistent-cache';
import { generateSummary } from '@/lib/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get host from cache
    const cached = persistentHostCache.get(id);
    
    if (!cached) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: `Host with ID ${id} not found`,
        },
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }
    
    // Check if summary already exists
    if (cached.summary) {
      const response = SummaryResponseSchema.parse({
        summary: cached.summary,
        generated_at: cached.summarizedAt?.toISOString() || new Date().toISOString(),
      });
      return NextResponse.json(response);
    }
    
    // Generate new summary
    const summary = await generateSummary(cached.host, cached.features);
    
    // Store summary in cache
    persistentHostCache.setSummary(id, summary);
    
    // Return response
    const response = SummaryResponseSchema.parse({
      summary,
      generated_at: new Date().toISOString(),
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'SUMMARY_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate summary',
      },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}