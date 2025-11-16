# 1. Docker servislerini başlat (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 2. Backend'i çalıştır (yeni terminal)
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run prisma:seed && npm run dev

# 3. Frontend'i çalıştır (yeni terminal)
cd frontend && npm install && npm run dev
