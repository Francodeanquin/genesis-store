import { PaymentMethod, PaymentStatus } from '@genesis/shared-types';

type PersistSaleDtoProps = {
  paymentMethod: PaymentMethod;
  customerId?: string | null;
  installments: number;
  amountPaid?: number;
  paymentStatus?: PaymentStatus;
  generalDiscountPercentage: number | null;
  items: { productId: string; quantity: number; unitPrice: number }[];
  userId: string;
};

export function buildPersistSaleDto(
  overrides: Partial<PersistSaleDtoProps> = {},
): PersistSaleDtoProps {
  return {
    paymentMethod: PaymentMethod.TRANSFER,
    paymentStatus: PaymentStatus.PAID,
    customerId: 'customer-1',
    userId: 'user-1',
    installments: 1,
    generalDiscountPercentage: null,
    items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
    ...overrides,
  };
}
