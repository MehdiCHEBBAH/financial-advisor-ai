import { NextRequest, NextResponse } from 'next/server';

export interface StatusResponse {
  service: string;
  status: 'operational' | 'degraded' | 'outage';
  message: string;
  timestamp: string;
  dependencies: {
    database: 'up' | 'down';
    external_apis: 'up' | 'down';
    cache: 'up' | 'down';
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    // Simulate dependency checks
    const dependencies = {
      database: 'up' as const,
      external_apis: 'up' as const,
      cache: 'up' as const,
    };

    const statusResponse: StatusResponse = {
      service: 'financial-adviser-ai',
      status: 'operational',
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      dependencies,
    };

    return NextResponse.json(statusResponse, { status: 200 });
  } catch (error) {
    console.error('Status check failed:', error);
    
    const errorResponse: StatusResponse = {
      service: 'financial-adviser-ai',
      status: 'outage',
      message: 'Service unavailable',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'down',
        external_apis: 'down',
        cache: 'down',
      },
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}
