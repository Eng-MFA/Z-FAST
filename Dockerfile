# ── Hugging Face Docker Space ─────────────────────────────────
# Base image: Node.js 18 LTS (slim for smaller image size)
FROM node:18-slim

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests first (layer caching optimization)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy the rest of the project files
COPY . .

# Ensure the data directory exists for SQLite (persisted via HF Spaces volume or ephemeral)
RUN mkdir -p /app/data /app/public/uploads

# Expose the port required by Hugging Face Spaces
EXPOSE 7860

# Environment defaults (can be overridden by HF Space secrets/env vars)
ENV NODE_ENV=production
ENV PORT=7860

# Start the server
CMD ["node", "server/index.js"]
