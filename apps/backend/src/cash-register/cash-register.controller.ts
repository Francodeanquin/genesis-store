import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OpenCashRegisterDto } from './dto/open-cash.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { GetAllCashRegisterDto } from './dto/get-all-cash-register.dto';

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('open')
  openCashRegister(
    @Body() dto: OpenCashRegisterDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.cashRegisterService.openCashRegister(
      dto.openingAmount,
      req.user.id,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('close')
  closeCashRegister(
    @Body() dto: CloseCashRegisterDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.cashRegisterService.closeCashRegister(
      dto.physicalClosingAmount,
      req.user.id,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('')
  getCashRegisters(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetAllCashRegisterDto,
  ) {
    return this.cashRegisterService.getAllCashRegisters(query);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('current')
  getCurrentCashRegister() {
    return this.cashRegisterService.getCurrentCashRegister();
  }
}
