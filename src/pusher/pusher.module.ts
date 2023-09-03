import { Module } from '@nestjs/common';
import * as Pusher from 'pusher';

@Module({
  providers: [
    {
      provide: 'PUSHER',
      useFactory: () => {
        return new Pusher({
          appId: process.env.APP_ID,
          key: process.env.APP_KEY,
          secret: process.env.APP_SECRET,
          cluster: process.env.APP_CLUSTER,
          useTLS: true,
        });
      },
    },
  ],
  exports: ['PUSHER'],
})
export class PusherModule {}
