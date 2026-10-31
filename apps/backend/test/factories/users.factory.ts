import { faker } from '@faker-js/faker';
import { User } from '../../src/users/entities/user.entity';
import { UserRole } from '@genesis/shared-types/dist/enums/user-role.enum';

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    dni: faker.string.numeric(8),
    address: faker.location.streetAddress(),
    phone: faker.phone.number(),
    passwordHash: faker.internet.password(),
    role: faker.helpers.arrayElement(Object.values(UserRole)),
    hourlyRate: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
    hashedRt: null,
    mustChangePassword: false,
    isActive: true,
    createdAt: faker.date.past(),
    ...overrides,
  };
}
