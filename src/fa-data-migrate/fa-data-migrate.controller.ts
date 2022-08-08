import { Controller, Get, Post, Query } from "@nestjs/common";
import { FaDataMigrateService } from './fa-data-migrate.service';

@Controller('fa-data-migrate')
export class FaDataMigrateController {
  constructor(private readonly service: FaDataMigrateService) {}

  @Get('download')
  download(@Query('applicationId') applicationId: string) {
    return this.service.download(applicationId);
  }

  @Get('upload')
  upload(@Query('applicationId') applicationId: string) {
    return this.service.upload(applicationId);
  }

  @Post('delete-target-users')
  deleteTargetFaUsers(@Query('applicationId') applicationId: string) {
    return this.service.deleteTargetFaUsers(applicationId);
  }
}
