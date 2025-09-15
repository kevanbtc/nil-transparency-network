# Use the official Node.js 20 image as base
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install additional system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Solidity compiler (solc)
RUN curl -LsS https://github.com/ethereum/solidity/releases/download/v0.8.19/solc-static-linux | install -m 755 /dev/stdin /usr/local/bin/solc

# Install global npm packages for development
RUN npm install -g \
    @nomicfoundation/hardhat-toolbox \
    typescript \
    ts-node \
    eslint \
    prettier \
    nodemon

# Set the working directory
WORKDIR /workspace

# Copy package files for npm install
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the project
RUN npm run build

# Expose common development ports
EXPOSE 3000 8080 8545

# Set the default command
CMD ["bash"]