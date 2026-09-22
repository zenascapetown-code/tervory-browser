FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/tervory-browser
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
ENV CHROME_PATH=/usr/bin/chromium
EXPOSE 8796
CMD ["node", "server.js"]
