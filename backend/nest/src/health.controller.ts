import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', server: 'cleaned-nest', timestamp: new Date().toISOString() }
  }
}
