import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SourcesModule } from '../sources/sources.module';
import { EpgModule } from '../epg/epg.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, SourcesModule, EpgModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
