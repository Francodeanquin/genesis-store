import { Module } from '@nestjs/common';
import { AttendanceRecordsController } from './attendance-records.controller';
import { AttendanceRecordsService } from './attendance-records.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './entities/attendance-records.entity';
import { UsersModule } from '../users/users.module';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord]),
    UsersModule,
  ],
  controllers: [AttendanceRecordsController],
  providers: [AttendanceRecordsService],
  exports: [AttendanceRecordsService],
})
export class AttendanceRecordsModule {}
