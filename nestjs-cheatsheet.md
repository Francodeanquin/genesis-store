# NestJS Cheat Sheet

## 1. Instalación y CLI

```bash
npm i -g @nestjs/cli
nest new proyecto
nest g module usuarios
nest g controller usuarios
nest g service usuarios
nest g resource usuarios      # CRUD completo (module+controller+service+dto+entity)
nest g guard auth
nest g interceptor logging
nest g pipe validation
nest g filter http-exception
nest g decorator roles
```

Estructura típica:
```
src/
  main.ts
  app.module.ts
  usuarios/
    usuarios.module.ts
    usuarios.controller.ts
    usuarios.service.ts
    dto/
    entities/
```

`main.ts` básico:
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
```

---

## 2. Módulos

```ts
import { Module } from '@nestjs/common';

@Module({
  imports: [OtroModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService], // para que otros módulos lo usen
})
export class UsuariosModule {}
```

- `imports`: módulos que se necesitan.
- `providers`: servicios inyectables (scope del módulo).
- `exports`: providers visibles para módulos que importen este.
- Módulo global: `@Global()` (evita tener que importarlo en todos lados).

---

## 3. Controllers

```ts
import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, Headers, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  findAll(@Query('activo') activo?: string) {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(+id);
  }
}
```

Otros decoradores útiles: `@Req()`, `@Res()` (cuidado: usar `@Res()` rompe el manejo automático de respuestas de Nest salvo `passthrough: true`), `@Headers()`, `@Ip()`, `@HostParam()`.

---

## 4. Providers, Servicios e Inyección de Dependencias

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsuariosService {
  private usuarios = [];

  findAll() {
    return this.usuarios;
  }
}
```

Scopes de providers:
```ts
@Injectable({ scope: Scope.DEFAULT })   // singleton (default)
@Injectable({ scope: Scope.REQUEST })   // nueva instancia por request
@Injectable({ scope: Scope.TRANSIENT }) // nueva instancia por consumidor
```

Custom providers:
```ts
{
  provide: 'CONFIG_TOKEN',
  useValue: { apiKey: '123' },
}
{
  provide: 'ASYNC_TOKEN',
  useFactory: async (config: ConfigService) => await createConnection(config),
  inject: [ConfigService],
}
{
  provide: InterfaceToken,
  useClass: ImplementacionConcreta,
}
```

Inyectar con `@Inject()`:
```ts
constructor(@Inject('CONFIG_TOKEN') private config: any) {}
```

---

## 5. DTOs y Validación (class-validator / class-transformer)

```bash
npm i class-validator class-transformer
```

```ts
import { IsString, IsEmail, IsInt, IsOptional, MinLength, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsEmail()
  email: string;

  @IsInt()
  @IsOptional()
  edad?: number;
}
```

Activar validación global en `main.ts`:
```ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({
  whitelist: true,          // elimina props no declaradas en el DTO
  forbidNonWhitelisted: true,
  transform: true,          // transforma payloads a instancias de la clase
}));
```

`PartialType`, `PickType`, `OmitType` (de `@nestjs/mapped-types` o `@nestjs/swagger`):
```ts
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
```

---

## 6. Pipes

Transforman/validan args antes de llegar al handler.

```ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    const val = parseInt(value, 10);
    if (isNaN(val)) throw new BadRequestException('No es un número');
    return val;
  }
}
```

Pipes built-in: `ParseIntPipe`, `ParseBoolPipe`, `ParseArrayPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `DefaultValuePipe`, `ValidationPipe`.

Uso: `@Param('id', ParseIntPipe) id: number`

---

## 7. Guards (autorización)

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.headers['authorization'];
  }
}
```

Aplicar: `@UseGuards(AuthGuard)` (a nivel método, controller o global con `app.useGlobalGuards()`).

---

## 8. Interceptors

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const inicio = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`Tardó ${Date.now() - inicio}ms`)),
    );
  }
}
```

Usos comunes: logging, transformar respuesta, cachear, manejar timeouts (`timeout()` de RxJS).

---

## 9. Exception Filters

```ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
    });
  }
}
```

Excepciones built-in: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `InternalServerErrorException`, etc.

Aplicar: `@UseFilters(HttpExceptionFilter)` o global con `app.useGlobalFilters()`.

---

## 10. Middleware

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  }
}
```

Registrar en el módulo:
```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
    // o .forRoutes({ path: 'usuarios', method: RequestMethod.GET })
  }
}
```

**Orden de ejecución:** Middleware → Guards → Interceptors (pre) → Pipes → Handler → Interceptors (post) → Exception Filters.

---

## 11. Custom Decorators

