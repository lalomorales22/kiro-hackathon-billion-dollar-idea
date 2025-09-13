# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the Billion Dollar Idea Platform. It covers common issues, diagnostic procedures, and resolution steps for various components of the system.

## Quick Diagnostic Commands

### System Health Check

```bash
# Check application health
curl -f http://localhost:3000/health || echo "Application unhealthy"

# Check Ollama service
curl -f http://localhost:11434/api/tags || echo "Ollama service unavailable"

# Check database connection
npm run db:generate || echo "Database connection failed"

# Check logs for errors
docker-compose logs --tail=50 app | grep -i error

# Check system resources
docker stats --no-stream
```

### Service Status Check

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f app
docker-compose logs -f ollama

# Check container resource usage
docker stats
```

## Common Issues and Solutions

### 1. Application Startup Issues

#### Issue: Application fails to start

**Symptoms:**
- Container exits immediately
- "Connection refused" errors
- Port binding failures

**Diagnostic Steps:**
```bash
# Check container logs
docker-compose logs app

# Check port availability
netstat -tulpn | grep :3000

# Check environment variables
docker-compose exec app env | grep -E "(NODE_ENV|DATABASE_URL|OLLAMA_BASE_URL)"

# Check file permissions
ls -la prisma/
```

**Common Causes and Solutions:**

1. **Port Already in Use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill the process or change port
   export PORT=3001
   docker-compose up -d
   ```

2. **Database Connection Issues**
   ```bash
   # Check database file permissions
   ls -la prisma/dev.db
   
   # Recreate database
   rm prisma/dev.db
   npm run db:push
   npm run db:seed
   ```

3. **Missing Environment Variables**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit with correct values
   nano .env
   ```

4. **Insufficient Resources**
   ```bash
   # Check available memory
   free -h
   
   # Increase Docker memory limit
   # Docker Desktop: Settings > Resources > Memory
   ```

#### Issue: Database migration failures

**Symptoms:**
- Prisma migration errors
- Schema mismatch warnings
- Database connection timeouts

**Diagnostic Steps:**
```bash
# Check database status
npm run db:generate

# Verify schema
npx prisma db pull

# Check database file
file prisma/dev.db
sqlite3 prisma/dev.db ".tables"
```

**Solutions:**
```bash
# Reset database (development only)
rm prisma/dev.db
npm run db:push
npm run db:seed

# Force migration
npx prisma migrate reset --force

# Manual schema sync
npx prisma db push --force-reset
```

### 2. Ollama Service Issues

#### Issue: Ollama service unavailable

**Symptoms:**
- Agent execution failures
- "Connection refused" to Ollama
- Model loading errors

**Diagnostic Steps:**
```bash
# Check Ollama service status
curl http://localhost:11434/api/tags

# Check Ollama container logs
docker-compose logs ollama

# Check model availability
docker-compose exec ollama ollama list

# Test model directly
docker-compose exec ollama ollama run gpt-oss:20b "Hello, world!"
```

**Solutions:**

1. **Service Not Running**
   ```bash
   # Start Ollama service
   docker-compose up -d ollama
   
   # Check service health
   docker-compose exec ollama ollama --version
   ```

2. **Model Not Downloaded**
   ```bash
   # Pull the required model
   docker-compose exec ollama ollama pull gpt-oss:20b
   
   # Verify model installation
   docker-compose exec ollama ollama list
   ```

3. **Insufficient Resources**
   ```bash
   # Check available memory (model needs ~12GB)
   free -h
   
   # Use smaller model for testing
   docker-compose exec ollama ollama pull llama2:7b
   
   # Update environment variable
   export OLLAMA_MODEL=llama2:7b
   ```

4. **Network Connectivity Issues**
   ```bash
   # Check network connectivity
   docker-compose exec app ping ollama
   
   # Check service discovery
   docker-compose exec app nslookup ollama
   
   # Restart networking
   docker-compose down
   docker-compose up -d
   ```

#### Issue: Slow AI response times

**Symptoms:**
- Agent execution timeouts
- High response latencies
- Performance degradation

**Diagnostic Steps:**
```bash
# Check system resources
htop
iostat -x 1

# Monitor Ollama performance
docker stats ollama

