import { Controller, Get, Query } from '@nestjs/common';
import { FaDataMigrateService } from './fa-data-migrate.service';

@Controller('fa-data-migrate')
export class FaDataMigrateController {
  constructor(private readonly service: FaDataMigrateService) {}

  @Get('download')
  download(@Query('applicationId') applicationId: string) {
    return this.service.download(applicationId);
  }
}
