export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const configured = Boolean(publicKey && process.env.VAPID_PRIVATE_KEY);
  return Response.json(
    { available: configured, publicKey: configured ? publicKey : null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
