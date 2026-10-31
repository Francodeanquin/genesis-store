# Autenticación en Genesis — cómo funciona todo, de punta a punta

Este documento explica el sistema de autenticación completo: registro, login, protección de rutas, logout, refresh de tokens, recuperación de contraseña y el mecanismo de cambio de contraseña obligatorio. La idea es que puedas volver a este archivo cada vez que te pierdas en el flujo.

---

## 1. Las tres capas, siempre en el mismo orden

Todo en este backend sigue la misma cadena de responsabilidad:

**Controller** (recibe el HTTP request, no tiene lógica) → **Service** (tiene la lógica de negocio y accede a la base) → **Strategy / Repository** (hace el trabajo de bajo nivel).

En auth, además de esa cadena, hay una pieza extra: los **Guards**, que se ejecutan *antes* de que el controller llegue a correr, y deciden si la request puede pasar o no.

Los archivos clave y qué hace cada uno:

- `auth.controller.ts` — expone las rutas HTTP (`/auth/login`, `/auth/logout`, etc.). No valida contraseñas ni toca la base de datos directamente.
- `auth.service.ts` — el cerebro. Genera tokens, valida credenciales, coordina con `UsersService`, `CustomersService` y `AttendanceRecordsService`.
- `strategies/` — implementaciones de **Passport** (la librería que maneja la autenticación en NestJS). Cada strategy sabe *de dónde sacar las credenciales* y *cómo validarlas*.
- `guards/` — deciden si una request puede entrar a un endpoint, usando una strategy por debajo.

---

## 2. Dos tipos de cuenta que conviven: `User` y `Customer`

Este es el primer concepto raro del sistema, y vale la pena tenerlo clarísimo: **no hay una sola tabla de "usuarios"**. Hay dos entidades separadas:

- **`User`** — Administrador, Supervisor o Empleado (roles internos: `ADMIN`, `SUPERVISOR`, `STAFF`). Tiene campos como `hourlyRate` y `mustChangePassword` que no tienen sentido para un cliente.
- **`Customer`** — Cliente Web (rol `CUSTOMER`). Tiene campos como `dni`, `address`, `emailVerified`, `resetToken` que tampoco tienen sentido para un empleado interno.

¿Por qué separarlos en vez de una sola tabla `accounts` con un campo `type`? Porque sus reglas de negocio son completamente distintas (BR-05 vs BR-20, verificación de email vs fichaje, etc.) — meterlos en una sola tabla hubiera significado un montón de columnas nullable sin sentido para la mitad de los casos.

La consecuencia práctica: **en casi todo el código de auth vas a ver un parámetro `type: 'user' | 'customer'`**, y ramas `if (type === 'user') { ... } else { ... }` que deciden a cuál de los dos services (`UsersService` o `CustomersService`) delegar. Es el patrón que se repite en `logout()`, `refreshTokens()`, `updateRefreshToken()`, etc.

---

## 3. Cómo viaja el JWT: cookies httpOnly, no Bearer tokens

Muchos tutoriales de JWT devuelven el token en el body de la respuesta (`{ access_token: "..." }`) y el cliente lo guarda en `localStorage`, mandándolo después en el header `Authorization: Bearer ...`. **Este proyecto no hace eso.**

En cambio, `auth.controller.ts` setea el JWT directamente como una **cookie httpOnly**:

```typescript
res.cookie('access_token', tokens.access_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000,
});
```

¿Por qué? `httpOnly: true` significa que **JavaScript del lado del navegador no puede leer esa cookie** (ni `document.cookie` la muestra). Esto protege contra ataques XSS: si un atacante lograra inyectar JavaScript malicioso en tu frontend, no podría robar el token, porque ni el propio frontend legítimo puede leerlo — solo viaja automáticamente en cada request al mismo dominio.

Hay dos cookies, con dos propósitos distintos:

