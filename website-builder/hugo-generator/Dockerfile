FROM node:18-alpine

# Install Hugo using Alpine's package manager
RUN apk add --no-cache hugo

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create directories
RUN mkdir -p output packages temp logs

# Expose port
EXPOSE 3003

# Start the app
CMD ["npm", "start"]