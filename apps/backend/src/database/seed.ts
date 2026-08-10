import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { PasswordService } from '../common/password/password.service';
import { UserRole } from '@genesis/shared-types';
import * as seedData from './seed-data.json';
const logger = new Logger('seed');

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    logger.log('Ejecutando seed...');

    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const customersRepository = app.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
    const productsRepository = app.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    const passwordService = app.get(PasswordService);

    for (const userData of seedData.users) {
      const exists = await usersRepository.findOne({
        where: { email: userData.email },
      });
      if (exists) {
        logger.log(`User ${userData.email} ya existe, se omite.`);
        continue;
      }

      const { password, role, hourlyRate, ...rest } = userData;
      const passwordHash = await passwordService.hash(password);
      const user = usersRepository.create({
        ...rest,
        role: role as UserRole,
        passwordHash,
        hourlyRate: hourlyRate ?? undefined,
      });
      await usersRepository.save(user);
      logger.log(`User creado: ${userData.email}`);
    }

    for (const customerData of seedData.customers) {
      const exists = await customersRepository.findOne({
        where: { email: customerData.email },
      });
      if (exists) {
        logger.log(`Customer ${customerData.email} ya existe, se omite.`);
        continue;
      }

      const { password, ...rest } = customerData;
      const passwordHash = await passwordService.hash(password);
      const customer = customersRepository.create({
        ...rest,
        passwordHash,
      });
      await customersRepository.save(customer);
      logger.log(`Customer creado: ${customerData.email}`);
    }

    for (const productData of seedData.products) {
      const exists = await productsRepository.findOne({
        where: { name: productData.name },
      });
      if (exists) {
        logger.log(`Product "${productData.name}" ya existe, se omite.`);
        continue;
      }

      const product = productsRepository.create(productData);
      await productsRepository.save(product);
      logger.log(`Product creado: ${productData.name}`);
    }

    logger.log('Seed completo ✅');
  } finally {
    await app.close();
  }
}

seed().catch((err) => {
  logger.error('Error al ejecutar el seed:');
  logger.error(err);
  process.exit(1);
});
