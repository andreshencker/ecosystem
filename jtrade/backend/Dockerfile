FROM node:20-alpine AS builder

WORKDIR /app

# -------------------------------
#  1) Recibir ambiente
# -------------------------------
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

COPY package*.json ./
RUN npm install
RUN npm install -g @nestjs/cli

COPY . .

# Env comes from the compose `env_file: ./env/.env.<env>` at runtime — not baked
# into the image.

RUN npm run build

# -------------------------------
#  4) Imagen final
# -------------------------------
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=$NODE_ENV
EXPOSE 3002

CMD ["npm", "run", "start:prod"]