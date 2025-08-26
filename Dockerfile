FROM node:18.18.0-alpine

WORKDIR /app
COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD [ "node", "--no-deprecation", "server.js" ]
