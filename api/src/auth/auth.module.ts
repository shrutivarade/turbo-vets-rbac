import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PolicyGuard } from './policy.guard';

@Module({
  imports: [
    // Register User entity for dependency injection
    TypeOrmModule.forFeature([User]),
    
    // Configure Passport for JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configure JWT module with async config
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev_secret_change_me',
        signOptions: { 
          expiresIn: '2h',  // Token expires in 2 hours
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PolicyGuard],
  exports: [AuthService, JwtStrategy, PassportModule, PolicyGuard],
})
export class AuthModule {}