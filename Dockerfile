FROM node:22-bookworm-slim
WORKDIR /opt/tervory-browser
COPY package.json server.js ./
EXPOSE 8796
CMD ["node", "server.js"]
