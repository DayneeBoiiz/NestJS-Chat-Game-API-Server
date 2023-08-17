import { Module } from '@nestjs/common';
import { GlobalGateway } from './global.gateway';

@Module({
  providers: [GlobalGateway],
  exports: [GlobalGateway], // Export the gateway so it can be injected elsewhere
})
export class GlobalModule {}
