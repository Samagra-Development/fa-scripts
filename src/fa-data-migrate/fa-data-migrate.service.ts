import { HttpException, Injectable } from '@nestjs/common';
import {
  FusionAuthClient,
  SearchResponse,
  Sort,
  User,
} from '@fusionauth/typescript-client';
import ClientResponse from '@fusionauth/typescript-client/build/src/ClientResponse';
import { doc } from 'prettier';
import { BasePrefixes } from './base-prefixes';
import { randomInt } from 'crypto';
import * as fs from 'fs';
import * as Readline from 'n-readlines';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FaDataMigrateService {
  private sourceFaBaseUrl: string;
  private sourceFaApiKey: string;
  private targetFaBaseUrl: string;
  private targetFaApiKey: string;
  private defaultUserImportPassword: string;
  private allUsernamePrefixes: Array<string>;

  /**
   * Holds the additional information about the downloaded data which must be present in target FA before importing users
   * @private
   */
  private downloadAddons: {
    uniqueIds: object;
    groups: object;
    applicationIds: object;
  } = {
    uniqueIds: {},
    groups: {},
    applicationIds: {},
  };

  constructor(private readonly configService: ConfigService) {
    this.sourceFaBaseUrl = configService.get<string>('SOURCE_FA_BASE_URL');
    this.sourceFaApiKey = configService.get<string>('SOURCE_FA_API_KEY');
    this.targetFaBaseUrl = configService.get<string>('TARGET_FA_BASE_URL');
    this.targetFaApiKey = configService.get<string>('TARGET_FA_API_KEY');
    this.defaultUserImportPassword = configService.get<string>(
      'DEFAULT_USER_IMPORT_PASSWORD',
    );
  }

  private loadApplicationIdPrefixes(applicationId: string) {
    // load from file if exists
    const prefixesFilePath = `./gen/prefixes/${applicationId}.json`;
    if (fs.existsSync(prefixesFilePath)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.allUsernamePrefixes = JSON.parse(
        fs.readFileSync(prefixesFilePath, 'utf8'),
      );
      if (!this.allUsernamePrefixes.length) {
        this.allUsernamePrefixes = BasePrefixes.all();
        this.saveApplicationIdPrefixes(applicationId);
      }
    } else {
      this.allUsernamePrefixes = BasePrefixes.all();
      this.saveApplicationIdPrefixes(applicationId);
    }
  }

  private saveApplicationIdPrefixes(applicationId: string) {
    const prefixesFilePath = `./gen/prefixes/${applicationId}.json`;
    fs.writeFileSync(
      prefixesFilePath,
      JSON.stringify(this.allUsernamePrefixes),
    );
  }

  private static faSourceClient(): FusionAuthClient {
    return new FusionAuthClient(
      process.env.SOURCE_FA_API_KEY,
      process.env.SOURCE_FA_BASE_URL,
    );
  }

  private static faTargetClient(): FusionAuthClient {
    return new FusionAuthClient(
      process.env.TARGET_FA_API_KEY,
      process.env.TARGET_FA_BASE_URL,
    );
  }

  private generatePrefixes(basePrefix: string) {
    BasePrefixes.all().forEach((char: string) => {
      this.allUsernamePrefixes.push(`${basePrefix}${char}`);
    });
  }

  private async fetchUsersForPrefix(
    applicationId: string,
    numberOfResults: number,
    startRow: number,
    prefix: string,
  ) {
    console.log(
      `Prefix: ${prefix} | ${startRow} | ${numberOfResults} | Fetching...`,
    );
    const searchRequest = {
      search: {
        numberOfResults: numberOfResults,
        query: `{"bool":{"must":[{"nested":{"path":"registrations","query":{"bool":{"must":[{"match":{"registrations.applicationId":"${applicationId}"}}]}}}},{"bool":{"must":[{"wildcard":{"username":{"value":"${prefix}*"}}}]}}]}}`,
        startRow: startRow,
        sortFields: [
          {
            name: 'id',
            order: Sort.asc,
          },
        ],
      },
    };

    const promiseWithTimeout = (promise) => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timed out'));
        }, 1000);
      });
      return {
        promiseOrTimeout: Promise.race([promise, timeoutPromise]),
        timeoutId,
      };
    };

    const callFa = FaDataMigrateService.faSourceClient()
      .searchUsersByQuery(searchRequest)
      .then(
        (
          response: ClientResponse<SearchResponse>,
        ): { total: number; users: Array<User> } => {
          return {
            total: response.response.total,
            users: response.response.users,
          };
        },
      )
      .catch((e): { total: number; users: Array<User> } => {
        console.log(
          `Could not fetch users for applicationId ${applicationId}`,
          JSON.stringify(e),
        );
        if (!(e.statusCode < 300 && e.statusCode >= 200)) {
          throw new HttpException(
            'Upstream API responded with error!!',
            e.statusCode,
          );
        }
        return {
          total: 0,
          users: [],
        };
      });

    let result = null;
    const fetchData = async () => {
      const { promiseOrTimeout, timeoutId } = promiseWithTimeout(callFa);
      try {
        result = await promiseOrTimeout;
      } catch (error) {
        console.log(error);
        result = null;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    await fetchData();

    return result;
  }

  async download(applicationId: string, numberOfResults = 500): Promise<any> {
    this.loadApplicationIdPrefixes(applicationId); // load the prefixes from file or all if it's a fresh start
    while (true) {
      if (this.allUsernamePrefixes.length === 0) {
        // we'll stop once there are no new prefixes to search on to.
        break;
      }

      const randomItem = (arr) =>
        arr.splice((Math.random() * arr.length) | 0, 1);
      const prefix = randomItem(this.allUsernamePrefixes).pop(); // pop an item from array
      let startRow = 0;
      let totalResults = 0;
      let users = [];
      while (true) {
        const result = await this.fetchUsersForPrefix(
          applicationId,
          randomInt(300, 1000),
          startRow,
          prefix,
        );
        console.log(
          `Prefix: ${prefix} | ${startRow} | ${numberOfResults} | FETCHED`,
        );
        if (result === null) {
          console.error(
            "ES timed out the request. We'll re-add this prefix into the array so that if gets processed..",
          );
          this.allUsernamePrefixes.push(prefix);
          users = []; // clean this array to exclude from dumping into the file
          break;
        }

        if (result.total >= 10000) {
          // we will generate new prefixes for this char and ignore this iteration result
          console.log(
            `Prefix: ${prefix} | Found ${result.total} > 10000; narrowing down search over sub-prefixes...`,
          );
          this.generatePrefixes(prefix);
          this.saveApplicationIdPrefixes(applicationId);
          break;
        }

        totalResults += result.users ? result.users.length : 0;
        if (result.users) {
          users = users.concat(
            result.users.filter((user: User) => {
              if (!this.downloadAddons.uniqueIds.hasOwnProperty(user.id)) {
                this.downloadAddons.uniqueIds[user.id] = true; // add to unique list
                user.registrations.forEach((registration) => {
                  if (!this.downloadAddons.applicationIds.hasOwnProperty(registration.applicationId)) {
                    this.downloadAddons.applicationIds[registration.applicationId] = {
                      roles: [],
                    }; // add application id
                  }
                  if (registration && registration.roles) {
                    registration.roles.forEach((role) => {
                      this.downloadAddons.applicationIds[registration.applicationId].roles.push(role);
                      this.downloadAddons.applicationIds[registration.applicationId].roles = this.downloadAddons.applicationIds[registration.applicationId].roles.filter(this.onlyUnique);
                    });
                  }
                }); // forEach() ends

                if (user.memberships) {
                  user.memberships.forEach((membership) => {
                    if (!this.downloadAddons.groups.hasOwnProperty(membership.groupId)) {
                      this.downloadAddons.groups[membership.groupId] = true;
                    }
                  })
                }
                return true;
              }
              return !this.downloadAddons.uniqueIds.hasOwnProperty(user.id);
            }),
          ); // add all the result into global array
        }
        startRow = totalResults; // change the stat row
        console.log(
          `Prefix: ${prefix} | Found results. Fetched: ${totalResults}/${result.total}`,
        );
        if (
          result.total === 0 ||
          result.users.length === 0 ||
          totalResults >= result.total
        ) {
          break;
        }
      } // while() ends
      this.saveApplicationIdPrefixes(applicationId);
      users.forEach((user) => {
        fs.appendFileSync(
          `./gen/json/${applicationId}.txt`,
          JSON.stringify(user) + '\n',
        );
      });
      // await this.sleep(500);
    } // while() ends
    this.downloadAddons.uniqueIds = {}; // set empty as we don't want to overload json
    fs.writeFileSync(
      `./gen/json/${applicationId}-addons.json`,
      JSON.stringify(this.downloadAddons),
    );
    return [];
  }

  async importUsers(users: Array<User>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    return FaDataMigrateService.faTargetClient()
      .importUsers({
        users: users,
        validateDbConstraints: true,
      })
      .then((response: ClientResponse<void>) => {
        console.log(response);
        return {};
      })
      .catch((e) => {
        console.error(`Could not import users`, JSON.stringify(e));
        return {};
      });
  }

  async upload(applicationId: string, chunkSize = 500) {
    let jsonLine;
    let lineNumber = 0;
    const jsonLines = new Readline(`./gen/json/${applicationId}.txt`);

    let users: Array<User> = [];
    while ((jsonLine = jsonLines.next())) {
      if (lineNumber % chunkSize == 0) {
        await this.importUsers(users);
        users = [];
      }
      const user: User = JSON.parse(jsonLine);
      user.password = this.defaultUserImportPassword;
      users.push(user);
      lineNumber++;
    }
    await this.importUsers(users); // push the last remaining users
    console.log('end of file.', lineNumber);
  }

  async deleteTargetFaUsers(applicationId: string) {
    const response = await FaDataMigrateService.faTargetClient()
      .deleteUsersByQuery({
        hardDelete: true,
        query: `{"bool":{"must":[{"nested":{"path":"registrations","query":{"bool":{"must":[{"match":{"registrations.applicationId":"${applicationId}"}}]}}}}]}}`,
      })
      .then((response) => {
        console.log(response);
        return response;
      })
      .catch((e) => {
        console.log(e);
        return e;
      });
    console.log(response);
    return response;
  }

  private onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
}