```ts
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

// Param decorator
export const Usuario = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
// Uso: @Usuario('email') email: string

// Metadata decorator (para guards con Reflector)
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
// Uso: @Roles('admin')
```

Leer metadata en un guard:
```ts
constructor(private reflector: Reflector) {}
const roles = this.reflector.get<string[]>('roles', context.getHandler());
```

Combinar decoradores: `applyDecorators(...)`.

---

## 12. Configuración (`@nestjs/config`)

```bash
npm i @nestjs/config
```

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
});
```

```ts
constructor(private configService: ConfigService) {}
const puerto = this.configService.get<number>('PORT');
```

Con validación (usando Joi):
```bash
npm i joi
```
```ts
ConfigModule.forRoot({
  validationSchema: Joi.object({
    PORT: Joi.number().default(3000),
    JWT_SECRET: Joi.string().required(),
  }),
});
```

---

## 13. Bases de datos

### TypeORM (`@nestjs/typeorm`)

```bash
npm i @nestjs/typeorm typeorm pg
```

```ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'test',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: true, // solo en dev
});
```

Entity:
```ts
@Entity()
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Post, (post) => post.autor)
  posts: Post[];
}
```

Repository en un módulo/servicio:
```ts
// módulo
TypeOrmModule.forFeature([Usuario])

// servicio
constructor(@InjectRepository(Usuario) private repo: Repository<Usuario>) {}
this.repo.find();
this.repo.findOneBy({ id });
this.repo.save(usuario);
this.repo.delete(id);
```

### Prisma

```bash
npm i prisma @prisma/client
npx prisma init
```

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### Mongoose (MongoDB)

```bash
npm i @nestjs/mongoose mongoose
```

```ts
MongooseModule.forRoot('mongodb://localhost/nest');

@Schema()
export class Usuario {
  @Prop() nombre: string;
  @Prop({ unique: true }) email: string;
}
export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

// módulo
MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }])

// servicio
constructor(@InjectModel(Usuario.name) private model: Model<Usuario>) {}
```

---

## 14. Autenticación con Passport + JWT

```bash
npm i @nestjs/passport passport passport-local passport-jwt @nestjs/jwt bcrypt
npm i -D @types/passport-local @types/passport-jwt @types/bcrypt
```

### Estrategia local (login con usuario/contraseña)

```ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }
  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException();
    return user; // se inyecta en request.user
  }
}
```

### AuthService

```ts
@Injectable()
export class AuthService {
  constructor(private usuariosService: UsuariosService, private jwtService: JwtService) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usuariosService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...rest } = user;
      return rest;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
```

### Estrategia JWT

```ts
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

### AuthModule

```ts
@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

### Guards y controller de auth

```ts
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  getPerfil(@Request() req) {
    return req.user;
  }
}
```

### Guard de roles (RBAC)

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequeridos) return true;
    const { user } = context.switchToHttp().getRequest();
    return rolesRequeridos.some((rol) => user.roles?.includes(rol));
  }
}
// Uso: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')
```

Guard global por defecto (proteger toda la app salvo rutas `@Public()`):
```ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

---

## 15. Swagger / OpenAPI

```bash
npm i @nestjs/swagger
```

```ts
const config = new DocumentBuilder()
  .setTitle('API')
  .setDescription('Documentación')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

Decoradores: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiProperty()` (en DTOs), `@ApiBearerAuth()`.

---

## 16. Testing

```bash
npm i -D jest @nestjs/testing supertest
```

Unit test:
```ts
describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariosService],
    }).compile();
    service = module.get(UsuariosService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });
});
```

Mockear un provider:
```ts
Test.createTestingModule({
  providers: [
    UsuariosService,
    { provide: getRepositoryToken(Usuario), useValue: mockRepo },
  ],
}).compile();
```

e2e test:
```ts
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });
});
```

Comandos: `npm run test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e`.

---

## 17. WebSockets

```bash
npm i @nestjs/websockets @nestjs/platform-socket.io
```

```ts
@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('mensaje')
  handleMessage(@MessageBody() data: string, @ConnectedSocket() client: Socket) {
    this.server.emit('mensaje', data);
  }
}
```

---

## 18. GraphQL

```bash
npm i @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

```ts
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true, // code-first
});
```

```ts
@Resolver(() => Usuario)
export class UsuariosResolver {
  @Query(() => [Usuario])
  usuarios() {
    return this.usuariosService.findAll();
  }

  @Mutation(() => Usuario)
  crearUsuario(@Args('input') input: CreateUsuarioInput) {
    return this.usuariosService.create(input);
  }
}
```

---

## 19. Microservices

```bash
npm i @nestjs/microservices
```

