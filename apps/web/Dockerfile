# Saptta unified web (SPA) — dev container.
FROM node:20-alpine

# NOTE: deliberately NOT /app. The SPA has an "/app" route, and Vite's dev server
# resolves a request for URL "/app" against the filesystem — if the working dir is
# literally /app, that URL hits the real directory and 500s (EISDIR). Using a
# different root lets "/app" fall through to the SPA index.html as intended.
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host so the dev server is reachable from nginx / other containers.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
