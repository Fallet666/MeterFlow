# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=/api/
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --fund=false

COPY . .
RUN npm run build

FROM nginx:1.31-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
