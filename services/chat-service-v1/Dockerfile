# This file tells Docker how to build an "image" of your service
# so it can run anywhere (like on AWS).

# 1. Start from the official Node.js 20 image
FROM node:20-slim

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy your package.json files
# This copies *only* these files first to cache dependencies
COPY package.json package-lock.json* ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your application code
COPY . .

# 6. Expose the port your app runs on
EXPOSE 3000

# 7. Define the command to start your app
CMD [ "npm", "start" ]