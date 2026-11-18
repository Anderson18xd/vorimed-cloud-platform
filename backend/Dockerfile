FROM node:20-alpine AS builder

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev && \
    npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

FROM node:20-alpine AS runner

RUN apk update && apk upgrade --no-cache

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node . .

USER node

EXPOSE 5000

CMD ["node", "server.js"]
