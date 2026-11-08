FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund
COPY server.js ./
COPY client ./client
RUN npm run build
RUN mkdir -p data uploads
# The old vanilla frontend in public/ is kept as a fallback for a
# not-yet-built checkout; the built React app in dist/ is what is served.
COPY public ./public
ENV PORT=3000 DB_PATH=/app/data/app.db UPLOADS_DIR=/app/uploads
EXPOSE 3000
CMD ["node", "server.js"]
