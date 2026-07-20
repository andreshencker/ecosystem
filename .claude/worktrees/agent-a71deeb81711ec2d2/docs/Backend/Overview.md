---
tags: [module, communication, backend]
---

# Communication Backend — Overview

## Purpose

The Communication Backend is a multi-tenant NestJS API that handles all outbound communication and file generation for the Invoice Platform. It is the only service currently implemented.

Responsibilities:
- Manage tenant (company) configuration: channels, providers, credentials, branding
- Deliver notifications via email and SMS through configurable third-party providers
- Generate files on demand: PDF, XLSX, CSV
- Store and retrieve media files via AWS S3
- Manage notification templates and event catalogues

**Service location:** `invoiceApp/communications-backend/`
**Port:** 3001
**Package name:** `communication-platform-api`
**Version:** 0.0.1

---

## Tech Stack

### Runtime & Framework

| Technology | Version | Role |
|---|---|---|
| Node.js | 20 (Alpine) | Runtime |
| TypeScript | 5.7.3 | Language |
| NestJS | 11.0.1 | Application framework |
| Express | via @nestjs/platform-express | HTTP transport |

### Database & Cache

| Technology | Version | Role |
|---|---|---|
| MongoDB Atlas | Cloud-managed | Primary datastore |
| Mongoose | 9.0.2 | ODM / schema layer |
| Redis | 7 (Alpine) | Queue backend |
| ioredis | 5.11.1 | Redis client |
| BullMQ | 5.78.0 | Job queue |

### Authentication & Security

| Technology | Version | Role |
|---|---|---|
| @nestjs/jwt | 11.x | JWT issuance and verification |
| passport + passport-jwt | 0.7 / 4.0 | JWT strategy |
| bcryptjs | 3.0.3 | Password hashing |
| Node.js crypto (built-in) | — | AES-256-GCM credential encryption |

### File Generation

| Technology | Version | Role |
|---|---|---|
| Puppeteer | 24.34.0 | Headless Chrome — PDF rendering |
| ExcelJS | 4.4.0 | XLSX generation |
| Native | — | CSV generation |

### Cloud & Storage

| Technology | Version | Role |
|---|---|---|
| @aws-sdk/client-s3 | 3.958.0 | S3 upload / download |
| @aws-sdk/s3-request-presigner | 3.958.0 | Presigned URL generation |

### Communication

| Technology | Version | Role |
|---|---|---|
| Nodemailer | 7.0.11 | Platform SMTP (verification, password reset) |

### API & Validation

| Technology | Version | Role |
|---|---|---|
| @nestjs/swagger | 11.2.3 | OpenAPI / Swagger docs |
| swagger-ui-express | 5.0.1 | Swagger UI |
| class-validator | 0.14.3 | DTO validation |
| class-transformer | 0.5.1 | DTO transformation |
| @nestjs/axios | 4.0.1 | HTTP client (outbound requests) |
| @nestjs/terminus | 11.1.1 | Health check endpoint |

### Development Tools

| Technology | Version | Role |
|---|---|---|
| Jest | 30.0.0 | Unit and e2e testing |
| Supertest | 7.0.0 | HTTP integration testing |
| ESLint | 9.18.0 | Linting |
| Prettier | 3.4.2 | Code formatting |
| ts-jest | 29.2.5 | TypeScript Jest transformer |

---

## Running Locally

**Prerequisites:** Docker, Node.js 20, a MongoDB Atlas connection string.

```bash
# 1. Start Redis
cd communication
docker compose up -d

# 2. Configure environment
cp .env.example .env
# Fill in MONGODB_URI, JWT secrets, CREDENTIALS_MASTER_KEY_BASE64 at minimum

# 3. Install dependencies
npm install

# 4. Start in watch mode
npm run start:dev
```

API is available at `http://localhost:3001`
Swagger docs at `http://localhost:3001/api`
Health check at `http://localhost:3001/health`

---

## npm Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch mode — recommended for development |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled output (`node dist/main`) |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Coverage report |
| `npm run lint` | ESLint with auto-fix |

---

## Related Docs

- [[Architecture]] — module structure, layers, queue architecture
- [[API]] — all endpoints grouped by controller
- [[Database]] — all MongoDB schemas and Redis usage
- [[Security]] — authentication, encryption, guards
- [[Environment]] — all environment variables
- [[Current Sprint]] — what is in progress now
- [[Backlog]] — what is planned for this service
