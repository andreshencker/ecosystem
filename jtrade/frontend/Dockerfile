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

# Copiar archivo de variables del ambiente → .env.local
# Debes tener archivos con este formato:
#   .env.local
#   .env.prod
COPY env/.env.$NODE_ENV .env

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