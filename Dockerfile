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

# Ensure persistent and local directories exist with full write permissions
RUN mkdir -p /data /data/uploads /data/tmp /app/data /app/public/uploads && \
    chmod -R 777 /data

# Expose the port required by Hugging Face Spaces
EXPOSE 7860

# Environment defaults (Hugging Face Spaces persistent storage)
ENV NODE_ENV=production
ENV PORT=7860
ENV DATA_DIR=/data
ENV UPLOADS_DIR=/data/uploads

# Start the server
CMD ["node", "server/index.js"]
