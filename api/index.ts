import app from '../server';

export default function handler(req: any, res: any) {
  try {
    // Resolve ES module default vs CommonJS export cleanly
    const expressApp = (app && typeof (app as any).default === 'function')
      ? (app as any).default
      : app;

    if (typeof expressApp === 'function') {
      return expressApp(req, res);
    }

    if (expressApp && typeof expressApp.handle === 'function') {
      return expressApp.handle(req, res);
    }

    return res.status(500).json({
      success: false,
      message: 'Serverless Express initialization failed',
      type: typeof expressApp,
    });
  } catch (err: any) {
    console.error('Vercel serverless error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Serverless invocation exception',
    });
  }
}
