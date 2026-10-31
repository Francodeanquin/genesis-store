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
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import type { RefreshAuthenticatedRequest } from './interfaces/refresh-authenticated-request.interface';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { Public } from './decorators/public.decorator';
import { SkipPasswordCheck } from './decorators/skip-password-check.decorator';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Log in',
    description:
      'Sets access_token and refresh_token as httpOnly cookies. If the account is Staff, registers a check-in or reuses an already-open one (BR-22). Returns 403 if a Customer account has not verified its email (BR-27).',
  })
  @Public()
  @SkipPasswordCheck()
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

  @ApiOperation({
    summary: 'Log out',
    description:
      'Clears the auth cookies. If the account is Staff, registers the check-out on the open attendance record (BR-22).',
  })
  @ApiCookieAuth('access_token')
  @SkipPasswordCheck()
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

  @ApiOperation({
    summary: 'Refresh the access token',
    description:
      'Reads the refresh_token cookie (not the expired access token) and issues a new pair of cookies.',
  })
  @Public()
  @SkipPasswordCheck()
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

  @ApiOperation({
    summary: 'Register a Customer account',
    description:
      'Creates the account with emailVerified = false and sends a verification email via Resend (BR-05, BR-27).',
  })
  @Public()
  @Post('register-customer')
  registerCustomer(@Body() dto: CreateCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @ApiOperation({
    summary: 'Verify an email address',
    description:
      'Confirms the initial registration email, or a pending_email set from a profile update (BR-27).',
  })
  @Public()
  @Post('verify-email')
  verifyemail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @ApiOperation({
    summary: 'Request a password reset email (Customer)',
    description:
      'Always returns a generic success message, whether or not the email exists, to avoid leaking account existence (BR-23).',
  })
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({
    summary: 'Reset a Customer password with a token',
    description:
      'Validates the reset token and the new password against the complexity policy (BR-03, BR-23).',
  })
  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
