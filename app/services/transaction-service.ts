'use client';

import { parseNumber } from '@/components/common-functions';
import type { TransactionForm } from '@/components/compositions/manage-transactions/add-transaction-drawer/form-schema';
import schema from '@/db/drizzle/schema';
import type {
  CurrencySelect,
  JournalEntryType,
  PgliteTransaction,
  TransactionInsert,
} from '@/db/drizzle/types';
import { and, between, eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import type { FetchFxRate } from '../api/get-latest-fx-rate/route';
import { Service } from './abstract-service';
import { AccountsService } from './accounts-service';
import { ConfigService } from './config-service';

const { transactions, journalEntries, journalEntryFxRates } = schema;

export class TransactionService extends Service {
  protected static instance: TransactionService;

  private configService!: ConfigService;
  private accountsService!: AccountsService;

  private constructor() {
    super();
  }

  protected static async createInstance(): Promise<TransactionService> {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
      TransactionService.instance.configService = await ConfigService.getInstance();
      TransactionService.instance.accountsService = await AccountsService.getInstance();
    }

    return TransactionService.instance;
  }

  public async getSummary(from: Date, to: Date, baseCurrency: CurrencySelect) {
    const incomeEntries = await this.getJournalEntries('income', { from, to });
    const expenseEntries = await this.getJournalEntries('expense', { from, to });
    const currencies = incomeEntries.concat(expenseEntries).map((entry) => entry.currency);

    if (incomeEntries.length === 0 && expenseEntries.length === 0) {
      return {
        income: 0,
        expense: 0,
      };
    }

    let fxRates: FetchFxRate | null = null;
    if (!currencies.every((currency) => currency.id === baseCurrency.id)) {
      const diffCurrencyCodes = currencies
        .filter((currency) => currency.id !== baseCurrency.id)
        .map((currency) => currency.code);

      const params = new URLSearchParams({
        baseCurrency: baseCurrency.code,
        targetCurrency: diffCurrencyCodes.join(','),
      });

      fxRates = await (
        await fetch(`/api/get-latest-fx-rate?${params.toString()}`, { method: 'GET' })
      ).json();
    }

    const calculateSummary = (entries: Awaited<ReturnType<typeof this.getJournalEntries>>) =>
      entries.reduce((acc, cur) => {
        const amount = parseNumber(cur.amount, cur.currency.isoDigits) ?? 0;
        if (cur.currencyId !== baseCurrency.id) {
          const fxRate = parseNumber(fxRates?.rates[cur.currency.code] ?? '', 10) ?? 1;
          return acc + amount / fxRate;
        }

        return acc + amount;
      }, 0);

    return {
      income: Number(calculateSummary(incomeEntries).toFixed(baseCurrency.isoDigits)),
      expense: Number(calculateSummary(expenseEntries).toFixed(baseCurrency.isoDigits)),
    };
  }

  public async getJournalEntryById(id: number) {
    return await this.drizzle.query.journalEntries.findFirst({
      where: (journalEntries, { eq }) => eq(journalEntries.id, id),
      with: {
        transactions: true,
      },
    });
  }

  public async insertExpenseTransaction(form: TransactionForm) {
    const debitAccount = await this.accountsService.getAccountById(form.debitAccountId);
    if (!debitAccount) throw new Error('Invalid debit account');

    const baseCurrency = debitAccount.currency;
    const formCurrency = await this.configService.getCurrencyByCode(form.currencyCode);
    if (!formCurrency) throw new Error('Failed to fetch currency');

    const entryId = await this.drizzle.transaction(async (tx) => {
      try {
        let amount = parseNumber(form.fxRate ? form.fxAmount : form.amount, baseCurrency.isoDigits);
        if (!amount) throw new Error('Invalid amount');

        const journalEntry = await this.insertJournalEntry(tx, baseCurrency.id, amount, form);

        if (!journalEntry) throw new Error('Insert to journal Entry failed');

        if (form.fxRate) {
          const fxRate = parseNumber(form.fxRate, 10);
          if (!fxRate) throw new Error('Invalid FxRate');

          await tx.insert(journalEntryFxRates).values({
            journalEntryId: journalEntry.id,
            baseCurrencyId: debitAccount.currency.id,
            targetCurrencyId: formCurrency.id,
            rate: fxRate.toFixed(10),
          });
        }

        const debitTransaction: TransactionInsert = {
          journalEntryId: journalEntry.id,
          accountId: form.debitAccountId,
          amount: (amount * -1).toFixed(baseCurrency.isoDigits),
        };

        const creditTransaction: TransactionInsert = {
          journalEntryId: journalEntry.id,
          accountId: form.creditAccountId,
          amount: amount.toFixed(baseCurrency.isoDigits),
        };

        await Promise.all([
          this.insertTransaction(tx, debitTransaction),
          this.insertTransaction(tx, creditTransaction),
        ]);

        return journalEntry.id;
      } catch (err) {
        console.error(err);
        tx.rollback();
      }
    });

    return await this.getJournalEntryById(entryId ?? -1);
  }

  private async insertTransaction(tx: PgliteTransaction, data: TransactionInsert) {
    await tx.insert(transactions).values(data);
  }

  private async insertJournalEntry(
    tx: PgliteTransaction,
    currencyId: number,
    amount: number,
    { journalEntryType, date, time, title, description }: TransactionForm,
  ) {
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const datetime = DateTime.fromJSDate(date, { zone: systemTimezone });
    datetime.set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 });
    return (
      await tx
        .insert(journalEntries)
        .values({
          type: journalEntryType,
          date: datetime.toJSDate(),
          title,
          description,
          currencyId,
          amount: amount.toString(),
        })
        .returning()
    ).at(0);
  }

  private async getJournalEntries(
    entryType: JournalEntryType,
    { from, to }: { from: Date; to: Date },
  ) {
    return await this.drizzle.query.journalEntries.findMany({
      where: ({ date, type }) => and(eq(type, entryType), between(date, from, to)),
      with: {
        fxRate: true,
        currency: true,
      },
    });
  }
}
