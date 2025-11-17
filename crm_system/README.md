# 1. Docker servislerini başlat (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 2. Backend'i çalıştır (yeni terminal)
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run prisma:seed && npm run dev

# 3. Frontend'i çalıştır (yeni terminal)
cd frontend && npm install && npm run dev






bash# Backend container'ına gir
docker exec -it crm_backend sh

# Migration çalıştır
npx prisma migrate deploy

# Seed data ekle (demo kullanıcılar ve şirketler)
npm run prisma:seed

# Container'dan çık
exit
```

### 4. Tarayıcıda Aç
```
http://localhost:3000
```

### 5. Login
```
Email: admin@crm.com
Password: admin123
