FROM node:20

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Copy prisma schema so postinstall "prisma generate" can run successfully
COPY prisma ./prisma/

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# We'll override this in docker-compose.yml for local development
CMD [ "npm", "run", "start:prod" ]
