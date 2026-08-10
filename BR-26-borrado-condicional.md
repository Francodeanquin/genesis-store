# BR-26 — Borrado condicional: cómo funciona el `remove()` de Product, Customer y User

## La regla de negocio

BR-26 dice: ningún `Producto`, `Usuario` ni `Cliente` se borra físicamente de la base si tiene registros históricos que dependen de él (ventas, pedidos, movimientos de caja). Si tiene historial, se marca como inactivo (soft-delete, `isActive: false`). Si no tiene ningún historial todavía, se borra de verdad (`DELETE` físico).

La razón de fondo: una vez que un producto apareció en una venta, o un cliente hizo un pedido, o un empleado registró una venta o abrió una caja, esa fila pasó a ser parte de un registro histórico. Borrarla físicamente rompería esas referencias — una venta vieja quedaría apuntando a un producto que ya no existe. El soft-delete resuelve esto: el producto/cliente/usuario deja de aparecer en listados y no se puede volver a usar, pero la fila sigue ahí para que el historial tenga sentido.

## El algoritmo, siempre el mismo

Los tres `remove()` (`ProductsService`, `CustomersService`, `UsersService`) siguen exactamente la misma forma:

```typescript
async remove(id: string): Promise<void> {
  await this.findOne(id); // 404 si no existe

  const hasHistory = /* ...uno o más chequeos, ver tabla abajo... */;

  if (hasHistory) {
    await this.repositorio.update(id, { isActive: false }); // soft-delete
  } else {
    await this.repositorio.delete(id); // borrado físico
  }
}
```

Lo único que cambia entre los tres es **qué se chequea** para decidir `hasHistory`. Esa es la parte que se prestó a confusión, porque cada entidad tiene que preguntarle a módulos distintos.

## Por qué no se puede simplemente inyectar el repositorio de la otra entidad

Sería más directo que `ProductsService` inyectara `@InjectRepository(SaleItem)` y preguntara él mismo. No se hace así, por la misma regla que venimos siguiendo en todo el proyecto: **un service nunca inyecta el repositorio de una entidad que pertenece a otro módulo — siempre pasa por el service exportado de ese módulo.**

¿Por qué importa acá, si es solo una lectura y no una escritura? Dos razones:

1. **Encapsulamiento real.** `SalesService` es quien sabe cómo se define "este producto tiene ventas" — hoy es un `exists()` simple, pero si mañana cambia la lógica (por ejemplo, ignorar ventas canceladas si algún día existe ese concepto), solo hay que tocar `SalesService`. Si `ProductsService` tuviera su propia query directa contra `SaleItem`, ese cambio habría que replicarlo en todos lados que hacen esa misma pregunta.
2. **Consistencia con el resto del proyecto.** Ya establecimos este patrón con `CashRegisterService.registerCashMovement()` (para escrituras) — mantenerlo también para lecturas evita tener dos reglas distintas según el caso.

Esto tiene un costo: cada `remove()` termina dependiendo de otros services, y esos services tienen que estar en módulos que no generen un ciclo de imports. Por eso, antes de escribir el código, se verificó que ni `SalesModule`, ni `OrderModule`, ni `CashRegisterModule` importan de vuelta a `ProductsModule`/`CustomersModule`/`UsersModule` — si lo hicieran, NestJS no podría resolver la dependencia circular.

## Qué chequea cada entidad

| Entidad | Qué se pregunta | Método | Vive en | Por qué esos y no otros |
|---|---|---|---|---|
| **Product** | ¿Este producto apareció en alguna venta de mostrador? | `hasSalesForProduct(productId)` | `SalesService` | Un producto vendido no se puede borrar físico — la venta quedaría huérfana |
| | ¿Este producto está en algún pedido online (activo o no)? | `hasOrdersForProduct(productId)` | `OrderService` | Mismo motivo, pero para pedidos — un `OrderItem` también referencia al producto |
| **Customer** | ¿Este cliente tiene alguna venta a su nombre? | `hasSalesForCustomer(customerId)` | `SalesService` | `Sale.customerId` puede apuntar a este cliente |
| | ¿Este cliente hizo algún pedido? | `hasOrdersForCustomer(customerId)` | `OrderService` | `Order.customerId` puede apuntar a este cliente |
| **User** | ¿Este usuario (empleado/supervisor/admin) registró alguna venta? | `hasSalesForUser(userId)` | `SalesService` | `Sale.userId` es quien la cargó en el sistema |
| | ¿Este usuario abrió o cerró alguna caja? | `hasCashRegisterActivityForUser(userId)` | `CashRegisterService` | `CashRegister.openedByUserId` / `closedByUserId` |
| | *(pendiente)* ¿Este usuario tiene fichajes registrados? | — | — | `AttendanceRecord` todavía no existe — queda como `TODO` hasta que se construya ese módulo |

Notá que **`User` nunca pregunta a `OrderService`** — un pedido (`Order`) se relaciona con `Customer`, no con `User`. Un empleado no hace pedidos, los gestiona. Mezclar esto (preguntarle a `OrderService` por un `userId`) fue justo el error que se coló en el primer intento: se copió la lógica de `Product` sin ajustar qué relaciones aplican a cada entidad.

## Wiring de módulos necesario

Para que cada `service` pueda inyectar lo que necesita:

- **`ProductsModule`** importa `SalesModule` y `OrderModule`.
- **`CustomersModule`** importa `SalesModule` y `OrderModule`.
- **`UsersModule`** importa `SalesModule` y `CashRegisterModule` (no `OrderModule`).

## La red de seguridad de la base de datos

Todo esto es lógica de aplicación — puede tener bugs, como pasó. Por eso, además, cada relación en el ERD tiene `onDelete: 'RESTRICT'` a nivel de Postgres (documentado en "Convenciones técnicas de implementación" de `PLANIFICACION_1.html`). Si por algún motivo la lógica de arriba fallara y se intentara un `DELETE` físico sobre un producto/cliente/usuario que sí tiene historial, Postgres va a rechazar la operación igual, porque rompería una foreign key. La lógica de la aplicación decide *cuándo* hacer soft vs. hard delete; la base de datos es el respaldo que evita que un bug termine en datos corruptos.
