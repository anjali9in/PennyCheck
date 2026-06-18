import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Checkbox, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { createImportedLocalTransactions } from '@/features/accounts/localFinanceRepository';
import { loadFinance } from '@/features/accounts/financeSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatMinorAmount } from '@/utils/money';
import { ImportPreviewItem, previewCsvImport } from './importCsv';

const sampleCsv = `Date,Narration,Debit,Credit,Reference
12/06/2026,UPI-SWIGGY-123456,650.00,,UTR1234567890
13/06/2026,SALARY CREDIT,,90000.00,NEFT99887766`;

export function ImportPanel() {
  const dispatch = useAppDispatch();
  const { accounts, categories } = useAppSelector((state) => state.finance);
  const [csv, setCsv] = useState(sampleCsv);
  const [preview, setPreview] = useState<ImportPreviewItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const account = accounts[0];

  const onPreview = async () => {
    if (!account) {
      setMessage('Create an account before importing.');
      return;
    }
    const rows = await previewCsvImport({ csv, account, categories });
    setPreview(rows);
    setSelected(Object.fromEntries(rows.map((row) => [row.id, row.valid && !row.duplicate])));
    setMessage(`${rows.length} rows parsed`);
  };

  const onConfirm = async () => {
    const approved = preview.filter((row) => selected[row.id] && row.valid && !row.duplicate);
    await createImportedLocalTransactions(
      approved.map((row) => ({
        accountId: row.accountId,
        categoryId: row.categoryId,
        direction: row.direction,
        amountMinor: row.amountMinor,
        currency: account?.currency ?? 'INR',
        merchant: row.merchant,
        narration: row.narration,
        referenceNumber: row.referenceNumber,
        occurredAt: row.occurredAt,
      })),
    );
    await dispatch(loadFinance());
    setMessage(`${approved.length} transactions imported locally`);
  };

  return (
    <>
      <Text variant="headlineSmall">Import statement</Text>
      <Text variant="bodyMedium">CSV preview supports Date, Narration, Debit, Credit and Reference columns.</Text>
      <Card mode="contained">
        <Card.Content style={styles.form}>
          <TextInput
            label="CSV statement"
            value={csv}
            onChangeText={setCsv}
            multiline
            numberOfLines={8}
            accessibilityLabel="CSV statement content"
          />
          <Button mode="contained" onPress={onPreview}>
            Preview
          </Button>
          {message ? <Text>{message}</Text> : null}
        </Card.Content>
      </Card>

      {preview.map((row) => (
        <Card key={row.id} mode={row.duplicate || !row.valid ? 'contained' : 'outlined'}>
          <Card.Content style={styles.previewRow}>
            <Checkbox
              status={selected[row.id] ? 'checked' : 'unchecked'}
              disabled={!row.valid || row.duplicate}
              onPress={() => setSelected((current) => ({ ...current, [row.id]: !current[row.id] }))}
            />
            <View style={styles.previewText}>
              <Text variant="titleMedium">{row.merchant || row.narration}</Text>
              <Text variant="bodySmall">
                Row {row.rowNumber} · {row.direction} · {formatMinorAmount(row.amountMinor)}
              </Text>
              {row.duplicate ? <Text style={styles.warning}>Duplicate warning</Text> : null}
              {!row.valid ? <Text style={styles.warning}>{row.errors.join(', ')}</Text> : null}
            </View>
          </Card.Content>
        </Card>
      ))}

      {preview.length > 0 ? (
        <Button mode="contained" onPress={onConfirm}>
          Import selected
        </Button>
      ) : null}
    </>
  );
}

export function ImportScreen() {
  return (
    <Screen>
      <ImportPanel />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewText: {
    flex: 1,
    gap: 4,
  },
  warning: {
    color: '#B3261E',
  },
});
