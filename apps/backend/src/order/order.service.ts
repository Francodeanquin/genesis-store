import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersDto } from './dto/Find-orders.dto';
import { OrderStatus, PaymentMethod } from '@genesis/shared-types';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { SalesService } from '../sales/sales.service';

const RESERVATION_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly salesService: SalesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * BR-02: crea el pedido online. A diferencia de una Sale del local, acá
   * SÍ se descuenta el stock al crear (es una reserva real, no una venta
   * consumada), y el pedido arranca en PENDING con 24hs para ser retirado.
   */
  async create(dto: CreateOrderDto, customerId: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      for (const item of dto.items) {
        const product = await productRepository.findOne({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundException(
            `Product with id ${item.productId} not found`,
          );
        }
        if (product.availableStock < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for "${product.name}" (available: ${product.availableStock}, requested: ${item.quantity})`,
          );
        }

        product.availableStock -= item.quantity;
        await productRepository.save(product);
      }

      const order = orderRepository.create({
        customerId,
        reservationExpiresAt: new Date(Date.now() + RESERVATION_DURATION_MS),
      });
      await orderRepository.save(order);

      const orderItems = dto.items.map((item) =>
        orderItemRepository.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
        }),
      );
      await orderItemRepository.save(orderItems);

      return order;
    });
  }

  async findAll(query: FindOrdersDto): Promise<Order[]> {
    const { customerId, status } = query;
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .orderBy('order.createdAt', 'DESC');

    if (customerId) {
      qb.andWhere('order.customerId = :customerId', { customerId });
    }
    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    return qb.getMany();
  }

  async findOne(
    orderId: string,
    requestingCustomerId?: string,
  ): Promise<Order & { items: OrderItem[] }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }
    if (requestingCustomerId && order.customerId !== requestingCustomerId) {
      throw new ConflictException('This order does not belong to you');
    }

    const items = await this.orderItemRepository.find({
      where: { orderId },
    });

    return { ...order, items };
  }

  async cancel(orderId: string, customerId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }
    if (order.customerId !== customerId) {
      throw new ConflictException('This order does not belong to you');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        `Order is already ${order.status.toLowerCase()}`,
      );
    }

    await this.cancelOrderAndRestoreStock(orderId);
  }

  async cancelOrderAndRestoreStock(orderId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);
      const productRepository = manager.getRepository(Product);

      const order = await orderRepository.findOne({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException(`Order with id ${orderId} not found`);
      }

      if (order.status !== OrderStatus.PENDING) {
        return;
      }

      const items = await orderItemRepository.find({ where: { orderId } });

      for (const item of items) {
        const product = await productRepository.findOne({
          where: { id: item.productId },
        });
        if (product) {
          product.availableStock += item.quantity;
          await productRepository.save(product);
        }
      }

      order.status = OrderStatus.CANCELLED;
      await orderRepository.save(order);
    });
  }

  /**
   * HU-15 / "Cerrar venta": el empleado confirma un Pedido PENDING y el
   * sistema crea la Sale real. El precio de cada línea se toma del
   * Product.basePrice ACTUAL (no se guardó nada en el Pedido, puede haber
   * cambiado durante las 24hs de reserva). No se vuelve a tocar stock —
   * ya se descontó/reservó al crear el pedido.
   */
  async confirmToSale(
    orderId: string,
    userId: string,
    dto: ConfirmOrderDto,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemsRepository = manager.getRepository(OrderItem);
      const productRepository = manager.getRepository(Product);

      const order = await orderRepository.findOne({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException(`Order with id ${orderId} not found`);
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException(
          `Order is already ${order.status.toLowerCase()}`,
        );
      }

      const orderItems = await orderItemsRepository.find({
        where: { orderId },
      });

      const saleItems: {
        productId: string;
        quantity: number;
        unitPrice: number;
      }[] = [];

      for (const item of orderItems) {
        const product = await productRepository.findOne({
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with id ${item.productId} not found`,
          );
        }
        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,

          unitPrice: Number(product.basePrice),
        });
      }

      const sale = await this.salesService.createFromOrder(
        {
          customerId: order.customerId,
          userId,
          paymentMethod: dto.paymentMethod,
          installments: dto.installments ?? 1,
          generalDiscountPercentage: dto.generalDiscountPercentage ?? null,
          items: saleItems,
        },
        manager,
      );

      order.status = OrderStatus.CONFIRMED;
      order.saleId = sale.id;
      await orderRepository.save(order);

      return order;
    });
  }

  async hasOrdersForProduct(productId: string): Promise<boolean> {
    return this.orderItemRepository.exists({ where: { productId } });
  }

  async hasOrdersForCustomer(customerId: string): Promise<boolean> {
    return this.orderRepository.exists({ where: { customerId } });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredOrders(): Promise<void> {
    const expiredOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        reservationExpiresAt: LessThan(new Date()),
      },
    });

    for (const order of expiredOrders) {
      await this.cancelOrderAndRestoreStock(order.id);
    }
  }
}
