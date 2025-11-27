# Use Node 20 Alpine as the base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
# We use --omit=dev to keep the image small
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# FIX: Grant permissions to the 'node' user
# Hugging Face Spaces runs as user 1000, so we must ensure 
# this user owns the directory.
RUN chown -R node:node /app

# Switch to the non-root 'node' user for security
USER node

# Expose the port Hugging Face expects
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["node", "index.js"]