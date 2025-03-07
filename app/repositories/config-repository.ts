import { forex } from '@/db/drizzle/schema';
import type { CurrencySelect, ForexInsert } from '@/db/drizzle/types';
import { and, between, desc, eq, inArray } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { Repository } from './abstract-repository';
import type { UserConfigKey } from './helper';

export class ConfigRepository extends Repository {
  protected static instance: ConfigRepository;

  private constructor() {
    super();
  }

  protected static async createInstance(): Promise<ConfigRepository> {
    if (!ConfigRepository.instance) {
      ConfigRepository.instance = new ConfigRepository();
    }

    return ConfigRepository.instance;
  }

  public async getAllCurrencies() {
    return await this.db.query.currencies.findMany();
  }

  public async getCurrencyByCode(code: string) {
    return await this.db.query.currencies.findFirst({
      where: (currency, { eq }) => eq(currency.code, code),
    });
  }

  public async getUserConfig(key: UserConfigKey) {
    return await this.db.query.information.findFirst({
      where: (information, { eq }) => eq(information.name, key),
    });
  }

  public async getAllCountries() {
    return await this.db.query.countries.findMany({
      with: {
        defaultCurrency: true,
      },
    });
  }

  public async getCountryByCode(countryCodes: string) {
    return await this.db.query.countries.findFirst({
      where: ({ code }, { eq }) => eq(code, countryCodes),
    });
  }

  public async getCountriesByCode(countryCodes: string[]) {
    return await this.db.query.countries.findMany({
      where: ({ code }, { inArray }) => inArray(code, countryCodes),
    });
  }

  public async getLatestFxRate({
    baseCurrency,
    targetCurrencies,
    timeRange,
  }: {
    baseCurrency: CurrencySelect;
    targetCurrencies: CurrencySelect[];
    timeRange: { start: DateTime; end: DateTime };
  }) {
    const targetCurrencyCodes = targetCurrencies.map((currency) => currency.code);

    return await this.db
      .selectDistinctOn([forex.baseCurrency, forex.targetCurrency])
      .from(forex)
      .where(
        and(
          eq(forex.baseCurrency, baseCurrency.code),
          inArray(forex.targetCurrency, targetCurrencyCodes),
          between(forex.createAt, timeRange.start.toJSDate(), timeRange.end.toJSDate()),
        ),
      )
      .orderBy(forex.baseCurrency, forex.targetCurrency, desc(forex.createAt));
  }

  public async insertFxRate(inserts: ForexInsert[]) {
    return await this.db.insert(forex).values(inserts).returning();
  }
}
