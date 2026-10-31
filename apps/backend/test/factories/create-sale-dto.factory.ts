import { faker } from '@faker-js/faker';
import { CreateSaleDto } from '../../src/sales/dto/create-sale.dto';

export function buildCreateSaleDto(
  overrides: Partial<CreateSaleDto> = {},
): CreateSaleDto {
  return {
    items: [
      {
        productId: faker.string.uuid(),
        quantity: 1,
        unitPrice: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      },
    ],
    ...overrides,
  };
}
