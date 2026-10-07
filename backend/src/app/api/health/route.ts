export async function GET() {
  return Response.json({ service: 'tabbeagle-api', milestone: 'invoice-persistence' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
