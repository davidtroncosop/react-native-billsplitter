FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy server files
COPY . .

# The port your server actually uses (3001 as seen in index.js)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