```ts
// main.ts (microservicio)
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.TCP, // o REDIS, NATS, RABBITMQ, KAFKA, GRPC
  options: { host: '0.0.0.0', port: 3001 },
});
```

```ts
@MessagePattern('sumar')
sumar(data: { a: number; b: number }) {
  return data.a + data.b;
}

@EventPattern('usuario_creado')
handleUsuarioCreado(data: any) { /* ... */ }
```

Cliente:
```ts
constructor(@Inject('MATH_SERVICE') private client: ClientProxy) {}
this.client.send('sumar', { a: 1, b: 2 });
this.client.emit('usuario_creado', data);
```

---

## 20. Tareas programadas (`@nestjs/schedule`)

```bash
npm i @nestjs/schedule
```

```ts
ScheduleModule.forRoot(); // en el módulo raíz

@Injectable()
export class TareasService {
  @Cron('45 * * * * *')
  handleCron() { /* cada minuto en el segundo 45 */ }

  @Interval(10000)
  handleInterval() { /* cada 10s */ }

  @Timeout(5000)
  handleTimeout() { /* una vez, a los 5s de arrancar */ }
}
```

---

## 21. Caching (`@nestjs/cache-manager`)

```bash
npm i @nestjs/cache-manager cache-manager
```

```ts
CacheModule.register({ isGlobal: true, ttl: 5000 });

@UseInterceptors(CacheInterceptor)
@Get()
findAll() { /* ... */ }

// manual
constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}
await this.cache.set('key', value);
await this.cache.get('key');
```

---

## 22. Subida de archivos (Multer)

```ts
@Post('upload')
@UseInterceptors(FileInterceptor('archivo'))
uploadFile(@UploadedFile() archivo: Express.Multer.File) {
  return archivo;
}

// múltiples
@UseInterceptors(FilesInterceptor('archivos', 10))
```

---

## 23. Rate limiting (`@nestjs/throttler`)

```bash
npm i @nestjs/throttler
```

```ts
ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]);

// global
{ provide: APP_GUARD, useClass: ThrottlerGuard }

// override por ruta
@Throttle({ default: { limit: 3, ttl: 60000 } })
@SkipThrottle()
```

---

## 24. Versionado y CORS

```ts
app.enableVersioning({ type: VersioningType.URI }); // /v1/usuarios
// @Controller({ path: 'usuarios', version: '1' })

app.enableCors({
  origin: ['https://miapp.com'],
  credentials: true,
});
```

---

## 25. Ciclo de vida (lifecycle hooks)

`OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `BeforeApplicationShutdown`, `OnApplicationShutdown` — se implementan como interfaces en providers o módulos (`onModuleInit()`, etc.).

---

## 26. Paquetes comunes del ecosistema Nest

| Paquete | Uso |
|---|---|
| `@nestjs/config` | variables de entorno |
| `@nestjs/typeorm`, `typeorm` | ORM SQL |
| `@nestjs/mongoose`, `mongoose` | ODM MongoDB |
| `prisma`, `@prisma/client` | ORM alternativo |
| `@nestjs/passport`, `passport` | autenticación |
| `passport-jwt`, `@nestjs/jwt` | JWT |
| `passport-local` | login usuario/contraseña |
| `bcrypt` | hash de contraseñas |
| `class-validator`, `class-transformer` | validación de DTOs |
| `@nestjs/swagger` | documentación OpenAPI |
| `@nestjs/schedule` | cron jobs |
| `@nestjs/cache-manager` | caché |
| `@nestjs/throttler` | rate limiting |
| `@nestjs/websockets` | websockets |
| `@nestjs/graphql`, `apollo-server` | GraphQL |
| `@nestjs/microservices` | comunicación entre microservicios |
| `@nestjs/bull` / `@nestjs/bullmq` | colas de trabajo (Redis) |
| `@nestjs/terminus` | health checks |
| `helmet` | headers de seguridad HTTP |
| `compression` | compresión gzip de respuestas |
| `nest-winston` / `pino` | logging avanzado |

---

## 27. Health checks (`@nestjs/terminus`)

```bash
npm i @nestjs/terminus
```

```ts
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
```

---

## 28. Buenas prácticas rápidas

- Un módulo por dominio/feature, con su controller, service y DTOs propios.
- Nunca inyectar el `Repository`/modelo directo en el controller: pasa siempre por el service.
- Usar DTOs de entrada y salida separados si la entidad expone datos sensibles (ej. password).
- `ConfigService` en vez de `process.env` directo.
- Guards para autenticación/autorización, Pipes para validación/transformación, Interceptors para lógica transversal (logging, caché, mapeo de respuesta), Filters para manejo de errores.
- Usar `forwardRef()` solo para romper dependencias circulares entre módulos, evitarlo si se puede rediseñar.
