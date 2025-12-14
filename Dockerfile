FROM node:24

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["node", "main.js"]
