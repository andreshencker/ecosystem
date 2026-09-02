# -------------------------------------------------
# 1) STAGE: Build del frontend
# -------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Ambiente esperado: local  | prod
ARG NODE_ENV=prod
ENV NODE_ENV=$NODE_ENV

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Optional per-environment file (env/.env.local | env/.env.prod). Any value
# passed as a build ARG below overrides it (Vite: real env vars beat .env files).
COPY env/.env.$NODE_ENV .env

# Public config — pass from docker-compose.prod.yml. Defaults keep local builds working.
ARG VITE_API_BASE=http://localhost:3202/backend
ARG VITE_GRAPIFLY_ID_URL=http://localhost:3101
ARG VITE_GRAPIFLY_WEB_URL=http://localhost:3100
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_GRAPIFLY_ID_URL=$VITE_GRAPIFLY_ID_URL
ENV VITE_GRAPIFLY_WEB_URL=$VITE_GRAPIFLY_WEB_URL

# Construcción final del frontend
RUN npm run build:docker


# -------------------------------------------------
# 2) STAGE: Nginx final
# -------------------------------------------------
FROM nginx:stable-alpine

# Copia el config de Nginx para el ambiente
# Debes tener dentro de /nginx:
#   nginx.local.conf
#   nginx.prod.conf
ARG NODE_ENV=prod
COPY nginx/nginx.$NODE_ENV.conf /etc/nginx/conf.d/default.conf

# Copiar la compilación
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]