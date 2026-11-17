import { NextRequest } from 'next/server';
import { serveStaticAssetFromProxy } from '@/lib/server/staticAssetProxy';

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return serveStaticAssetFromProxy(req, ['cutscenes', ...(slug || [])], true);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return serveStaticAssetFromProxy(req, ['cutscenes', ...(slug || [])], false);
}
