import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../common/password/password.service';
import { JwtService } from '@nestjs/jwt';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { CustomersService } from '../customers/customers.service';
import { UserRole } from '@genesis/shared-types';
import { ValidationResponse } from './interfaces/validation-response';
import { AttendanceRecordsService } from '../attendance-records/attendance-records.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly customersService: CustomersService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  async getTokens(
    userId: string,
    email: string,
    role: UserRole,
    type: 'user' | 'customer',
  ) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, type, role },
        {
          secret: process.env.JWT_SECRET || 'at-secret',
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, type, role },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'rt-secret',
          expiresIn: '7d',
        },
      ),
    ]);

    return { access_token: at, refresh_token: rt };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidationResponse | null> {
    if (!email || !password) return null;

    const user = await this.usersService.findByEmail(email);
    if (user) {
      const isValidPassword = await this.passwordService.compare(
        password,
        user.passwordHash,
      );
      if (!isValidPassword) return null;
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'user' as const,
      };
    }

    const customer = await this.customersService.findByEmail(email);
    if (customer) {
      const isValidPassword = await this.passwordService.compare(
        password,
        customer.passwordHash,
      );
      if (!isValidPassword) return null;
      if (!customer.emailVerified)
        throw new ForbiddenException('Email not verified');
      return {
        id: customer.id,
        email: customer.email,
        role: UserRole.CUSTOMER,
        type: 'customer' as const,
      };
    }
    return null;
  }

  async registerCustomer(dto: CreateCustomerDto) {
    await this.customersService.create(dto);
    return {
      message: 'Customer created successfully',
    };
  }

  async verifyEmail(token: string) {
    await this.customersService.verifyEmail(token);
    return {
      message: 'Email verified successfully',
    };
  }

  async login(account: {
    id: string;
    email: string;
    role: UserRole;
    type: 'user' | 'customer';
  }) {
    const tokens = await this.getTokens(
      account.id,
      account.email,
      account.role,
      account.type,
    );
    await this.updateRefreshToken(
      account.id,
      account.type,
      tokens.refresh_token,
    );
    await this.attendanceRecordsService.checkIn(account.id);

    return tokens;
  }

  async logout(userId: string, type: 'user' | 'customer') {
    if (type === 'user') {
      await this.usersService.updateRefreshTokenHash(userId, null);
      await this.attendanceRecordsService.checkOut(userId);
    } else {
      await this.customersService.updateRefreshTokenHash(userId, null);
    }
  }

  async refreshTokens(
    userId: string,
    rt: string,
    role: UserRole,
    type: 'user' | 'customer',
  ) {
    const account =
      type === 'user'
        ? await this.usersService.findOneWithRefreshHash(userId)
        : await this.customersService.findOneWithRefreshHash(userId);

    if (!account || !account.hashedRt) {
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await this.passwordService.compare(rt, account.hashedRt);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(account.id, account.email, role, type);
    await this.updateRefreshToken(account.id, type, tokens.refresh_token);
    return tokens;
  }

  async updateRefreshToken(
    userId: string,
    type: 'user' | 'customer',
    rt: string,
  ) {
    const hash = await this.passwordService.hash(rt);
    if (type === 'user') {
      await this.usersService.updateRefreshTokenHash(userId, hash);
    } else {
      await this.customersService.updateRefreshTokenHash(userId, hash);
    }
  }
}
