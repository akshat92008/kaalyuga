import { NextRequest } from 'next/server';
import { serveStaticAssetFromProxy } from '@/lib/server/staticAssetProxy';

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  return serveStaticAssetFromProxy(req, segments || [], true);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  return serveStaticAssetFromProxy(req, segments || [], false);
}
