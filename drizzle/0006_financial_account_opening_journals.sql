INSERT INTO "journal_entries" ("id", "business_id", "entry_date", "kind", "reference", "description")
SELECT 'JE-OPENING-' || fa."id", fa."business_id", CURRENT_DATE, 'opening', fa."id", 'Opening balance for ' || fa."name"
FROM "financial_accounts" fa
WHERE fa."opening_balance" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "journal_entries" je
    WHERE je."business_id" = fa."business_id"
      AND je."kind" = 'opening'
      AND je."reference" = fa."id"
  );

INSERT INTO "journal_entry_lines" ("id", "journal_entry_id", "account", "debit", "credit")
SELECT 'JE-OPENING-' || fa."id" || '-debit', 'JE-OPENING-' || fa."id", fa."name", fa."opening_balance", 0
FROM "financial_accounts" fa
WHERE fa."opening_balance" > 0
  AND EXISTS (SELECT 1 FROM "journal_entries" je WHERE je."id" = 'JE-OPENING-' || fa."id")
  AND NOT EXISTS (SELECT 1 FROM "journal_entry_lines" jel WHERE jel."id" = 'JE-OPENING-' || fa."id" || '-debit');

INSERT INTO "journal_entry_lines" ("id", "journal_entry_id", "account", "debit", "credit")
SELECT 'JE-OPENING-' || fa."id" || '-credit', 'JE-OPENING-' || fa."id", 'Opening Balance Equity', 0, fa."opening_balance"
FROM "financial_accounts" fa
WHERE fa."opening_balance" > 0
  AND EXISTS (SELECT 1 FROM "journal_entries" je WHERE je."id" = 'JE-OPENING-' || fa."id")
  AND NOT EXISTS (SELECT 1 FROM "journal_entry_lines" jel WHERE jel."id" = 'JE-OPENING-' || fa."id" || '-credit');
