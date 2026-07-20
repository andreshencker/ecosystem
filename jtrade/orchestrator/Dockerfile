FROM node:20-alpine AS builder

WORKDIR /app

# -------------------------------
#  1) Recibir ambiente (default prod)
# -------------------------------
ARG NODE_ENV=prod
ENV NODE_ENV=$NODE_ENV

# -------------------------------
#  2) Archivos del proyecto
# -------------------------------
COPY package*.json ./

RUN npm install
RUN npm install -g @nestjs/cli

COPY . .

# -------------------------------
#  3) Copiar .env según el ambiente
# -------------------------------
COPY .env.$NODE_ENV .env

# -------------------------------
#  4) Compilar
# -------------------------------
RUN npm run build

# -------------------------------
#  5) Imagen final limpia
# -------------------------------
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

ENV NODE_ENV=$NODE_ENV
EXPOSE 3003

CMD ["npm", "run", "start:prod"]