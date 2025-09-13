# Deployment Guide

## Overview

This guide covers deploying the Billion Dollar Idea Platform in various environments, from development to production. The platform is designed to be cloud-native and can be deployed using Docker, Docker Compose, or Kubernetes.

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB
- Network: Stable internet connection for Ollama model downloads

**Recommended Requirements:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ (for Ollama models and logs)
- Network: High-bandwidth connection for optimal AI performance

### Software Dependencies

- **Docker**: 20.10+ and Docker Compose 2.0+
- **Node.js**: 20+ (for local development)
- **Ollama**: Latest version for AI model serving

## Environment Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=file:./prisma/production.db

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# Logging Configuration
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_STRUCTURED=false
LOG_FILE=false
LOG_DIRECTORY=./logs

# Security Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=false

# Performance Configuration
REQUEST_TIMEOUT=30000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
```

### Production Environment Variables

For production deployments, ensure these additional variables are set:

```bash
# Production-specific
NODE_ENV=production
LOG_STRUCTURED=true
LOG_FILE=true

# Security
ALLOWED_ORIGINS=https://yourdomain.com
CORS_CREDENTIALS=false

# Performance
RATE_LIMIT_MAX_REQUESTS=100
REQUEST_TIMEOUT=30000

# Database (for PostgreSQL in production)
DATABASE_URL=postgresql://username:password@localhost:5432/billion_dollar_idea

# SSL/TLS (if using HTTPS)
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
```

## Deployment Methods

### 1. Docker Compose (Recommended)

The easiest way to deploy the complete stack:

```bash
# Clone the repository
git clone <repository-url>
cd billion-dollar-idea-platform

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Start the services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

#### Production Docker Compose

For production with monitoring:

```bash
# Start with production profile
docker-compose --profile production --profile monitoring up -d

# This includes:
# - Application server
# - Ollama AI service
# - Nginx reverse proxy
# - Prometheus monitoring
# - Grafana dashboards
```

### 2. Docker (Manual)

Build and run the application container manually:

```bash
# Build the application image
docker build -t billion-dollar-idea-platform .

# Run Ollama service
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama:latest

# Pull the required model
docker exec ollama ollama pull gpt-oss:20b

# Run the application
docker run -d \
  --name app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:./prisma/production.db \
  -e OLLAMA_BASE_URL=http://ollama:11434 \
  --link ollama:ollama \
  -v app_data:/app/prisma \
  -v app_logs:/app/logs \
  billion-dollar-idea-platform
```

### 3. Local Development

For development and testing:

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npm run db:generate
npm run db:push
npm run db:seed

# Start Ollama (in separate terminal)
ollama serve
ollama pull gpt-oss:20b

# Start development server
npm run dev
```

### 4. Kubernetes

For large-scale production deployments:

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: billion-dollar-idea

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: billion-dollar-idea
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  LOG_STRUCTURED: "true"

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: billion-dollar-idea
spec:
  replicas: 3
  selector:
    matchLabels:
      app: billion-dollar-idea-app
  template:
    metadata:
      labels:
        app: billion-dollar-idea-app
    spec:
      containers:
      - name: app
        image: billion-dollar-idea-platform:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: app-config
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  namespace: billion-dollar-idea
spec:
  selector:
    app: billion-dollar-idea-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: billion-dollar-idea
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - yourdomain.com
    secretName: tls-secret
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Deploy to Kubernetes:

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n billion-dollar-idea

# View logs
kubectl logs -f deployment/app -n billion-dollar-idea
```

## Cloud Platform Deployments

### AWS

#### Using ECS with Fargate

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t billion-dollar-idea-platform .
docker tag billion-dollar-idea-platform:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/billion-dollar-idea-platform:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/billion-dollar-idea-platform:latest

# Deploy using ECS task definition
aws ecs create-service \
  --cluster production-cluster \
  --service-name billion-dollar-idea-service \
  --task-definition billion-dollar-idea-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### Using EC2 with Docker