# Check model performance
time docker-compose exec ollama ollama run gpt-oss:20b "Test prompt"

# Check application metrics
curl http://localhost:3000/api/metrics/database
```

**Solutions:**
```bash
# Increase timeout values
export REQUEST_TIMEOUT=60000

# Use GPU acceleration (if available)
docker-compose -f docker-compose.gpu.yml up -d

# Optimize model parameters
docker-compose exec ollama ollama run gpt-oss:20b --num-ctx 2048

# Scale resources
docker-compose up -d --scale ollama=2
```

### 3. Database Issues

#### Issue: Database connection failures

**Symptoms:**
- "Database connection failed" errors
- Query timeouts
- Connection pool exhaustion

**Diagnostic Steps:**
```bash
# Check database file
ls -la prisma/dev.db

# Test database connection
npm run db:generate

# Check database integrity
sqlite3 prisma/dev.db "PRAGMA integrity_check;"

# Monitor database metrics
curl http://localhost:3000/api/metrics/database
```

**Solutions:**

1. **File Permission Issues**
   ```bash
   # Fix permissions
   chmod 664 prisma/dev.db
   chown $USER:$USER prisma/dev.db
   
   # Recreate with correct permissions
   rm prisma/dev.db
   npm run db:push
   ```

2. **Database Corruption**
   ```bash
   # Check integrity
   sqlite3 prisma/dev.db "PRAGMA integrity_check;"
   
   # Backup and recreate
   cp prisma/dev.db prisma/dev.db.backup
   rm prisma/dev.db
   npm run db:push
   npm run db:seed
   ```

3. **Connection Pool Issues**
   ```bash
   # Restart application
   docker-compose restart app
   
   # Check for connection leaks
   docker-compose logs app | grep -i "connection"
   ```

#### Issue: Database performance problems

**Symptoms:**
- Slow query execution
- High database CPU usage
- Query timeouts

**Diagnostic Steps:**
```bash
# Analyze query performance
sqlite3 prisma/dev.db "EXPLAIN QUERY PLAN SELECT * FROM projects;"

# Check database size
du -h prisma/dev.db

# Monitor database metrics
curl http://localhost:3000/api/metrics/database
```

**Solutions:**
```bash
# Optimize database
sqlite3 prisma/dev.db "VACUUM;"
sqlite3 prisma/dev.db "ANALYZE;"

# Add indexes (if missing)
sqlite3 prisma/dev.db "CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(userId);"

# Consider PostgreSQL for production
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"
npm run db:push
```

### 4. WebSocket Issues

#### Issue: WebSocket connection failures

**Symptoms:**
- Real-time updates not working
- Connection refused errors
- Frequent disconnections

**Diagnostic Steps:**
```bash
# Test WebSocket connection
wscat -c ws://localhost:3000/ws

# Check WebSocket logs
docker-compose logs app | grep -i websocket

