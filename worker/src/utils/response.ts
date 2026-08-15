// Response Utilities
export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

export function successResponse<T>(data: T): Response {
  return jsonResponse({ success: true, ...data });
}

export function errorResponse(error: string, status: number = 400): Response {
  return jsonResponse({ success: false, error }, status);
}

export function unauthorizedResponse(): Response {
  return errorResponse('Unauthorized', 401);
}

export function notFoundResponse(message: string = 'Not found'): Response {
  return errorResponse(message, 404);
}

export function imageResponse(
  data: ArrayBuffer | Uint8Array,
  contentType: string,
  cacheControl: string = 'public, max-age=31536000'
): Response {
  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*'
    }
  });
}
