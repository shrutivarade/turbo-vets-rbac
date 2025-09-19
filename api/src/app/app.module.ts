import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseTestService } from './database-test.service';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Task } from '../entities/task.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SeedService } from '../seed/seed.service';
import { AuditModule } from '../audit/audit.module';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { TasksModule } from '../tasks/tasks.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'api/.env'], // Check both locations
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || 'rbac.sqlite',
      entities: [User, Organization, Task, AuditLog],
      synchronize: true, // Auto-create tables
      logging: true, // See SQL queries in development
    }),
    TypeOrmModule.forFeature([User, Organization, Task, AuditLog]),
    AuthModule,
    AuditModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseTestService,
    SeedService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
