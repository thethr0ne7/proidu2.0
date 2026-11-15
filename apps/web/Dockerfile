FROM node:22-alpine AS build
WORKDIR /workspace
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build
FROM nginx:1.27-alpine
COPY infra/timeweb/nginx-web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html
EXPOSE 80
