/**
 * Z-FAST API Configuration
 *
 * Auto-detects environment:
 *   - localhost / 127.0.0.1 → http://localhost:7860  (local dev)
 *   - Production (Vercel / z-fast.tech) → Hugging Face backend directly
 *
 * Hugging Face Backend: https://m-f-a-z-fast-backend.hf.space
 */
(function () {
    const HF_BACKEND = 'https://m-f-a-z-fast-backend.hf.space';
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    window.ZFAST_API = isLocal ? 'http://localhost:7860' : HF_BACKEND;
})();
