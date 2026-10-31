import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { OpenCashRegisterDto } from './dto/open-cash.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { GetAllCashRegisterDto } from './dto/get-all-cash-register.dto';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Cash Register')
@ApiCookieAuth('access_token')
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @ApiOperation({
    summary: 'Open the cash register for the day',
    description: 'Required before any cash sale or expense can be registered (BR-08).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
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

  @ApiOperation({
    summary: 'Close the cash register, declaring the physical amount counted',
    description:
      'Compares the declared amount against the theoretical amount and automatically logs a SHORTAGE or SURPLUS movement on any difference (BR-19).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
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

  @ApiOperation({
    summary: 'List past cash registers (audit history)',
    description: 'Defaults to the last 30 days; supports date-range pagination via a before cursor (BR-19).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get('')
  getCashRegisters(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetAllCashRegisterDto,
  ) {
    return this.cashRegisterService.getAllCashRegisters(query);
  }

  @ApiOperation({ summary: 'Get today\'s open cash register' })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get('current')
  getCurrentCashRegister() {
    return this.cashRegisterService.getCurrentCashRegister();
  }
}
