import { useTransactionContext } from '@/components/compositions/manage-transactions/transaction-context';
import { invisibleCharMd } from '@/components/common-functions';
import type { DateRange } from '@/components/common-types';
import { SkeletonSimple } from '@/components/primitives/skeleton-simple';
import { QUERIES } from '@/components/tanstack-queries';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';

type TransactionSummaryProps = {
  dateRange: DateRange;
  setDateRange: Dispatch<SetStateAction<DateRange>>;
};

export const TransactionSummary = ({ dateRange: { from, to } }: TransactionSummaryProps) => {
  const {
    incomeSummaryState: [income, setIncome],
    expenseSummaryState: [expense, setExpense],
  } = useTransactionContext();

  const { data: defaultCurrency } = useQuery(QUERIES.config.defaultCurrency);

  const {
    data: summary,
    isPending,
    isError,
    error,
  } = useQuery(QUERIES.transaction.getSummary(from, to, defaultCurrency!));

  useEffect(() => {
    if (!summary) return;

    const { income, expense } = summary;
    setIncome(income);
    setExpense(expense);
  }, [summary]);

  // const [expense, setExpense] = useState<number>(0);
  const total = useMemo(() => income - expense, [income, expense]);
  const currencyPadding = useMemo(() => {
    const max = Math.max(income.toLocaleString().length, expense.toLocaleString().length);
    const min = Math.min(income.toLocaleString().length, expense.toLocaleString().length);
    return max - min + 1;
  }, [income, expense]);

  if (isPending) return <SkeletonSimple heightInPx={97} />;

  if (isError) return <p>Error: ${error.message}</p>;

  return (
    <div className="flex w-full flex-col gap-2 text-lg font-normal md:w-96 md:rounded-lg md:p-4">
      <div className="flex flex-row gap-8">
        <p className="grow text-left">Income</p>
        <p className="text-primary grow text-right">
          {defaultCurrency?.symbol.padEnd(currencyPadding, invisibleCharMd)}
          {income.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-row gap-8">
        <p className="grow text-left">Expense</p>
        <p className="grow text-right text-red-700">-{expense.toLocaleString()}</p>
      </div>
      <Separator />
      <div className="flex flex-row gap-8">
        <p className="grow">Total</p>
        <p className="grow text-right">{total.toLocaleString()}</p>
      </div>
    </div>
  );
};
