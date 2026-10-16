import { Module } from '@nestjs/common';
import { EpgService } from './epg.service';
import { EpgController } from './epg.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EpgController],
  providers: [EpgService],
  exports: [EpgService],
})
export class EpgModule {}
