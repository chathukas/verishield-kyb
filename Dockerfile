FROM apify/actor-node:22

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm install apify@^3.2.0 --no-save --no-audit --no-fund

COPY . ./

CMD ["node", "src/main.js"]
