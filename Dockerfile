FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
COPY public ./public
RUN mkdir -p data uploads
ENV PORT=3000 DB_PATH=/app/data/app.db UPLOADS_DIR=/app/uploads
EXPOSE 3000
CMD ["node", "server.js"]
