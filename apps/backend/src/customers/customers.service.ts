import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordService } from '../common/password/password.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { randomBytes } from 'crypto';
import { SalesService } from '../sales/sales.service';
import { OrderService } from '../order/order.service';
import { EmailService } from '../common/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly passwordService: PasswordService,
    private readonly salesService: SalesService,
    private readonly orderService: OrderService,
    private readonly emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const randomString = randomBytes(32).toString('hex');

    const emailVerification = {
      token: randomString,
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const { password, ...rest } = dto;
    const passwordHash = await this.passwordService.hash(password);
    const customer = this.customersRepository.create({
      ...rest,
      passwordHash,
      emailVerificationToken: emailVerification.token,
      emailVerificationTokenExpiresAt: emailVerification.tokenExpiresAt,
    });
    const savedCustomer = await this.customersRepository.save(customer);
    try {
      await this.emailService.sendEmail({
        to: savedCustomer.email,
        subject: 'Confirm your account',
        html: `<a href="${this.configService.get('ECOMMERCE_URL')}/verify-email?token=${emailVerification.token}">Confirm Email</a>`,
      });
    } catch (error) {
      this.logger.error(
        `Error sending verification email to ${savedCustomer.email}`,
        error,
      );
    }

    return savedCustomer;
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    return customer;
  }

  async findAll(): Promise<Customer[]> {
    return this.customersRepository.find({ where: { isActive: true } });
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
      },
    });
  }

  async updateProfile(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    const { email, ...rest } = dto;
    const emailChanged = !!email && email !== customer.email;

    let token: string | undefined;

    if (emailChanged) {
      token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      this.customersRepository.merge(customer, rest, {
        pendingEmail: email,
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
      });
    } else {
      this.customersRepository.merge(customer, rest);
    }

    const savedCustomer = await this.customersRepository.save(customer);

    if (emailChanged) {
      try {
        await this.emailService.sendEmail({
          to: email!,
          subject: 'Confirm your new email',
          html: `<a href="${this.configService.get('ECOMMERCE_URL')}/verify-email?token=${token}">Confirmar email</a>`,
        });
      } catch (error) {
        this.logger.error(
          `Error sending verification email to a ${email}`,
          error,
        );
      }
    }

    return savedCustomer;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const hasHistory =
      (await this.salesService.hasSalesForCustomer(id)) ||
      (await this.orderService.hasOrdersForCustomer(id));

    if (hasHistory) {
      await this.customersRepository.update(id, { isActive: false });
    } else {
      await this.customersRepository.delete(id);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const customer = await this.customersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with token ${token} not found`);
    }

    if (customer.emailVerificationTokenExpiresAt! < new Date(Date.now())) {
      throw new BadRequestException('The token is expired');
    }

    await this.customersRepository.update(customer.id, {
      email: customer.pendingEmail ?? customer.email,
      pendingEmail: null,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    });
  }

  async updateRefreshTokenHash(id: string, hassh: string | null) {
    await this.customersRepository.update(id, { hashedRt: hassh });
  }

  async findOneWithRefreshHash(id: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { id },
      select: { id: true, email: true, hashedRt: true },
    });
  }
}
