# Use the slim, secure Alpine-based Node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# We copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install only production dependencies (skips nodemon)
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Your app binds to 3000 by default (per your code)
EXPOSE 3000

# Run the app
CMD [ "npm", "start" ]