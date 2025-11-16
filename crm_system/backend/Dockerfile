FROM node:18-alpine

RUN apk add --no-cache openssl libc6-compat


WORKDIR /app


COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

# Build yerine direkt dev modda çalışsın
EXPOSE 3001
CMD ["npm", "run", "dev"]