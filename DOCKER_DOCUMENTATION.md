# EasyFr8 Docker Documentation

**Verified:** 2026-08-04  
**Docker Compose Version:** 3.8 (obsolete attribute — remove `version` line)  
**Docker Engine:** Docker Desktop for Windows

---

## Services

### 1. `mysql` — MySQL 8 Database

| Property | Value |
|----------|-------|
| Image | `mysql:8` |
| Container Name | `easyfr8_mysql` |
| Restart Policy | `always` |
| Host Port | `3306` |
| Container Port | `3306` |
| Network | `easyfr8_network` |
| Volume | `mysql_data:/var/lib/mysql` |

**Environment Variables:**
```
MYSQL_ROOT_PASSWORD: rootpassword
MYSQL_DATABASE: easyfr8
MYSQL_USER: easyfr8
MYSQL_PASSWORD: easyfr8_password
```

**Health Check:**
```
Test: mysqladmin ping -h localhost -uroot -prootpassword
Interval: 5s
Timeout: 5s
Retries: 10
Start Period: 10s
```

**Schema Init:** `./easyfr8_admin/lib/schema.sql` is mounted to `/docker-entrypoint-initdb.d/schema.sql` and executed on first container start.

---

### 2. `easyfr8_admin` — Next.js Admin Application

| Property | Value |
|----------|-------|
| Image | Built locally from `./easyfr8_admin/Dockerfile` |
| Container Name | `easyfr8_admin` |
| Restart Policy | `always` |
| Host Port | `3001` |
| Container Port | `3001` |
| Network | `easyfr8_network` |
| Volume | `uploads_data:/app/uploads` |
| Depends On | `mysql` (condition: service_healthy) |

**Build Args:**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
API_URL=http://localhost:3001
```

**Runtime Environment:** Loaded from `.env.docker`

---

### 3. `phpmyadmin` — Database Management UI

| Property | Value |
|----------|-------|
| Image | `phpmyadmin:latest` |
| Container Name | `easyfr8_phpmyadmin` |
| Restart Policy | `always` |
| Host Port | `8088` |
| Container Port | `80` |
| Network | `easyfr8_network` |
| Depends On | `mysql` (condition: service_healthy) |

**Environment Variables:**
```
PMA_HOST: mysql
PMA_PORT: 3306
PMA_USER: root
PMA_PASSWORD: rootpassword
```

**Access URL:** http://localhost:8088

---

### 4. `easyfr8_user` — React User Panel ⚠️ DISABLED

```yaml
# CURRENTLY COMMENTED OUT in docker-compose.yml
# easyfr8_user:
#   build:
#     context: ./easyfr8 react
#     dockerfile: Dockerfile
#   container_name: easyfr8_user
#   restart: always
#   ports:
#     - "3000:80"
#   depends_on:
#     - easyfr8_admin
#   networks:
#     - easyfr8_network
```

**Current Status:** React app runs via `npm run dev` on host port 3000.

---

## Volumes

| Volume | Mount Path | Purpose |
|--------|------------|---------|
| `mysql_data` | `/var/lib/mysql` (inside mysql container) | MySQL data persistence |
| `uploads_data` | `/app/uploads` (inside admin container) | Uploaded media files |

**Note:** Volumes persist across container restarts and `docker compose down`. Use `docker compose down -v` to destroy volumes (destructive — will lose DB data and uploads).

---

## Networks

| Network | Driver | Purpose |
|---------|--------|---------|
| `easyfr8_network` | `bridge` | Isolated internal network for all services |

All services communicate via service name (e.g., `mysql` not `localhost`).

---

## Dockerfile — Admin Panel

Located at `easyfr8_admin/Dockerfile`.

**3-stage multi-stage build:**

```dockerfile
# Stage 1: deps — Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: builder — Build Next.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: runner — Production server
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"
COPY --from=builder /app ./
EXPOSE 3001
CMD ["npm", "run", "start"]
```

**Image Size Note:** Uses Alpine-based Node 20 for minimal footprint.

---

## Dockerfile — React User Panel

Located at `easyfr8 react/Dockerfile`.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Config** handles React SPA routing (all routes serve `index.html`).

---

## Common Docker Commands

```bash
# Start all services
docker compose up -d

# Rebuild admin and restart
docker compose up --build -d easyfr8_admin

# View all container statuses
docker compose ps

# View admin logs
docker compose logs -f easyfr8_admin

# View MySQL logs
docker compose logs -f mysql

# Access MySQL shell
docker compose exec mysql mysql -uroot -prootpassword easyfr8

# Stop all services (keeps volumes)
docker compose down

# Stop and destroy all data (DESTRUCTIVE)
docker compose down -v

# Check health
docker compose exec mysql mysqladmin ping -uroot -prootpassword
```

---

## Port Summary

| Service | Host Port | Container Port | URL |
|---------|-----------|----------------|-----|
| Admin Panel | 3001 | 3001 | http://localhost:3001 |
| MySQL | 3306 | 3306 | mysql://localhost:3306 |
| phpMyAdmin | 8088 | 80 | http://localhost:8088 |
| React (local) | 3000 | N/A | http://localhost:3000 |

**⚠️ Note:** Port 8080 was previously used but conflicted with EnterpriseDB/PostgreSQL. Changed to 8088.

---

## Environment Variables Reference

### `.env.docker` (used by easyfr8_admin in Docker)

| Variable | Value | Required |
|----------|-------|---------|
| NODE_ENV | production | Yes |
| PORT | 3001 | Yes |
| DB_HOST | mysql | Yes (service name) |
| DB_PORT | 3306 | Yes |
| DB_DATABASE | easyfr8 | Yes |
| DB_USERNAME | easyfr8 | Yes |
| DB_PASSWORD | easyfr8_password | Yes |
| JWT_SECRET | easyfr8_secret_key | Yes |
| NEXT_PUBLIC_API_BASE_URL | http://localhost:3001/api | Yes |
| NEXT_PUBLIC_BASE_URL | http://localhost:3001 | Yes |
| UPLOAD_PATH | uploads | Yes |
| IMAGE_URL | http://localhost:3001/images | Yes |
| USER_PANEL_URL | http://localhost:3000 | Optional |

---

## Health Check Status

Verified at 2026-08-04 15:04 IST:

```
easyfr8_admin    — Up 5+ minutes
easyfr8_mysql    — Up ~1 hour (healthy)
easyfr8_phpmyadmin — Up ~1 hour
```

---

## Troubleshooting

### MySQL container not starting
```bash
docker compose logs mysql
# Look for: "MySQL init process done. Ready for start up."
```

### Admin can't connect to MySQL (ETIMEDOUT)
- Ensure admin `depends_on: mysql: condition: service_healthy`
- Confirm DB_HOST=mysql (not localhost) in .env.docker
- Wait for MySQL health check to pass before admin starts

### Port conflict on 8088
```powershell
# Check what's using port 8088 on Windows
netstat -ano | findstr :8088
```

### Rebuild admin after code changes
```bash
docker compose up --build -d easyfr8_admin
```
