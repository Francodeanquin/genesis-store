import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import basicAuth from 'express-basic-auth';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  app.setGlobalPrefix('api');
  app.useLogger(logger);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = process.env.PORT ?? 3000;
  const config = new DocumentBuilder()
    .setTitle('Genesis Store')
    .setDescription('Genesis API documentation')
    .setVersion('1.5')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const swaggerCredentialsSet =
    process.env.SWAGGER_USER && process.env.SWAGGER_PASSWORD;
  const shouldExposeDocs =
    process.env.NODE_ENV !== 'production' || swaggerCredentialsSet;

  if (process.env.NODE_ENV === 'production' && swaggerCredentialsSet) {
    app.use(
      ['/api/docs', '/api/docs-json'],
      basicAuth({
        challenge: true,
        users: { [process.env.SWAGGER_USER!]: process.env.SWAGGER_PASSWORD! },
      }),
    );
  }

  if (shouldExposeDocs) {
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);

  logger.log('*******************************************************');
  logger.log('Backend running on : http://localhost:' + port + '/api');
  logger.log('*******************************************************');
}
bootstrap();
