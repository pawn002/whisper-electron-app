import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Electron frontend
  app.enableCors({
    origin: ['http://localhost:4200', 'file://*'],
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  const port = process.env.PORT || 3333;
  await app.listen(port);
  
  console.log(`🚀 Backend server is running on: http://localhost:${port}`);
}

bootstrap();