# Monitor connection metrics
curl http://localhost:3000/api/metrics/errors
```

**Solutions:**

1. **Connection Issues**
   ```bash
   # Check firewall settings
   sudo ufw status
   
   # Test with different client
   node -e "
   const WebSocket = require('ws');
   const ws = new WebSocket('ws://localhost:3000/ws');
   ws.on('open', () => console.log('Connected'));
   ws.on('error', (err) => console.error('Error:', err));
   "
   ```

2. **Proxy Configuration**
   ```nginx
   # Update nginx.conf for WebSocket support
   location /ws {
       proxy_pass http://app:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

3. **Client-Side Issues**
   ```javascript
   // Implement reconnection logic
   function connectWebSocket() {
       const ws = new WebSocket('ws://localhost:3000/ws');
       
       ws.onclose = function() {
           setTimeout(connectWebSocket, 5000);
       };
       
       return ws;
   }
   ```

### 5. Agent Execution Issues

#### Issue: Agent execution failures

**Symptoms:**
- Tasks stuck in "PENDING" status
- Agent timeout errors
- Incomplete project processing

**Diagnostic Steps:**
```bash
# Check agent status
curl http://localhost:3000/api/agents/stats

# Monitor agent execution
docker-compose logs app | grep -i agent

# Check specific project status
curl http://localhost:3000/api/projects/PROJECT_ID
```

**Solutions:**

1. **Agent Loading Issues**
   ```bash
   # Reseed agents
   npm run db:seed
   
   # Check agent registry
   curl http://localhost:3000/api/agents
   
   # Restart application
   docker-compose restart app
   ```

2. **Execution Timeouts**
   ```bash
   # Increase timeout values
   export AGENT_TIMEOUT=300000
   
   # Check system resources
   docker stats
   
   # Restart stuck executions
   curl -X POST http://localhost:3000/api/projects/PROJECT_ID/restart
   ```

3. **Prompt Issues**
   ```bash
   # Check agent prompts
   sqlite3 prisma/dev.db "SELECT name, prompt FROM agents WHERE isActive = 1;"
   
   # Test prompt directly
   docker-compose exec ollama ollama run gpt-oss:20b "Your prompt here"
   ```

### 6. Performance Issues

#### Issue: High memory usage

**Symptoms:**
- Out of memory errors
- Slow response times
- Container restarts

**Diagnostic Steps:**
```bash
# Check memory usage
docker stats --no-stream

# Monitor application memory
docker-compose exec app node -e "console.log(process.memoryUsage())"

# Check for memory leaks
docker-compose logs app | grep -i "memory"
```

**Solutions:**
```bash
# Increase container memory limits
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=1024"

# Restart services periodically
docker-compose restart app
```

#### Issue: High CPU usage

**Symptoms:**
- Slow response times
- High system load
- Performance degradation

**Diagnostic Steps:**
```bash
# Check CPU usage
htop
docker stats

# Profile application
npm install -g clinic
clinic doctor -- node dist/index.js
```

**Solutions:**
```bash
# Limit CPU usage
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'

# Optimize concurrent processing
export UV_THREADPOOL_SIZE=4

# Scale horizontally
docker-compose up -d --scale app=2
```

### 7. Network Issues

#### Issue: Service communication failures

**Symptoms:**
- "Connection refused" between services
- DNS resolution failures
- Intermittent connectivity

**Diagnostic Steps:**
```bash
# Check network connectivity
docker-compose exec app ping ollama
docker-compose exec app ping db

# Check DNS resolution
docker-compose exec app nslookup ollama

# Check network configuration
docker network ls
docker network inspect billion-dollar-idea-platform_default
```

**Solutions:**
```bash
# Recreate network
docker-compose down
docker-compose up -d

# Use explicit network configuration
# docker-compose.yml
networks:
  app_network:
    driver: bridge

services:
  app:
    networks:
      - app_network
```

#### Issue: External API connectivity

**Symptoms:**
- External service timeouts
- DNS resolution failures
- SSL certificate errors

**Diagnostic Steps:**
```bash
# Test external connectivity
docker-compose exec app curl -I https://api.example.com

# Check DNS resolution
docker-compose exec app nslookup api.example.com

# Test SSL certificates
docker-compose exec app openssl s_client -connect api.example.com:443
```

**Solutions:**
```bash
# Configure DNS servers
# docker-compose.yml
services:
  app:
    dns:
      - 8.8.8.8
      - 8.8.4.4

# Add proxy configuration
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Update CA certificates
docker-compose exec app update-ca-certificates
```

## Monitoring and Diagnostics

### Health Check Endpoints

```bash
# Application health
curl http://localhost:3000/health

# Detailed health information
curl http://localhost:3000/api/health

# Error metrics
curl http://localhost:3000/api/metrics/errors

# Database metrics
curl http://localhost:3000/api/metrics/database

# Agent statistics
curl http://localhost:3000/api/agents/stats
```

### Log Analysis

#### Application Logs
```bash
# View recent logs
docker-compose logs --tail=100 app

# Follow logs in real-time
docker-compose logs -f app

# Filter error logs
docker-compose logs app | grep -i error

# Search for specific patterns
docker-compose logs app | grep "project.*failed"
```

#### System Logs
```bash
# System resource usage
dmesg | grep -i "out of memory"

# Docker daemon logs
journalctl -u docker.service --since "1 hour ago"

# Container events
docker events --since "1h"
```

### Performance Monitoring

#### Resource Monitoring
```bash
# Real-time resource usage
htop

# I/O statistics
iostat -x 1

# Network statistics
netstat -i

# Disk usage
df -h
du -sh /var/lib/docker/
```

#### Application Metrics
```bash
# Response time testing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/projects

# Load testing
ab -n 100 -c 10 http://localhost:3000/api/projects

# WebSocket testing
wscat -c ws://localhost:3000/ws
```

## Recovery Procedures

### Service Recovery

#### Application Recovery
```bash
# Graceful restart
docker-compose restart app

# Force restart
docker-compose kill app
docker-compose up -d app

# Complete rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Database Recovery
```bash
# Backup current database
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
cp prisma/dev.db.backup.20240101_120000 prisma/dev.db

# Recreate database
rm prisma/dev.db
npm run db:push
npm run db:seed
```

#### Ollama Recovery
```bash
# Restart Ollama service
docker-compose restart ollama

# Redownload model
docker-compose exec ollama ollama pull gpt-oss:20b

# Clear model cache
docker-compose exec ollama rm -rf ~/.ollama/models
docker-compose restart ollama
docker-compose exec ollama ollama pull gpt-oss:20b
```

### Data Recovery

#### Project Data Recovery
```bash
# Export project data
sqlite3 prisma/dev.db ".dump projects" > projects_backup.sql

# Import project data
sqlite3 prisma/dev.db < projects_backup.sql

# Verify data integrity
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM projects;"
```

#### Agent Configuration Recovery
```bash
# Re-seed agents
npm run db:seed

# Verify agent loading
curl http://localhost:3000/api/agents/stats

# Manual agent verification
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM agents WHERE isActive = 1;"
```

## Prevention and Best Practices

### Monitoring Setup

#### Automated Health Checks
```bash
# Create health check script
cat > health_check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Application unhealthy, restarting..."
    docker-compose restart app
fi
EOF

# Schedule health checks
crontab -e
# Add: */5 * * * * /path/to/health_check.sh
```

#### Log Rotation
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/docker-containers

/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size 10M
    missingok
    delaycompress
    copytruncate
}
```

### Backup Procedures

#### Automated Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
cp prisma/dev.db "$BACKUP_DIR/db_$DATE.db"

# Configuration backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" .env docker-compose.yml

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.db" -o -name "*.tar.gz" -mtime +30 -delete
EOF

# Schedule backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Security Hardening

#### Container Security
```bash
# Run containers as non-root
# Dockerfile
USER nodejs

# Use read-only filesystem
docker run --read-only --tmpfs /tmp billion-dollar-idea-platform

# Limit resources
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
```

#### Network Security
```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Block direct access
sudo ufw enable

# Use internal networks
# docker-compose.yml
networks:
  internal:
    internal: true
```

## Emergency Procedures

### Complete System Recovery

#### Full System Restore
```bash
# Stop all services
docker-compose down -v

# Remove all containers and images
docker system prune -a --volumes

# Restore from backup
git pull origin main
cp backup/.env .env
cp backup/prisma/dev.db prisma/dev.db

# Rebuild and start
docker-compose build --no-cache
docker-compose up -d

# Verify system health
curl http://localhost:3000/health
```

#### Disaster Recovery Checklist

1. **Assess the situation**
   - Identify affected components
   - Determine data loss extent
   - Estimate recovery time

2. **Immediate actions**
   - Stop affected services
   - Preserve logs and evidence
   - Notify stakeholders

3. **Recovery steps**
   - Restore from backups
   - Rebuild affected components
   - Verify data integrity
   - Test system functionality

4. **Post-recovery**
   - Document incident
   - Update procedures
   - Implement preventive measures

### Contact Information

For critical issues requiring immediate attention:

- **System Administrator**: [admin@company.com]
- **Development Team**: [dev-team@company.com]
- **Emergency Hotline**: [+1-555-0123]

### Escalation Procedures

1. **Level 1**: Self-service using this guide
2. **Level 2**: Contact system administrator
3. **Level 3**: Engage development team
4. **Level 4**: Emergency response team

This troubleshooting guide should help resolve most common issues with the Billion Dollar Idea Platform. Keep this document updated as new issues are discovered and resolved.