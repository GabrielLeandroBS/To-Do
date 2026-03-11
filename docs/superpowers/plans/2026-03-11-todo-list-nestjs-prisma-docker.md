# To-Do List NestJS + Prisma + Docker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma API REST de To-Do List com NestJS, Prisma ORM, PostgreSQL e Docker Compose.

**Architecture:** A aplicação NestJS expõe endpoints CRUD para gerenciar tarefas. O Prisma serve como ORM para comunicar com o PostgreSQL. O Docker Compose orquestra dois serviços: a aplicação Node e o banco PostgreSQL.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL 16, Docker Compose, pnpm

---

## Chunk 1: Infraestrutura (Docker + Prisma setup)

### Task 1: Criar Dockerfile e docker-compose.yml

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env`
- Modify: `.gitignore` (se existir, senão criar)

- [ ] **Step 1: Criar o Dockerfile**

```dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Criar o docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: todo_user
      POSTGRES_PASSWORD: todo_pass
      POSTGRES_DB: todo_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo_user -d todo_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://todo_user:todo_pass@postgres:5432/todo_db
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && node dist/main"

volumes:
  postgres_data:
```

- [ ] **Step 3: Criar o .env**

```env
DATABASE_URL="postgresql://todo_user:todo_pass@localhost:5432/todo_db"
```

- [ ] **Step 4: Garantir que .env está no .gitignore**

Se não existir `.gitignore`, criar com conteúdo:
```
node_modules/
dist/
.env
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .env .gitignore
git commit -m "feat: add Docker and docker-compose setup with PostgreSQL"
```

---

### Task 2: Instalar e configurar o Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Instalar dependências do Prisma**

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

- [ ] **Step 2: Inicializar o Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Isso cria `prisma/schema.prisma` e `.env`. Verificar se o `.env` foi sobrescrito, e restaurar se necessário:
```env
DATABASE_URL="postgresql://todo_user:todo_pass@localhost:5432/todo_db"
```

- [ ] **Step 3: Definir o modelo Todo no schema.prisma**

Substituir o conteúdo de `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id        Int      @id @default(autoincrement())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma package.json pnpm-lock.yaml
git commit -m "feat: add Prisma with Todo model"
```

---

### Task 3: Criar PrismaModule e PrismaService

**Files:**
- Create: `src/prisma/prisma.service.ts`
- Create: `src/prisma/prisma.module.ts`

- [ ] **Step 1: Criar PrismaService**

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 2: Criar PrismaModule**

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Registrar PrismaModule no AppModule**

Modificar `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add src/prisma/ src/app.module.ts
git commit -m "feat: add PrismaModule and PrismaService"
```

---

## Chunk 2: Feature Todos (CRUD)

### Task 4: Criar DTOs para Todos

**Files:**
- Create: `src/todos/dto/create-todo.dto.ts`
- Create: `src/todos/dto/update-todo.dto.ts`

- [ ] **Step 1: Instalar class-validator e class-transformer**

```bash
pnpm add class-validator class-transformer
```

- [ ] **Step 2: Habilitar ValidationPipe global em main.ts**

Modificar `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 3: Criar CreateTodoDto**

```typescript
// src/todos/dto/create-todo.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
```

- [ ] **Step 4: Criar UpdateTodoDto**

```typescript
// src/todos/dto/update-todo.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTodoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/todos/dto/ src/main.ts package.json pnpm-lock.yaml
git commit -m "feat: add Todo DTOs and global ValidationPipe"
```

---

### Task 5: Criar TodosService

**Files:**
- Create: `src/todos/todos.service.ts`

- [ ] **Step 1: Criar o TodosService com os 4 métodos CRUD**

```typescript
// src/todos/todos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.todo.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo #${id} not found`);
    return todo;
  }

  create(dto: CreateTodoDto) {
    return this.prisma.todo.create({ data: dto });
  }

  async update(id: number, dto: UpdateTodoDto) {
    await this.findOne(id);
    return this.prisma.todo.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.todo.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/todos/todos.service.ts
git commit -m "feat: add TodosService with CRUD methods"
```

---

### Task 6: Criar TodosController e TodosModule

**Files:**
- Create: `src/todos/todos.controller.ts`
- Create: `src/todos/todos.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Criar TodosController**

```typescript
// src/todos/todos.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll() {
    return this.todosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTodoDto) {
    return this.todosService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTodoDto) {
    return this.todosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.remove(id);
  }
}
```

- [ ] **Step 2: Criar TodosModule**

```typescript
// src/todos/todos.module.ts
import { Module } from '@nestjs/common';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
```

- [ ] **Step 3: Registrar TodosModule no AppModule**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TodosModule } from './todos/todos.module';

@Module({
  imports: [PrismaModule, TodosModule],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add src/todos/ src/app.module.ts
git commit -m "feat: add TodosController, TodosModule and wire up routes"
```

---

## Chunk 3: Migração e Verificação Final

### Task 7: Criar migration e testar localmente

**Files:**
- Create: `prisma/migrations/` (gerado automaticamente)

- [ ] **Step 1: Subir apenas o PostgreSQL via Docker**

```bash
docker compose up postgres -d
```

Aguardar o healthcheck passar:
```bash
docker compose ps
# postgres deve mostrar "healthy"
```

- [ ] **Step 2: Rodar a migration**

```bash
npx prisma migrate dev --name init
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied: 0001_init
```

- [ ] **Step 3: Verificar schema no banco (opcional)**

```bash
npx prisma studio
```

Abrir no browser e confirmar a tabela `Todo`.

- [ ] **Step 4: Iniciar a aplicação em modo dev**

```bash
pnpm start:dev
```

Expected: `Application is running on: http://localhost:3000`

- [ ] **Step 5: Testar endpoints com curl**

```bash
# Criar todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Meu primeiro todo"}'

# Listar todos
curl http://localhost:3000/todos

# Atualizar
curl -X PATCH http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Deletar
curl -X DELETE http://localhost:3000/todos/1
```

- [ ] **Step 6: Commit das migrations**

```bash
git add prisma/migrations/
git commit -m "feat: add initial Prisma migration"
```

---

### Task 8: Testar com Docker Compose completo

- [ ] **Step 1: Build e subir tudo**

```bash
docker compose up --build
```

- [ ] **Step 2: Testar endpoints apontando para o container**

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Todo via Docker"}'

curl http://localhost:3000/todos
```

Expected: lista com o todo criado.

- [ ] **Step 3: Parar os containers**

```bash
docker compose down
```

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "feat: complete To-Do API with NestJS, Prisma and Docker"
```

---

## Resumo dos Endpoints

| Método | Rota         | Descrição              |
|--------|-------------|------------------------|
| GET    | /todos      | Listar todos           |
| GET    | /todos/:id  | Buscar por ID          |
| POST   | /todos      | Criar novo todo        |
| PATCH  | /todos/:id  | Atualizar título/status|
| DELETE | /todos/:id  | Deletar todo           |
