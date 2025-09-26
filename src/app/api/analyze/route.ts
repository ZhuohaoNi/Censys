import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyzeRequestSchema, AnalyzeResponseSchema, ErrorResponseSchema } from '@/schemas';
import { engineerFeatures } from '@/lib/feature-engineering';
import { persistentHostCache } from '@/lib/persistent-cache';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = AnalyzeRequestSchema.parse(body);
    
    // Process each host
    const analyzedHosts = validated.hosts.map(host => {
      // Generate unique ID
      const id = crypto.randomUUID();
      
      // Engineer features
      const features = engineerFeatures(host);
      
      // Store in cache
      persistentHostCache.set(id, { host, features });
      
      return {
        id,
        ip: host.ip,
        risk_level: features.risk_level,
        risk_score: features.risk_score,
      };
    });
    
    // Return response
    const response = AnalyzeResponseSchema.parse({ analyzed_hosts: analyzedHosts });
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // Handle other errors
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}