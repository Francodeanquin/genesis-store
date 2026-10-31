import { ObjectLiteral, Repository } from 'typeorm';

function createMockRepository<T extends ObjectLiteral>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    increment: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
    checkOpenedCashRegister: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

export { createMockRepository };
