import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AttachmentAccessPolicy } from './attachment.policy';
import { AttachmentController } from './attachment.controller';
import { AttachmentService } from './attachment.service';
import { BlobConfig, loadBlobConfig } from './blob.config';
import { BlobService, BLOBCONFIG_TOKEN, BLOBSTORE_TOKEN } from './blob.service';
import { LocalBlobStore } from './local-blobstore';
import { S3BlobStore } from './s3-blobstore';
import { NdaPolicy } from './nda.policy';
import { EventModule } from '../events/event.module';

@Module({
  imports: [EventModule],
  controllers: [AttachmentController],
  providers: [
    PrismaService,
    AttachmentService,
    AttachmentAccessPolicy,
    NdaPolicy,
    BlobService,
    {
      provide: BLOBCONFIG_TOKEN,
      useFactory: (): BlobConfig => loadBlobConfig(),
    },
    {
      provide: BLOBSTORE_TOKEN,
      inject: [BLOBCONFIG_TOKEN],
      useFactory: (config: BlobConfig) => {
        if (config.driver === 's3') {
          return new S3BlobStore(config.s3 || {});
        }
        return new LocalBlobStore(config.localRoot);
      },
    },
  ],
  exports: [BlobService, AttachmentService],
})
export class BlobModule {}