```bash
# Launch EC2 instance with Docker
# SSH into instance and run:

sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Clone and deploy
git clone <repository-url>
cd billion-dollar-idea-platform
docker-compose up -d
```

### Google Cloud Platform

#### Using Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/billion-dollar-idea-platform

# Deploy to Cloud Run
gcloud run deploy billion-dollar-idea-platform \
  --image gcr.io/PROJECT-ID/billion-dollar-idea-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10
```

#### Using GKE

```bash
# Create GKE cluster
gcloud container clusters create billion-dollar-idea-cluster \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --zone us-central1-a

# Get credentials
gcloud container clusters get-credentials billion-dollar-idea-cluster --zone us-central1-a

# Deploy using kubectl
kubectl apply -f k8s/
```

### Azure

#### Using Container Instances

```bash
# Create resource group
az group create --name billion-dollar-idea-rg --location eastus

# Create container instance
az container create \
  --resource-group billion-dollar-idea-rg \
  --name billion-dollar-idea-app \
  --image billion-dollar-idea-platform:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --dns-name-label billion-dollar-idea-unique
```

#### Using AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group billion-dollar-idea-rg \
  --name billion-dollar-idea-aks \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-addons monitoring

# Get credentials
az aks get-credentials --resource-group billion-dollar-idea-rg --name billion-dollar-idea-aks

# Deploy using kubectl
kubectl apply -f k8s/
```

## Database Setup

### SQLite (Development/Small Production)

SQLite is used by default and requires no additional setup:

```bash
# Initialize database
npm run db:generate
npm run db:push
npm run db:seed
```

### PostgreSQL (Production)

For production deployments, PostgreSQL is recommended:

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE billion_dollar_idea;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE billion_dollar_idea TO app_user;
\q

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://app_user:secure_password@localhost:5432/billion_dollar_idea"

# Run migrations
npm run db:generate
npm run db:push
npm run db:seed
```

### Database Backup and Recovery

```bash
# Backup SQLite
cp prisma/production.db backup/production-$(date +%Y%m%d).db

# Backup PostgreSQL
pg_dump -h localhost -U app_user billion_dollar_idea > backup/production-$(date +%Y%m%d).sql

# Restore PostgreSQL
psql -h localhost -U app_user billion_dollar_idea < backup/production-20240101.sql
```

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Custom Certificates

Update `nginx.conf` with your certificate paths:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # ... rest of configuration
}
```

## Monitoring and Logging

### Application Monitoring

The application includes built-in monitoring endpoints:

- Health check: `GET /health`
- Metrics: `GET /api/metrics/errors`, `GET /api/metrics/database`
- Application info: `GET /api`

### External Monitoring

#### Prometheus + Grafana

```bash
# Start monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana at http://localhost:3001
# Default credentials: admin/admin
```

#### Custom Monitoring

```javascript
// Custom monitoring integration
const monitoring = require('./src/utils/Monitoring');

// Record custom metrics
monitoring.recordMetric('custom_metric', 100);
monitoring.recordPerformance('operation_name', 1500, true);
```

### Log Management

#### Centralized Logging

```bash
# Using ELK Stack
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  elasticsearch:7.14.0

docker run -d \
  --name kibana \
  -p 5601:5601 \
  --link elasticsearch:elasticsearch \
  kibana:7.14.0

# Configure application to send logs to Elasticsearch
LOG_STRUCTURED=true
LOG_ELASTICSEARCH_URL=http://localhost:9200
```

#### Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/billion-dollar-idea

