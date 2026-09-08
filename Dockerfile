# Dockerfile — Sistem LMS Al Amin Edu Oasis
# Multi-stage build: Node.js (Next.js standalone) + Python (ReportLab PDF generation)

# ============ Stage 1: Install Node dependencies ============
FROM node:20-slim AS node-deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN npm install -g bun && bun install --frozen-lockfile

# ============ Stage 2: Build Next.js ============
FROM node-deps AS builder
WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client
RUN bun run db:generate
# Build Next.js (standalone output)
RUN bun run build

# ============ Stage 3: Production runtime (Node + Python) ============
FROM node:20-slim AS runner
WORKDIR /app

# Install Python + PDF dependencies (ReportLab, qrcode, Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    libjpeg-dev zlib1g-dev \
    fonts-dejavu \
    && python3 -m pip install --break-system-packages --no-cache-dir reportlab qrcode pillow \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=3000

# Copy standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files (needed at runtime for Prisma Client)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy PDF generation script
COPY --from=builder /app/src/lib/pdf_script.py ./src/lib/pdf_script.py

# Create persistent directories for uploads and reports
RUN mkdir -p /app/public/uploads /app/public/reports /app/db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/reports').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the standalone Next.js server
CMD ["node", "server.js"]
