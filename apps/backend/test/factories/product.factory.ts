import { Product } from '../../src/products/entities/product.entity';
import { faker } from '@faker-js/faker';
export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    category: faker.commerce.department(),
    costPrice: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    basePrice: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    availableStock: faker.number.int({ min: 0, max: 100 }),
    minStock: faker.number.int({ min: 1, max: 10 }),
    isActive: true,
    createdAt: faker.date.past(),
    ...overrides,
  };
}