- **`access_token`** — vive 15 minutos. Es el que se usa para autorizar cada request a rutas protegidas.
- **`refresh_token`** — vive 7 días. Solo sirve para un endpoint (`/auth/refresh`): pedir un `access_token` nuevo sin tener que volver a loguearse con email/contraseña.

Esta es la razón de tener dos tokens con vidas distintas: si el `access_token` se filtrara de alguna forma, su ventana de daño es de máximo 15 minutos. El `refresh_token` vive más porque es el que le da comodidad al usuario (no tiene que loguearse cada 15 minutos), pero viaja con más cuidado (solo se usa contra un único endpoint, y además se valida contra un hash guardado en la base — ver sección 8).

---

## 4. Flujo de registro — Cliente Web (`POST /auth/register-customer`)

Cadena completa:

`AuthController.registerCustomer(dto)` → `AuthService.registerCustomer(dto)` → `CustomersService.create(dto)`

Paso a paso dentro de `CustomersService.create()`:

1. Se genera un `emailVerificationToken` random (`randomBytes(32).toString('hex')`) con una expiración de 24hs.
2. Se hashea la contraseña con `PasswordService` (nunca se guarda en texto plano — esto es BR-03).
3. Se guarda el `Customer` en la base **ya con** `emailVerified: false` (default de la entidad) y el token de verificación.
4. **Recién después de guardar**, se intenta mandar el email de verificación vía `EmailService` (Resend), con un link tipo `${ECOMMERCE_URL}/verify-email?token=...`.
5. Si el envío del email falla (Resend caído, lo que sea), **el registro no se cae** — se loguea el error y se devuelve igual el cliente creado. La razón: no queremos que la disponibilidad de un servicio de terceros determine si alguien se puede registrar o no. El costo de esta decisión es que un cliente podría quedar con el mail nunca enviado — hoy no hay un endpoint de "reenviar verificación", quedó pendiente como mejora futura.

El cliente queda creado pero **no puede loguearse todavía** — ver la sección 5, donde `validateUser()` chequea `emailVerified` antes de dejarlo pasar (BR-27).

### Verificación del email (`POST /auth/verify-email`)

`AuthController.verifyemail(dto)` → `AuthService.verifyEmail(token)` → `CustomersService.verifyEmail(token)`

Busca al cliente por `emailVerificationToken`, valida que no esté vencido, y si todo bien: `emailVerified = true`, limpia el token. Sin esto, el login queda bloqueado.

---

## 5. Flujo de login (`POST /auth/login`)

Este es el flujo más largo porque toca casi todos los módulos. Vamos por partes.

### 5.1. La strategy `local`

El endpoint tiene `@UseGuards(LocalAuthGuard)`, que por debajo usa `LocalStrategy` (Passport). Passport, automáticamente, agarra `email` y `password` del body y llama a:

```typescript
LocalStrategy.validate(email, password) → AuthService.validateUser(email, password)
```

Si `validateUser` devuelve `null`, Passport tira `401 Unauthorized` **antes** de que el código del controller llegue a ejecutarse. Si devuelve un objeto, ese objeto queda disponible en `req.user` dentro del controller.

### 5.2. `AuthService.validateUser()` — el corazón de la autenticación

Este método intenta primero como `User` (interno), y si no encuentra, prueba como `Customer`:

```
1. Busca por email en UsersService.findByEmail()
   - Si existe: compara password con bcrypt (PasswordService.compare)
   - Si coincide: devuelve { id, email, role, type: 'user', mustChangePassword }
   - Si no coincide: return null

2. Si no era un User, busca en CustomersService.findByEmail()
   - Si existe: compara password
   - Si coincide pero emailVerified === false: throw ForbiddenException (BR-27)
   - Si coincide y está verificado: devuelve { id, email, role: CUSTOMER, type: 'customer', mustChangePassword: false }

3. Si no matcheó en ninguna de las dos tablas: return null
```

