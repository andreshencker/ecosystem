FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_ID_API_URL=http://localhost:3101
ARG NEXT_PUBLIC_JTRADE_URL=http://localhost:5173
ARG NEXT_PUBLIC_BUSINESS_URL=http://localhost:3003
ARG NEXT_PUBLIC_COMMUNICATIONS_URL=http://localhost:3000
ENV NEXT_PUBLIC_ID_API_URL=$NEXT_PUBLIC_ID_API_URL
ENV NEXT_PUBLIC_JTRADE_URL=$NEXT_PUBLIC_JTRADE_URL
ENV NEXT_PUBLIC_BUSINESS_URL=$NEXT_PUBLIC_BUSINESS_URL
ENV NEXT_PUBLIC_COMMUNICATIONS_URL=$NEXT_PUBLIC_COMMUNICATIONS_URL
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3100
CMD ["npm", "run", "start"]
