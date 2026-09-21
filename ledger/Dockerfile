# Install all dependencies and build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Runtime: without dev dependencies and source files
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY migrations ./migrations
COPY database.json ./database.json

CMD ["node", "build/src/index.js"]
