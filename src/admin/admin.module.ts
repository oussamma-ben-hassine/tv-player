import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SourcesModule } from '../sources/sources.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, SourcesModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
