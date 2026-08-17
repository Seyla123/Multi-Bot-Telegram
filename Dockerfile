FROM node:20

WORKDIR /usr/src/app

# 1. Copy backend package definition & Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# 2. Install root dependencies
RUN npm install

# 3. Copy all source files
COPY . .

# 4. Build Vue 3 Frontend (client/dist) AFTER copying source
RUN cd client && npm install && npm run build

# 5. Build NestJS backend (dist/)
RUN npm run build

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]
