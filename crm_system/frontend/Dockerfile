FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
# For production:
# RUN npm run build
# RUN npm install -g serve
# CMD ["serve", "-s", "build", "-l", "3000"]