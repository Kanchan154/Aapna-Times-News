# Builds the React app, then serves it together with the API from one Node container.
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server
COPY server/ server/
COPY --from=client /app/client/dist client/dist
VOLUME /app/server/uploads
EXPOSE 5000
CMD ["node", "server/src/server.js"]
