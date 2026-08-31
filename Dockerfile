# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configuration and install dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with reduced attack surface
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install serve globally with minimal footprint
RUN npm install -g serve

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Set proper ownership for non-root user
RUN chown -R appuser:appgroup /app

# Expose the port the app runs on
EXPOSE 3000

# Serve the application as non-root user
USER appuser
CMD ["serve", "-s", "dist", "-l", "3000"]
