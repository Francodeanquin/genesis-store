import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { LoginDto } from './dto/login.dto';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import type { RefreshAuthenticatedRequest } from './interfaces/refresh-authenticated-request.interface';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: AuthenticatedRequest,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = this.authService.login(req.user);
    res.cookie('access_token', (await tokens).access_token, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', (await tokens).refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;
    await this.authService.logout(user.id, user.type);

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return { success: true };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: RefreshAuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.email,
      user.role,
      user.type,
    );

    res.cookie('access_token', tokens.access_token, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('register-customer')
  registerCustomer(@Body() dto: CreateCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post('verify-email')
  verifyemail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }
}