Notá que un mismo email nunca puede repetirse entre `User` y `Customer` en la práctica de negocio (son roles distintos), pero el código no fuerza eso a nivel de base — simplemente prueba un lado y después el otro.

### 5.3. `AuthController.login()` — emitir las cookies

Con `req.user` ya resuelto por la strategy, el controller llama a `AuthService.login(req.user)`, que:

1. Llama a `getTokens()` para firmar el `access_token` y el `refresh_token` (ver sección 3 y 7 para el detalle del payload).
2. Guarda el **hash** del `refresh_token` en la base (`updateRefreshToken` → `usersService.updateRefreshTokenHash` o `customersService.updateRefreshTokenHash`). Nunca se guarda el refresh token en texto plano — se guarda su hash, igual que una contraseña. Esto es lo que permite invalidar sesiones (logout) sin tener una tabla de "tokens revocados": si el hash en la base no matchea, el refresh token ya no sirve.
3. Llama a `attendanceRecordsService.checkIn(account.id)` — **esto se ejecuta para toda cuenta que loguea, sin filtrar por rol**. Es un punto pendiente de corregir: BR-22 dice que solo los Empleados (`STAFF`) fichan, pero hoy el `checkIn` se dispara incluso para un Cliente Web o un Admin. Quedó anotado como deuda técnica, no arreglado todavía.
4. El controller toma esos tokens y los setea como cookies (sección 3).

---

## 6. Cómo se protegen las rutas: Guards + Roles

Una vez logueado, cada request a una ruta protegida pasa por dos guards en cadena, declarados así en cada controller:

```typescript
@Roles(UserRole.ADMIN, UserRole.STAFF)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get(...)
```

**`JwtAuthGuard`** (strategy `jwt`, en `jwt.strategy.ts`):
1. Lee la cookie `access_token` (no headers — mirá el `jwtFromRequest` custom que lee `req.cookies['access_token']`).
2. Verifica la firma con `JWT_SECRET`. Si es inválida o venció (15 min), tira `401`.
3. Si es válida, decodifica el payload y arma `req.user = { id, email, role, type, mustChangePassword }` — esto es lo que corre el método `validate()` de `JwtStrategy`.

**`RolesGuard`**: lee los roles requeridos con el decorator `@Roles(...)` (que internamente usa `SetMetadata` + `Reflector`, un mecanismo genérico de NestJS para "etiquetar" metadata en un endpoint y leerla después desde un guard). Compara `req.user.role` contra esa lista — si no matchea, `403`.

**Dato importante de arquitectura**: en este proyecto **no hay guards globales** (no hay nada en `main.ts` tipo `app.useGlobalGuards(...)`). Cada controller declara explícitamente qué guards usar en cada endpoint. Esto da flexibilidad (rutas públicas simplemente no llevan `@UseGuards`), pero también significa que si agregás un guard nuevo (como el de `mustChangePassword` que armamos después, sección 10), tenés que acordarte de sumarlo a mano en cada controller — no se aplica solo.

---

## 7. El payload del JWT — qué viaja adentro

`getTokens()` en `auth.service.ts` firma dos JWT con este payload:

```json
{
  "sub": "<id de la cuenta>",
  "email": "...",
  "type": "user" | "customer",
  "role": "ADMIN" | "SUPERVISOR" | "STAFF" | "CUSTOMER",
  "mustChangePassword": true | false
}
```

`access_token` y `refresh_token` llevan el **mismo payload**, pero se firman con secrets distintos (`JWT_SECRET` vs `JWT_REFRESH_SECRET`) y expiraciones distintas (15m vs 7d). Firmarlos con secrets distintos es a propósito: así un `refresh_token` filtrado no sirve para autorizar rutas de negocio directamente (la strategy `jwt` normal no lo va a validar, porque usa el secret equivocado).

---

## 8. Logout (`POST /auth/logout`)

