import { Test, TestingModule } from '@nestjs/testing';
import { FaDataMigrateController } from './fa-data-migrate.controller';

describe('FaDataMigrateController', () => {
  let controller: FaDataMigrateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaDataMigrateController],
    }).compile();

    controller = module.get<FaDataMigrateController>(FaDataMigrateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
