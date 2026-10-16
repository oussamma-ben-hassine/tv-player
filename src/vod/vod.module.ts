import { Module } from '@nestjs/common';
import { VodService } from './vod.service';
import { VodController, AdminVodController } from './vod.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VodController, AdminVodController],
  providers: [VodService],
  exports: [VodService],
})
export class VodModule {}
