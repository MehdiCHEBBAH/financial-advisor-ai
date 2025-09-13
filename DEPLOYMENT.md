# Deployment Guide

This guide covers deploying the Financial Adviser AI application to various platforms.

## 🚀 Vercel Deployment (Recommended)

Vercel is the easiest way to deploy this Next.js application.

### Prerequisites
- GitHub/GitLab/Bitbucket account
- Vercel account

### Steps

1. **Push your code to a Git repository**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository
   - Vercel will automatically detect it's a Next.js project
   - Configure environment variables (see Environment Variables section)
   - Click "Deploy"

3. **Configure Environment Variables**
   In your Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add the following variables:
     ```
     NODE_ENV=production
     OPENAI_API_KEY=your_openai_api_key
     ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
     ```

4. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

### Automatic Deployments
Vercel automatically deploys:
- Production deployments from `main` branch
- Preview deployments from other branches and PRs

## 🐳 Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose (optional)

### Build Docker Image

1. **Create Dockerfile** (already included)
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app

   # Install dependencies based on the preferred package manager
   COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
   RUN \
     if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
     elif [ -f package-lock.json ]; then npm ci; \
     elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
     else echo "Lockfile not found." && exit 1; \
     fi

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .

   # Next.js collects completely anonymous telemetry data about general usage.
   # Learn more here: https://nextjs.org/telemetry
   # Uncomment the following line in case you want to disable telemetry during the build.
   ENV NEXT_TELEMETRY_DISABLED 1

   RUN yarn build

   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app

   ENV NODE_ENV production
   # Uncomment the following line in case you want to disable telemetry during runtime.
   ENV NEXT_TELEMETRY_DISABLED 1

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public

   # Set the correct permission for prerender cache
   RUN mkdir .next
   RUN chown nextjs:nodejs .next

   # Automatically leverage output traces to reduce image size
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs

   EXPOSE 3000

   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"

   CMD ["node", "server.js"]
   ```

2. **Build the image**
   ```bash
   docker build -t financial-adviser-ai .
   ```

3. **Run the container**
   ```bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e OPENAI_API_KEY=your_key \
     financial-adviser-ai
   ```

### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ALPHA_VANTAGE_API_KEY=${ALPHA_VANTAGE_API_KEY}
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## ☁️ AWS Deployment

### AWS Amplify

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Click "New App" → "Host web app"
   - Connect your Git repository

2. **Configure Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
         - .next/cache/**/*
   ```

3. **Set Environment Variables**
   - In Amplify Console → App Settings → Environment Variables
   - Add your environment variables

### AWS ECS with Fargate

1. **Build and push Docker image**
   ```bash
   # Build image
   docker build -t financial-adviser-ai .
   
   # Tag for ECR
   docker tag financial-adviser-ai:latest 123456789.dkr.ecr.region.amazonaws.com/financial-adviser-ai:latest
   
   # Push to ECR
   docker push 123456789.dkr.ecr.region.amazonaws.com/financial-adviser-ai:latest
   ```

2. **Create ECS Task Definition**
   ```json
   {
     "family": "financial-adviser-ai",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "app",
         "image": "123456789.dkr.ecr.region.amazonaws.com/financial-adviser-ai:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "OPENAI_API_KEY",
             "valueFrom": "arn:aws:ssm:region:account:parameter/openai-api-key"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/financial-adviser-ai",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

## 🐙 DigitalOcean App Platform

1. **Connect Repository**
   - Go to DigitalOcean App Platform
   - Create new app from source
   - Connect your Git repository

2. **Configure App Spec**
   ```yaml
   name: financial-adviser-ai
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/financial-adviser-ai
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: OPENAI_API_KEY
       value: ${OPENAI_API_KEY}
       type: SECRET
   ```

## 🌐 Netlify Deployment

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`

2. **Environment Variables**
   - Add in Site Settings → Environment Variables

3. **Deploy**
   - Connect your Git repository
   - Netlify will automatically deploy

## 🔧 Environment Variables

### Required Variables

```env
NODE_ENV=production
```

### Optional Variables

```env
# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key

# Database (if using external database)
DATABASE_URL=your_database_url

# Redis (if using external Redis)
REDIS_URL=your_redis_url

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

## 📊 Monitoring and Analytics

### Health Checks

The application includes built-in health check endpoints:

- `/api/health` - Basic health status
- `/api/status` - Detailed service status

### Logging

Configure logging based on your deployment platform:

```javascript
// Custom logger configuration
const logger = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty'
};
```

### Performance Monitoring

Consider adding:
- **Vercel Analytics** for Vercel deployments
- **New Relic** for comprehensive monitoring
- **Sentry** for error tracking

## 🔒 Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit API keys to version control
   - Use secure secret management

2. **HTTPS**
   - Ensure all deployments use HTTPS
   - Configure proper SSL certificates

3. **Rate Limiting**
   - Implement rate limiting for API endpoints
   - Use services like Upstash Redis for distributed rate limiting

4. **CORS Configuration**
   - Configure CORS for your domain only
   - Update `next.config.ts` with proper CORS settings

## 🚀 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📈 Scaling Considerations

### Performance Optimization

1. **Caching Strategy**
   - Implement Redis for distributed caching
   - Use CDN for static assets

2. **Database Optimization**
   - Use connection pooling
   - Implement query optimization

3. **Load Balancing**
   - Use multiple instances behind a load balancer
   - Configure auto-scaling

### Monitoring Scaling

- Set up alerts for high CPU/memory usage
- Monitor response times and error rates
- Configure auto-scaling policies

## 🔄 Rollback Strategy

### Vercel
- Use Vercel's built-in rollback feature
- Keep previous deployments available

### Docker
```bash
# Rollback to previous image
docker run -p 3000:3000 financial-adviser-ai:previous-version
```

### Manual Rollback
1. Revert to previous Git commit
2. Redeploy application
3. Verify functionality

## 📞 Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test locally with production settings
4. Contact platform support if needed

---

**Note**: Always test deployments in a staging environment before deploying to production.
