import { Logger, Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { SalesModule } from './sales/sales.module';
import { OrderModule } from './order/order.module';
import { AttendanceRecordsModule } from './attendance-records/attendance-records.module';

@Module({
  imports: [
    HealthModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    CashRegisterModule,
    OrderModule,
    SalesModule,
    AttendanceRecordsModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configservice: ConfigService) => ({
        type: 'postgres',
        host: configservice.get('DB_HOST', 'localhost'),
        port: parseInt(configservice.get('DB_PORT', '5432'), 10),
        username: configservice.get('DB_USERNAME'),
        password: configservice.get('DB_PASSWORD'),
        database: configservice.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log('Connected to PostgreSQL ✅');
    } else {
      this.logger.error('Cannot connect to PostgreSQL ❌');
    }
  }
}
