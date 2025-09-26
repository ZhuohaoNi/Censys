import { NextRequest, NextResponse } from 'next/server';
import { persistentHostCache } from '@/lib/persistent-cache';

export async function GET() {
  try {
    // Get all hosts from cache
    const allHosts = persistentHostCache.getAll();
    
    // Transform to list format
    const hosts = allHosts.map(({ id, data }) => ({
      id,
      ip: data.host.ip,
      location: `${data.host.location.city}, ${data.host.location.country}`,
      risk_level: data.features.risk_level,
      risk_score: data.features.risk_score,
      service_count: data.features.service_count,
      has_summary: !!data.summary,
      created_at: data.createdAt.toISOString(),
    }));
    
    return NextResponse.json({ hosts });
    
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch hosts',
        },
      },
      { status: 500 }
    );
  }
}