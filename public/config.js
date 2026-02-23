/**
 * Z-FAST API Configuration
 *
 * Vercel proxies /api/* → Railway automatically (see vercel.json rewrites)
 * So we use an empty string = same-origin relative calls.
 *
 * Railway Backend: https://web-production-c67b3.up.railway.app
 * Vercel Frontend: https://your-project.vercel.app
 */
window.ZFAST_API = '';  // Empty = use Vercel proxy (/api/* → Railway)
