import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordService } from '../common/password/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@genesis/shared-types';
import { SalesService } from '../sales/sales.service';
import { OrderService } from '../order/order.service';
import { CashRegisterService } from '../cash-register/cash-register.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly salesService: SalesService,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  async create(dto: CreateUserDto, reqRole: UserRole): Promise<User> {
    const { password, role, ...rest } = dto;
    if (reqRole === UserRole.SUPERVISOR && role !== UserRole.STAFF)
      throw new ForbiddenException();

    const passwordHash = await this.passwordService.hash(password);
    const user = this.usersRepository.create({ ...rest, role, passwordHash });
    return this.usersRepository.save(user);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ where: { isActive: true } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    reqRole: UserRole,
  ): Promise<User> {
    const user = await this.findOne(id);
    if (reqRole === UserRole.SUPERVISOR) {
      if (user.role !== UserRole.STAFF) throw new ForbiddenException();
      if (dto.role !== undefined && dto.role !== UserRole.STAFF)
        throw new ForbiddenException();
    }
    const updatedUser = this.usersRepository.merge(user, dto);
    return this.usersRepository.save(updatedUser);
  }
  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const hasHistory =
      (await this.salesService.hasSalesForUser(id)) ||
      (await this.cashRegisterService.hasCashRegisterActivityForUser(id));

    if (hasHistory) {
      await this.usersRepository.update(id, { isActive: false });
    } else {
      await this.usersRepository.delete(id);
    }
  }

  async findOneWithRefreshHash(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: { id: true, email: true, hashedRt: true },
    });
  }

  async updateRefreshTokenHash(
    userId: string,
    hash: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { hashedRt: hash });
  }
}
