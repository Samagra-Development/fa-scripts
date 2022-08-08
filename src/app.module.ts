import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { UserCommand } from './user/user.command';
import { UserService } from './user/user.service';
import { FaDataMigrateCommand } from './fa-data-migrate/fa-data-migrate.command';
import { FaDataMigrateService } from './fa-data-migrate/fa-data-migrate.service';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FaDataMigrateController } from './fa-data-migrate/fa-data-migrate.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CommandModule,
  ],
  providers: [
    UserCommand,
    UserService,
    FaDataMigrateCommand,
    FaDataMigrateService,
    AppService,
  ],
  controllers: [AppController, FaDataMigrateController],
})
export class AppModule {}
