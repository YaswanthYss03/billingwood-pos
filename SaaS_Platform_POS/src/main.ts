import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // CORS Configuration - Production Ready
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      // In development, allow all localhost origins
      if (process.env.NODE_ENV !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      
      // Allow Vercel preview deployments
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Universal SaaS POS API')
      .setDescription('Phase 1 MVP - Production-ready POS Backend')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('users', 'User management')
      .addTag('items', 'Items and categories')
      .addTag('inventory', 'Inventory management')
      .addTag('purchases', 'Purchase orders')
      .addTag('billing', 'Billing operations')
      .addTag('kot', 'Kitchen order tickets')
      .addTag('printing', 'Print jobs')
      .addTag('reports', 'Reports and analytics')
      .addTag('audit', 'Audit logs')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);

  // Initialize Supabase Storage bucket for file uploads
  try {
    const { FileUploadService } = await import('./common/services/file-upload.service');
    const { ConfigService } = await import('@nestjs/config');
    const configService = app.get(ConfigService);
    const fileUploadService = new FileUploadService(configService);
    await fileUploadService.ensureBucketExists();
    console.log('✅ Supabase Storage bucket initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Supabase Storage bucket:', error.message);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received: closing HTTP server and database connections');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received: closing HTTP server and database connections');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
