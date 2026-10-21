import { NextResponse } from 'next/server';

export interface ApiAuthResult {
  authenticated: boolean;
  userId?: string;
  userRole?: string;
  isService?: boolean;
  errorResponse?: NextResponse;
}

/**
 * Validates authentication for API endpoints.
 * Checks proxy-injected headers or direct API Key authentication.
 */
export function validateApiAuth(request: Request): ApiAuthResult {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (userId) {
    return {
      authenticated: true,
      userId,
      userRole: userRole || 'STANDARD',
      isService: userId === 'api-service',
    };
  }

  // Fallback direct check for environments where proxy headers were not injected
  const configuredKey = process.env.TICKETS_API_KEY;
  const apiKeyHeader = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const providedKey = apiKeyHeader || bearerToken;

  if (configuredKey && providedKey && providedKey === configuredKey) {
    return {
      authenticated: true,
      userId: 'api-service',
      userRole: 'ADMIN',
      isService: true,
    };
  }

  return {
    authenticated: false,
    errorResponse: NextResponse.json(
      {
        success: false,
        error: 'Non autorizzato: token di sessione mancante o API Key non valida.',
      },
      { status: 401 }
    ),
  };
}
