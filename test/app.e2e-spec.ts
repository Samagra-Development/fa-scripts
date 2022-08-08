import { Test } from '@nestjs/testing';
import { CommandModule, CommandModuleTest } from 'nestjs-command';
import { AppModule } from '../src/app.module';

describe('AppModule', () => {
  let commandModule: CommandModuleTest;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    commandModule = new CommandModuleTest(app.select(CommandModule));
  });

  it('test command module', async () => {
    const command = 'create:user <username>';
    const args = { username: 'Foo', group: 'Bar', saber: false };

    const user = await commandModule.execute(command, args);
    console.log(user);
    expect(user.username).toBe('Foo');
    expect(user.group).toBe('Bar');
  });
});
