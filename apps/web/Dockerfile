# Saptta unified web (SPA) — dev container.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host so the dev server is reachable from nginx / other containers.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
