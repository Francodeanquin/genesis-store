import { faker } from '@faker-js/faker';
import { Sale } from '../../src/sales/entities/sale.entity';
import { PaymentMethod, PaymentStatus, UserRole } from '@genesis/shared-types';
import { User } from '../../src/users/entities/user.entity';
import { buildUser } from './users.factory';
import { buildCustomer } from './customer.factory';

export function buildSale(overrides: Partial<Sale> = {}): Sale {
  const userId = overrides.userId || faker.string.uuid();
  const customerId = overrides.customerId || faker.string.uuid();
  return {
    id: faker.string.uuid(),
    customerId: customerId,
    userId: userId,
    user: buildUser({ id: userId }),
    customer: buildCustomer({ id: customerId }),
    generalDiscountPercentage: faker.number.float({
      min: 0,
      max: 100,
      fractionDigits: 2,
    }),
    paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethod)),
    paymentStatus: faker.helpers.arrayElement(Object.values(PaymentStatus)),
    installments: faker.number.int({ min: 1, max: 12 }),
    installmentSurcharge: faker.number.float({
      min: 0,
      max: 100,
      fractionDigits: 2,
    }),
    total: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
    amountPaid: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
    createdAt: faker.date.past(),
    ...overrides,
  };
}
