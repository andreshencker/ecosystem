import { Module } from '@nestjs/common';
import { MdmService } from './mdm.service';
import { MdmController } from './mdm.controller';

@Module({
  providers: [MdmService],
  controllers: [MdmController],
  exports: [MdmService],
})
export class MdmModule {}
