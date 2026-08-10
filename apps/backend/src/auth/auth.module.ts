import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PasswordModule } from '../common/password/password.module';
import { CustomersModule } from '../customers/customers.module';
import { RtStrategy } from './strategies/refresh-token-strategy';
import { AttendanceRecordsModule } from '../attendance-records/attendance-records.module';

@Module({
  imports: [
    UsersModule,
    CustomersModule,
    PasswordModule,
    PassportModule,
    AttendanceRecordsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, RtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