/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        docker kill -s USR1 billion-dollar-idea-app
    endscript
}
```

## Performance Optimization

### Application Tuning

```bash
# Environment variables for performance
NODE_OPTIONS="--max-old-space-size=2048"
UV_THREADPOOL_SIZE=16
REQUEST_TIMEOUT=30000
RATE_LIMIT_MAX_REQUESTS=100
```

### Database Optimization

```sql
-- PostgreSQL optimization
CREATE INDEX CONCURRENTLY idx_projects_user_id ON projects(user_id);
CREATE INDEX CONCURRENTLY idx_tasks_project_id ON tasks(project_id);
CREATE INDEX CONCURRENTLY idx_artifacts_project_id ON artifacts(project_id);

-- Analyze tables
ANALYZE projects;
ANALYZE tasks;
ANALYZE artifacts;
```

### Caching

```bash
# Redis for caching (optional)
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine

# Update application configuration
REDIS_URL=redis://localhost:6379
ENABLE_CACHING=true
```

## Security Hardening

### Application Security

```bash
# Environment variables for security
CORS_CREDENTIALS=false
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
REQUEST_TIMEOUT=30000
ENABLE_SECURITY_HEADERS=true
```

### System Security

```bash
# Firewall configuration
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for SSH protection
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Container Security

```dockerfile
# Use non-root user in Dockerfile
USER nodejs

# Read-only filesystem
docker run --read-only --tmpfs /tmp --tmpfs /app/logs billion-dollar-idea-platform
```

## Backup and Disaster Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
if [ "$DATABASE_TYPE" = "postgresql" ]; then
    pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$DATE.sql"
else
    cp prisma/production.db "$BACKUP_DIR/db_$DATE.db"
fi

# Application data backup
tar -czf "$BACKUP_DIR/app_data_$DATE.tar.gz" prisma/ logs/

# Upload to cloud storage (example: AWS S3)
aws s3 cp "$BACKUP_DIR/" s3://your-backup-bucket/billion-dollar-idea/ --recursive

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql" -o -name "*.db" -o -name "*.tar.gz" -mtime +30 -delete
```

### Disaster Recovery Plan

1. **Data Recovery**: Restore from latest backup
2. **Service Recovery**: Redeploy using Docker Compose or Kubernetes
3. **DNS Failover**: Update DNS to point to backup infrastructure
4. **Monitoring**: Verify all services are operational

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Common causes:
# - Database connection issues
# - Missing environment variables
# - Port conflicts
# - Insufficient resources
```

#### High Memory Usage

```bash
# Monitor memory usage
docker stats

# Optimize Node.js memory
NODE_OPTIONS="--max-old-space-size=1024"

# Check for memory leaks
npm install -g clinic
clinic doctor -- node dist/index.js
```

#### Slow Performance

```bash
# Check system resources
htop
iostat -x 1

# Monitor application metrics
curl http://localhost:3000/api/metrics/database

# Check Ollama service
curl http://localhost:11434/api/tags
```

#### Database Issues

```bash
# Check database connection
npm run db:generate

# Reset database (development only)
rm prisma/dev.db
npm run db:push
npm run db:seed

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/api/metrics/database

# Ollama health
curl http://localhost:11434/api/tags
```

### Performance Monitoring

```bash
# Application metrics
curl http://localhost:3000/api/metrics/errors

# System metrics
curl http://localhost:9090/metrics  # Prometheus

# Custom monitoring
node -e "
const monitoring = require('./dist/utils/Monitoring');
console.log(monitoring.getHealthStatus());
"
```

## Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**: Monthly security updates
2. **Database Maintenance**: Weekly optimization and cleanup
3. **Log Rotation**: Daily log cleanup
4. **Backup Verification**: Weekly backup testing
5. **Security Scanning**: Monthly vulnerability scans
6. **Performance Review**: Monthly performance analysis

### Update Procedures

```bash
# Update application
git pull origin main
docker-compose build
docker-compose up -d

# Update dependencies
npm audit fix
npm update

# Database migrations
npm run db:generate
npm run db:push
```

This deployment guide provides comprehensive instructions for deploying the Billion Dollar Idea Platform in various environments. Choose the deployment method that best fits your infrastructure and requirements.