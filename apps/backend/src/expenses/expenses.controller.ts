import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '@genesis/shared-types';
import { Roles } from '../auth/decorators/roles.decorators';
import { FindExpensesDto } from './dto/find-expenses.dto';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Expenses')
@ApiCookieAuth('access_token')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @ApiOperation({
    summary: 'Create an expense',
    description:
      'Categorizes the expense (BR-10). If category is SUPPLIER and payment is PARTIAL/PENDING, requires a supplierId and adds the resulting debt to that supplier\'s balance (BR-18).',
  })
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @Post()
  create(@Body() dto: CreateExpenseDto, @Req() req: AuthenticatedRequest) {
    return this.expensesService.create(dto, req.user.id);
  }

  @ApiOperation({
    summary: 'List expenses',
    description:
      'The SALARIES category is hidden from Staff, and Supervisors only see their own salary payment (BR-10).',
  })
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.SUPERVISOR)
  @Get()
  findAll(@Query() query: FindExpensesDto, @Req() req: AuthenticatedRequest) {
    return this.expensesService.findAll(query, req.user.role, req.user.id);
  }
}
