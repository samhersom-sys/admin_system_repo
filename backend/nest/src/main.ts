import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local from project root (two levels up from backend/nest/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global API prefix — all routes at /api/*
  app.setGlobalPrefix('api')

  // CORS — permissive in dev, restrict via CORS_ORIGINS in production
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (process.env.NODE_ENV === 'production' && corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true })
    console.log(`[CORS] Production allowlist: ${corsOrigins.join(', ')}`)
  } else {
    app.enableCors()
  }

  const port = process.env.PORT || 5000
  await app.listen(port, '127.0.0.1')
  console.log(`[Server] PolicyForge backend running on http://127.0.0.1:${port}`)
}

bootstrap()
