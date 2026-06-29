# Deployment

Docker and Alibaba Cloud ECS deployment for HireFlow AI.

| File | Description |
|------|-------------|
| [Dockerfile](./Dockerfile) | Multi-stage build (frontend + backend) |
| [docker-compose.yml](./docker-compose.yml) | Local and ECS compose stack |
| [nginx.conf](./nginx.conf) | Frontend nginx config |
| [alibaba-ecs-setup.md](./alibaba-ecs-setup.md) | **Full ECS deployment guide** |

Quick start (local):

```bash
docker compose -f deploy/docker-compose.yml up --build
```

Dashboard: http://localhost · API: http://localhost:8000/health
