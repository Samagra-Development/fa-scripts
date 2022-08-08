import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { FaDataMigrateService } from './fa-data-migrate.service';

@Injectable()
export class FaDataMigrateCommand {
  constructor(private readonly service: FaDataMigrateService) {}

  @Command({
    command: 'download:users <applicationId>',
    describe:
      'Download Users data from the given applicationId & store it into JSON file.',
  })
  async download(
    @Positional({
      name: 'applicationId',
      describe: 'Application ID',
      type: 'string',
    })
    applicationId: string,
  ): Promise<any> {
    return this.service.download(applicationId);
  }
}