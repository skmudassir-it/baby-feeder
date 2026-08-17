# Build stage: compile the Next.js static export
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime: tiny nginx serving the exported static site on port 3000
FROM nginx:1.27-alpine
COPY --from=builder /app/out /usr/share/nginx/html
RUN sed -i 's/listen\s*80;/listen 3000;/' /etc/nginx/conf.d/default.conf \
    && sed -i 's/listen\s*\[::\]:80;/listen [::]:3000;/' /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
