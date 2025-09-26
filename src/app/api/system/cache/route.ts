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

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      // Delete specific host from cache
      if (!persistentHostCache.has(id)) {
        return NextResponse.json({
          status: 'error',
          error: `Host with ID ${id} not found in cache`
        }, { status: 404 });
      }
      
      persistentHostCache.delete(id);
      
      return NextResponse.json({
        status: 'ok',
        message: `Host with ID ${id} removed from cache`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Clear entire cache
      persistentHostCache.clear();
      
      return NextResponse.json({
        status: 'ok',
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}