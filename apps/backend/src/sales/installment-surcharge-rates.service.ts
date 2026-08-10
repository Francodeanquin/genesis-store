import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstallmentSurchargeRate } from './entities/installment-surcharge-rate.entity';
import { CreateInstallmentSurchargeRateDto } from './dto/create-installment-surcharge-rate.dto';
import { UpdateInstallmentSurchargeRateDto } from './dto/update-installment-surcharge-rate.dto';

@Injectable()
export class InstallmentSurchargeRatesService {
  constructor(
    @InjectRepository(InstallmentSurchargeRate)
    private readonly ratesRepository: Repository<InstallmentSurchargeRate>,
  ) {}

  async findAll(): Promise<InstallmentSurchargeRate[]> {
    return this.ratesRepository.find({ order: { installments: 'ASC' } });
  }

  async findOne(id: string): Promise<InstallmentSurchargeRate> {
    const rate = await this.ratesRepository.findOne({ where: { id } });
    if (!rate) {
      throw new NotFoundException(`Installment rate with id ${id} not found`);
    }
    return rate;
  }

  async create(
    dto: CreateInstallmentSurchargeRateDto,
    userId: string,
  ): Promise<InstallmentSurchargeRate> {
    const existing = await this.ratesRepository.findOne({
      where: { installments: dto.installments },
    });
    if (existing) {
      throw new ConflictException(
        `Installment rate for ${dto.installments} installments already exists`,
      );
    }

    const rate = this.ratesRepository.create({
      ...dto,
      updatedByUserId: userId,
    });
    return this.ratesRepository.save(rate);
  }

  async update(
    id: string,
    dto: UpdateInstallmentSurchargeRateDto,
    userId: string,
  ): Promise<InstallmentSurchargeRate> {
    const rate = await this.findOne(id);
    const updatedRate = this.ratesRepository.merge(rate, {
      ...dto,
      updatedByUserId: userId,
    });
    return this.ratesRepository.save(updatedRate);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.ratesRepository.delete(id);
  }

  async getSurchargePercentage(installments: number): Promise<number | null> {
    if (installments <= 1) return null;

    const rate = await this.ratesRepository.findOne({
      where: { installments },
    });
    return rate?.surchargePercentage ?? null;
  }
}
