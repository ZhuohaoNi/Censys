import { NextResponse } from 'next/server';
import { persistentHostCache } from '@/lib/persistent-cache';

export async function GET() {
  try {
    const allHosts = persistentHostCache.getAll();
    
    return NextResponse.json({
      status: 'ok',
      cache_info: {
        total_hosts: allHosts.length,
        hosts: allHosts.map(({ id, data }) => ({
          id,
          ip: data.host?.ip || 'unknown',
          created_at: data.createdAt,
          has_summary: !!data.summary
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}