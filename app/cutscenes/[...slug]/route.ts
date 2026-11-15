import { NextRequest } from 'next/server';
import { serveStaticAssetFromProxy } from '@/lib/server/staticAssetProxy';

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return serveStaticAssetFromProxy(req, ['cutscenes', ...(slug || [])], true);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return serveStaticAssetFromProxy(req, ['cutscenes', ...(slug || [])], false);
}
