import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AttendanceRecordsService } from './attendance-records.service';
import { FindAttendanceRecordsDto } from './dto/find-attendance-records.dto';
import { AttendanceRecord } from './entities/attendance-records.entity';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { UpdateRecordDto } from './dto/update-record.dto';
import { CalculatePayDto } from './dto/calculate-pay.dto';

@Controller('attendance-records')
export class AttendanceRecordsController {
  constructor(
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(@Query() dto: FindAttendanceRecordsDto): Promise<AttendanceRecord[]> {
    return this.attendanceRecordsService.findAll(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceRecordsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecordDto) {
    return this.attendanceRecordsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/pay')
  calculatePay(@Param('id') userId: string, @Query() dto: CalculatePayDto) {
    return this.attendanceRecordsService.calculatePay(
      userId,
      dto.startDate,
      dto.endDate,
    );
  }
}
