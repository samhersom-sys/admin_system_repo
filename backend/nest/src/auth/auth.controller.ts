import { Controller, Post, Put, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'
import { Roles } from './roles.decorator'

/**
 * AuthController — /api/auth
 *
 * POST /api/auth/login                — verify credentials, issue JWT
 * GET  /api/auth/me                   — return current user (protected)
 * POST /api/auth/logout               — invalidate token via token_version increment
 * POST /api/auth/refresh              — re-issue a fresh 30-min JWT (sliding session)
 * POST /api/auth/generate-reset-token — admin: generate a one-time password reset link
 * POST /api/auth/reset-password       — public: reset password using a reset token
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.id)
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any) {
    return this.authService.refresh(req.user)
  }

  @Post('generate-reset-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'internal_admin', 'client_admin')
  @HttpCode(HttpStatus.OK)
  async generateResetToken(@Body() body: { userId: number }, @Req() req: any) {
    return this.authService.generateResetToken(req.user.id, body.userId)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword)
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Body() body: { name: string }, @Req() req: any) {
    return this.authService.updateProfile(req.user.id, body.name)
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: any,
  ) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword)
  }
}
