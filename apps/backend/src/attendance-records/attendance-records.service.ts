import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttendanceRecord } from './entities/attendance-records.entity';
import { Between, IsNull, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UpdateRecordDto } from './dto/update-record.dto';
import { FindAttendanceRecordsDto } from './dto/find-attendance-records.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AttendanceRecordsService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecordRepository: Repository<AttendanceRecord>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query: FindAttendanceRecordsDto): Promise<AttendanceRecord[]> {
    const { userId, autoClosed, startDate, endDate } = query;
    const qb = this.attendanceRecordRepository
      .createQueryBuilder('record')
      .orderBy('record.checkIn', 'DESC');

    if (userId) qb.andWhere('record.userId = :userId', { userId });
    if (autoClosed !== undefined) {
      qb.andWhere('record.autoClosed = :autoClosed', { autoClosed });
    }
    if (startDate) qb.andWhere('record.checkIn >= :startDate', { startDate });
    if (endDate) qb.andWhere('record.checkIn <= :endDate', { endDate });

    return qb.getMany();
  }

  async findOne(id: string): Promise<AttendanceRecord> {
    const record = await this.attendanceRecordRepository.findOneBy({ id });
    if (!record) throw new NotFoundException('Record not found');

    return record;
  }

  async findOpenSession(userId: string): Promise<AttendanceRecord | null> {
    return this.attendanceRecordRepository.findOneBy({
      userId,
      checkOut: IsNull(),
    });
  }

  async update(id: string, dto: UpdateRecordDto): Promise<AttendanceRecord> {
    const record = await this.findOne(id);

    return this.attendanceRecordRepository.save({
      ...record,
      ...dto,
      autoClosed: false,
    });
  }

  async checkIn(userId: string): Promise<AttendanceRecord> {
    const openSession = await this.findOpenSession(userId);

    if (openSession) {
      await this.attendanceRecordRepository.save({
        ...openSession,
        checkOut: new Date(),
        autoClosed: true,
      });
    }

    const record = this.attendanceRecordRepository.create({
      userId,
      checkIn: new Date(),
    });

    return this.attendanceRecordRepository.save(record);
  }

  async checkOut(userId: string): Promise<AttendanceRecord | null> {
    const openSession = await this.findOpenSession(userId);
    if (!openSession) return null;

    return this.attendanceRecordRepository.save({
      ...openSession,
      checkOut: new Date(),
    });
  }

  async calculatePay(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalHours: number; hourlyRate: number; totalPay: number }> {
    const user = await this.usersService.findOne(userId);

    const userRecords = await this.attendanceRecordRepository.find({
      where: {
        userId,
        checkIn: Between(startDate, endDate),
      },
    });

    let totalHours = 0;
    for (const record of userRecords) {
      if (!record.checkOut) continue;

      const hoursWorked =
        (record.checkOut.getTime() - record.checkIn.getTime()) /
        (1000 * 60 * 60);
      totalHours += hoursWorked;
    }

    const hourlyRate = Number(user.hourlyRate ?? 0);
    const totalPay = totalHours * hourlyRate;

    return { totalHours, hourlyRate, totalPay };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async closeAbandonedSessions() {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const records = await this.attendanceRecordRepository.find({
      where: { checkOut: IsNull(), checkIn: LessThan(twelveHoursAgo) },
    });
    for (const record of records) {
      await this.attendanceRecordRepository.save({
        ...record,
        checkOut: new Date(record.checkIn.getTime() + 12 * 60 * 60 * 1000),
        autoClosed: true,
      });
      await this.usersService.updateRefreshTokenHash(record.userId, null);
    }
  }
}