Protegido con `JwtAuthGuard` (necesitás estar logueado para desloguearte, tiene sentido). `AuthService.logout(userId, type)`:

- Si es `User`: pone `hashedRt = null` en la base (esto invalida cualquier `refresh_token` viejo, porque en el refresh se compara contra ese hash) y llama a `attendanceRecordsService.checkOut()`.
- Si es `Customer`: solo limpia el hash, no hay fichaje de por medio.

El controller además limpia las dos cookies del navegador (`res.clearCookie(...)`).

---

## 9. Refresh de tokens (`POST /auth/refresh`)

Este es el flujo que arreglamos hoy, así que vale la pena el detalle completo.

1. `RefreshTokenGuard` usa la strategy `jwt-refresh` (`RtStrategy`), que lee la cookie `refresh_token` (no la de `access_token`) y la valida contra `JWT_REFRESH_SECRET`. Si es válida, arma `req.user` con lo que venía en el payload de **ese** token viejo.
2. El controller llama a `AuthService.refreshTokens(userId, refreshToken, role, type)`.
3. Adentro, se busca la cuenta en la base (`findOneWithRefreshHash`) y se compara el `refreshToken` recibido contra el **hash guardado** en la base con `PasswordService.compare()`. Si no matchea (por ejemplo, porque ya se hizo logout y el hash se puso en `null`), `403`.
4. Acá está el punto importante: **el `mustChangePassword` que se usa para firmar los tokens nuevos se vuelve a leer de la base en este momento** (`account.mustChangePassword`), no del payload del refresh token viejo. ¿Por qué importa? Porque si un Admin resetea la contraseña de un Empleado mientras ese Empleado tiene una sesión activa, y el Empleado pide un refresh antes de loguearse de nuevo, **necesitamos que el token nuevo refleje el estado actual** (`mustChangePassword: true`), no el estado de cuando se logueó por última vez. Si hubiéramos confiado en el valor viejo del token, el guard de la sección 10 nunca se hubiera disparado para ese Empleado hasta que hiciera logout/login de nuevo — un agujero de seguridad real.
5. Se emiten cookies nuevas, igual que en login.

---

## 10. Recuperación de contraseña — Cliente Web (BR-23)

Importante: **esto es solo para `Customer`**. Las cuentas internas (`User`) no tienen recuperación por email — ver la sección 11 para ese otro caso, que todavía no está terminado.

### 10.1. `POST /auth/forgot-password`

`AuthController.forgotPassword(dto)` → `AuthService.forgotPassword(email)` → `CustomersService.forgotPassword(email)`:

1. Busca el cliente por email. **Si no existe, no hace nada y no avisa** — ni un error, ni un mensaje distinto. Esto es a propósito: si el endpoint respondiera distinto según si el email existe o no, cualquiera podría usarlo para "escanear" qué emails están registrados en el sistema (esto se llama *user enumeration*, un problema de seguridad conocido). El controller siempre debería devolver la misma respuesta genérica, sin importar el resultado interno.
2. Si existe, genera un `resetToken` random con expiración de **1 hora** (más corto que las 24hs de verificación de email, porque esta es una acción más sensible: quien tenga el link puede tomar control de la cuenta).
3. Guarda el token en `resetToken` / `resetTokenExpiresAt` de esa fila.
4. Manda el email con un link a `${ECOMMERCE_URL}/reset-password?token=...` — mismo patrón de `try/catch` que en el registro: si Resend falla, se loguea pero no se rompe nada hacia afuera.

### 10.2. `POST /auth/reset-password`

`AuthController.resetPassword(dto)` → `AuthService.resetPassword(dto)` → `CustomersService.resetPassword(dto)`:

