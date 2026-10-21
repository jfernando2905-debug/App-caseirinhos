export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    environment: 'vercel',
  });
}
