import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { In, Repository } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from '@genesis/shared-types';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async findAll(): Promise<Notification[]> {
    return await this.notificationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(dto);
    return await this.notificationsRepository.save(notification);
  }

  async findByTypeAndReferenceIds(
    type: NotificationType,
    referenceIds: string[],
  ): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { type, referenceId: In(referenceIds) },
    });
  }
}