1. Busca al cliente **por `resetToken`** (no por id, no por email — el token en sí es la prueba de identidad, porque quien hace este request no sabe su contraseña actual).
2. Si no encuentra ninguno con ese token: `NotFoundException`. A diferencia de `forgotPassword`, acá sí conviene ser explícito con el error — no hay riesgo de enumeración porque el "secreto" es el token, no el email.
3. Si el token está vencido: `BadRequestException`.
4. Si todo bien: hashea `newPassword` (que ya viene validado contra la política de BR-03 por el DTO, mismo regex que en el registro), actualiza `passwordHash`, y limpia `resetToken` / `resetTokenExpiresAt` para que el link no se pueda reusar.

---

## 11. `mustChangePassword` — lo que ya está armado y lo que falta

Esto es para BR-23 del lado de cuentas **internas** (`User`): cuando un Admin o Supervisor resetea la contraseña de un Empleado (porque no hay recuperación por email para cuentas internas), el sistema genera una contraseña temporal y obliga a esa cuenta a definirla de nuevo antes de poder operar el resto del panel.

**Ya armado:**

- El campo `mustChangePassword` viaja en el payload del JWT (sección 7).
- `validateUser()` lo incluye correctamente al loguear.
- `refreshTokens()` lo recalcula desde la base en cada refresh (no confía en el token viejo).
- `JwtStrategy.validate()` lo expone en `req.user.mustChangePassword`.

**Todavía NO armado (próximos pasos):**

1. **El endpoint de reseteo interno** — en `UsersService`, algo como `resetPassword(id, reqRole)`: genera una contraseña temporal random, la hashea, pone `mustChangePassword = true`, y devuelve la contraseña en texto plano en la respuesta (única vez que se ve — no hay email de por medio para cuentas internas). Con la misma restricción de jerarquía que ya tenés en `create`/`update`: Supervisor solo puede resetear `STAFF`, Admin puede resetear cualquiera.

2. **El endpoint de cambio de contraseña obligatorio** — el usuario logueado con `mustChangePassword: true` define su contraseña nueva. Valida BR-03, hashea, guarda, y pone `mustChangePassword = false`.

3. **El guard `MustChangePasswordGuard`** — lee `req.user.mustChangePassword` (ya disponible gracias al trabajo de la sección 7-9) y bloquea con `403` cualquier ruta que no sea la de cambio de contraseña. Como no hay guards globales en este proyecto (sección 6), este guard se agrega a mano en el array `@UseGuards(...)` de cada controller protegido, después de `JwtAuthGuard` y `RolesGuard` (el orden importa: necesita que `req.user` ya esté poblado). La ruta de cambio de contraseña necesita quedar exenta de este chequeo — para eso hace falta un decorator custom (mismo mecanismo que `@Roles()`, con `SetMetadata` + `Reflector` en el guard).

---

## 12. Mapa completo de endpoints de `/auth`

| Endpoint | Guard | DTO | Qué hace |
|---|---|---|---|
| `POST /auth/login` | `LocalAuthGuard` | `LoginDto` | Valida credenciales, emite cookies, hace check-in de asistencia |
| `POST /auth/logout` | `JwtAuthGuard` | — | Invalida el refresh token, hace check-out, limpia cookies |
| `POST /auth/refresh` | `RefreshTokenGuard` | — | Emite un access token nuevo usando el refresh token de la cookie |
| `POST /auth/register-customer` | (público) | `CreateCustomerDto` | Crea un Cliente Web, manda email de verificación |
| `POST /auth/verify-email` | (público) | `VerifyEmailDto` | Confirma el email con el token del link |
| `POST /auth/forgot-password` | (público) | `ForgotPasswordDto` | Genera reset token y manda el email (silencioso si el email no existe) |
| `POST /auth/reset-password` | (público) | `ResetPasswordDto` | Cambia la contraseña usando el token del email |

Los tres "(público)" son a propósito: son las únicas puertas de entrada al sistema para alguien que todavía no tiene sesión — no pueden llevar `JwtAuthGuard` porque, por definición, quien los usa no está logueado todavía.
