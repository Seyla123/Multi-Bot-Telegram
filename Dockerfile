FROM node:20

WORKDIR /usr/src/app

# 1. Copy backend package definition & Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# 2. Install dependencies
RUN npm install

# 3. Build Vue 3 Frontend (client/dist)
COPY client ./client
RUN cd client && npm install && npm run build

# 4. Copy backend source code and build NestJS (dist/)
COPY . .
RUN npm run build

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]
