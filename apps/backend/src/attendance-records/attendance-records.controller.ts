import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AttendanceRecordsService } from './attendance-records.service';
import { FindAttendanceRecordsDto } from './dto/find-attendance-records.dto';
import { AttendanceRecord } from './entities/attendance-records.entity';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '@genesis/shared-types';
import { UpdateRecordDto } from './dto/update-record.dto';
import { CalculatePayDto } from './dto/calculate-pay.dto';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Attendance Records')
@ApiCookieAuth('access_token')
@Controller('attendance-records')
export class AttendanceRecordsController {
  constructor(
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  @ApiOperation({
    summary: 'List attendance (check-in/check-out) records',
    description: 'Staff can only see their own; Admin/Supervisor can see any Staff member\'s (BR-22).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get()
  findAll(@Query() dto: FindAttendanceRecordsDto): Promise<AttendanceRecord[]> {
    return this.attendanceRecordsService.findAll(dto);
  }

  @ApiOperation({ summary: 'Get an attendance record by id' })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceRecordsService.findOne(id);
  }

  @ApiOperation({ summary: 'Correct an attendance record' })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecordDto) {
    return this.attendanceRecordsService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Calculate pay for a Staff member over a date range',
    description: 'hours worked x hourly rate configured on the User (BR-22).',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STAFF)
  @Get(':id/pay')
  calculatePay(@Param('id') userId: string, @Query() dto: CalculatePayDto) {
    return this.attendanceRecordsService.calculatePay(
      userId,
      dto.startDate,
      dto.endDate,
    );
  }
}
