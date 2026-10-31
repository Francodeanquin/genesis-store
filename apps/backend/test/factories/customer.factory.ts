import { faker } from '@faker-js/faker';
import { Customer } from '../../src/customers/entities/customer.entity';

export function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dni: faker.string.numeric(8),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    email: faker.internet.email(),
    passwordHash: faker.internet.password(),
    resetToken: null,
    resetTokenExpiresAt: null,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    hashedRt: null,
    balance: faker.number.float({ min: 0, max: 500, fractionDigits: 2 }),
    pendingEmail: null,
    daysSinceLastPurchase: faker.number.int({ min: 0, max: 60 }),
    isActive: true,
    createdAt: faker.date.past(),
    ...overrides,
  };
}
