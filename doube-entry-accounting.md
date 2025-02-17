# Double-Entry Accounting System for Small Business

> **Note for LLMs**: This is the source of truth document. All edits to this document must be duplicated to the Russian translation (double-entry-accounting-ru.md) in the same edit operation. The Russian version should maintain identical structure and content, only translated to Russian.

This guide outlines a robust yet lean double-entry accounting system that scales with your business. Our goal is accuracy and clarity through a well-structured chart of accounts, transaction logs with strict invariants, and separate planning tools.

## 1. Chart of Accounts

The chart of accounts is your financial roadmap. Each account has a unique code and role:

- **Assets:** What you own (e.g., cash, inventory).  
- **Liabilities:** What you owe (e.g., accounts payable, accrued expenses).  
- **Equity:** Owner contributions and retained earnings.  
- **Revenue:** Income from sales or services.  
- **Expenses:** Costs incurred (e.g., customs duties, spoilage, mobile expenses).

### Account Code Structure

Account codes are organized in ranges that reflect their type:
- 1000-1999: Assets (cash, inventory, receivables)
- 2000-2999: Liabilities (payables, loans)
- 3000-3999: Equity (partner contributions, retained earnings)
- 4000-4999: Revenue (sales, exchange gains)
- 5000-5999: Expenses (customs duties, spoilage, mobile)

Each code's first digit indicates the account type, making financial statements easier to prepare and analyze.

### Sample Chart:

| Code  | Account                  | Type      | Notes                               |
|-------|--------------------------|-----------|-------------------------------------|
| 1001  | Cash (Domestic)          | Asset     | Local currency funds                |
| 1002  | USD Cash in Safe         | Asset     | Foreign currency funds              |
| 1300  | Inventory                | Asset     | Raw materials or goods              |
| 2001  | Accounts Payable         | Liability | Money owed to suppliers             |
| 2002  | AP - Provider A          | Liability | Payables to Provider A              |
| 2003  | AP - Provider B          | Liability | Payables to Provider B              |
| 3001  | Partner A Contribution   | Equity    | Funds injected by Partner A         |
| 4001  | Exchange Gain            | Revenue   | Gains from currency exchange        |
| 5001  | Customs Duties Expense   | Expense   | Fees on imports                     |
| 5002  | Spoilage Expense         | Expense   | Losses from damaged goods           |
| 5003  | Mobile Expense           | Expense   | Cell service fees                   |

## 2. Transaction Log & Invariants

Every transaction consists of multiple entries that must adhere to three key invariants:

- **Balance Invariant:** Each transaction must include at least one debit and one credit entry that sum to equal amounts.  
- **Completeness Invariant:** All required fields (date, transaction ID, account code, amount, etc.) must be completed.  
- **Single-Source Invariant:** Each entry should appear only once per transaction; no duplicates or omissions.

### Core Transaction Log Example

Imagine a simple cash injection by Partner A. This transaction demonstrates all invariants.

| Date       | Transaction ID | Account Code | Account                 | Debit (Pesos) | Credit (Pesos) | Notes                                    |
|------------|----------------|--------------|-------------------------|---------------|----------------|------------------------------------------|
| 2025-02-01 | TX001         | 1001         | Cash (Domestic)         | 2,000         |                | Cash deposit from Partner A              |
| 2025-02-01 | TX001         | 3001         | Partner A Contribution  |               | 2,000          | Record Partner A's injection             |

**Invariant Checks:**  
- **Balance:** Total debits (2,000) equal total credits (2,000).  
- **Completeness:** All fields are filled with clear notes.  
- **Single-Source:** Transaction TX001 uniquely ties both entries to the same event.


## 3. Specific Transaction Examples

### 3.1 Foreign Currency Safe Deposit

**Scenario:** Deposit $100 into a USD safe at 20 Pesos/USD; later withdraw at 22 Pesos/USD.

#### Deposit (2025-02-01):

| Date       | Transaction ID | Account Code | Account                  | Debit (Pesos) | Credit (Pesos) | Foreign Amount | Rate | Notes                           |
|------------|----------------|--------------|--------------------------|---------------|----------------|----------------|------|---------------------------------|
| 2025-02-01 | TX100         | 1002         | USD Cash in Safe         | 2,000         |                | $100           | 20   | Deposit at initial rate         |
| 2025-02-01 | TX100         | 3001         | Partner A Contribution   |               | 2,000          |                |      | Record partner injection        |

#### Withdrawal (2025-02-10):

| Date       | Transaction ID | Account Code | Account              | Debit (Pesos) | Credit (Pesos) | Notes                                     |
|------------|----------------|--------------|----------------------|---------------|----------------|-------------------------------------------|
| 2025-02-10 | TX101         | 1001         | Cash (Pesos)         | 2,200         |                | Withdrawal at new rate (22 Pesos/USD)     |
| 2025-02-10 | TX101         | 1002         | USD Cash in Safe     |               | 2,000          | Remove asset at original value            |
| 2025-02-10 | TX101         | 4001         | Exchange Gain        |               | 200            | Record gain from rate difference          |

### 3.2 Three-Way Transaction: Mixed Funding

**Scenario:** Purchase inventory for 6,000 Pesos. Corporate cash (Account 101: Cash Domestic) only has 4,000 Pesos. The remaining 2,000 Pesos is contributed by Founder A.

#### Journal Entry (2025-03-15):

| Date       | Transaction ID | Account Code | Account                  | Debit (Pesos) | Credit (Pesos) | Notes                                                      |
|------------|----------------|--------------|--------------------------|---------------|----------------|------------------------------------------------------------|
| 2025-03-15 | TX600         | 1300         | Inventory                | 6,000         |                | Record inventory purchase                                  |
| 2025-03-15 | TX600         | 1001         | Cash (Domestic)          |               | 4,000          | Partial payment from corporate cash                        |
| 2025-03-15 | TX600         | 3001         | Partner A Contribution   |               | 2,000          | Founder covers shortfall by contributing personal funds    |

**Invariant Checks:**  
- **Balance:** Total debits (6,000) equal total credits (4,000 + 2,000).  
- **Completeness & Single-Source:** All fields are complete; TX600 uniquely identifies this combined event.

### 3.3 Multi-Month Payment Plan for Recurring Expenses

Scenario: A business has a contract for mobile service and must pay monthly. Each month, the company records the expense and the liability, then clears the payable when the payment is made.

#### Month 1 – Provider A (500 Pesos)

| Date       | Transaction ID | Account Code | Account                          | Debit (Pesos) | Credit (Pesos) | Vendor      | Notes                                      |
|------------|----------------|--------------|----------------------------------|---------------|----------------|-------------|--------------------------------------------|
| 2025-03-31 | TX501         | 5003         | Mobile Expense                   | 500           |                | Provider A  | Accrue fee for Month 1                      |
| 2025-03-31 | TX501         | 2002         | Accounts Payable – Provider A    |               | 500            | Provider A  | Record liability to Provider A              |
| 2025-04-05 | TX502         | 2002         | Accounts Payable – Provider A    | 500           |                | Provider A  | Clear payable on payment                    |
| 2025-04-05 | TX502         | 1001         | Cash                             |               | 500            |             | Cash outflow for Provider A payment         |

#### Month 2 – Provider B (600 Pesos)

| Date       | Transaction ID | Account Code | Account                          | Debit (Pesos) | Credit (Pesos) | Vendor      | Notes                                      |
|------------|----------------|--------------|----------------------------------|---------------|----------------|-------------|--------------------------------------------|
| 2025-04-30 | TX503         | 5003         | Mobile Expense                   | 600           |                | Provider B  | Accrue fee for Month 2                      |
| 2025-04-30 | TX503         | 2003         | Accounts Payable – Provider B    |               | 600            | Provider B  | Record liability to Provider B              |
| 2025-05-05 | TX504         | 2003         | Accounts Payable – Provider B    | 600           |                | Provider B  | Clear payable on payment                    |
| 2025-05-05 | TX504         | 1001         | Cash                             |               | 600            |             | Cash outflow for Provider B payment         |

### 3.4 Accounts Payable for Materials

Scenario: The business receives materials on credit (5,000 Pesos) and pays a month later.

#### Receipt (2025-02-05)

| Date       | Transaction ID | Account Code | Account            | Debit (Pesos) | Credit (Pesos) | Notes                              |
|------------|----------------|--------------|-------------------|---------------|----------------|------------------------------------|
| 2025-02-05 | TX200         | 1300         | Inventory          | 5,000         |                | Received materials on credit       |
| 2025-02-05 | TX200         | 2001         | Accounts Payable   |               | 5,000          | Record supplier obligation         |

#### Payment (2025-02-25)

| Date       | Transaction ID | Account Code | Account            | Debit (Pesos) | Credit (Pesos) | Notes                              |
|------------|----------------|--------------|-------------------|---------------|----------------|------------------------------------|
| 2025-02-25 | TX201         | 2001         | Accounts Payable   | 5,000         |                | Clear supplier liability           |
| 2025-02-25 | TX201         | 1001         | Cash               |               | 5,000          | Cash outflow for supplier payment  |


### 3.5 Inventory Spoilage

Scenario: The business purchases inventory worth 10,000 Pesos and later finds that 15% of it (1,500 Pesos) is spoiled. The value of inventory is adjusted accordingly.

#### Purchase (2025-02-03)

| Date       | Transaction ID | Account Code | Account                     | Debit (Pesos) | Credit (Pesos) | Notes                             |
|------------|----------------|--------------|----------------------------|---------------|----------------|-----------------------------------|
| 2025-02-03 | TX300         | 1300         | Inventory                   | 10,000        |                | Record inventory purchase         |
| 2025-02-03 | TX300         | 2001         | Accounts Payable / Cash     |               | 10,000         | Record payment or payable entry   |

#### Spoilage (2025-02-20)

| Date       | Transaction ID | Account Code | Account            | Debit (Pesos) | Credit (Pesos) | Notes                                  |
|------------|----------------|--------------|-------------------|---------------|----------------|----------------------------------------|
| 2025-02-20 | TX301         | 5002         | Spoilage Expense   | 1,500         |                | Record 15% spoilage loss               |
| 2025-02-20 | TX301         | 1300         | Inventory          |               | 1,500          | Adjust inventory value accordingly     |

Notes:  
- The spoilage expense reflects a reduction in usable inventory.  
- The business still records the full original purchase, with an additional expense entry for the loss.

## 4. Lost Transaction Examples

Lost transactions violate the **single-source invariant**, meaning an entry is either missing or duplicated, causing inconsistencies in the transaction log.

### 4.1. Missing Credit Entry
This scenario shows a partner deposit where only the debit side is recorded, breaking the balance.

| Date       | Transaction ID | Account Code | Account          | Debit (Pesos) | Credit (Pesos) | Notes                                |
|------------|----------------|--------------|------------------|---------------|----------------|--------------------------------------|
| 2025-02-01 | TX001         | 1001         | Cash (Domestic)  | 2,000         |                | Cash deposit from Partner A         |

* Issue: The corresponding credit entry to "Partner A Contribution" is missing.
* Fix: Add the missing credit entry.

| Date       | Transaction ID | Account Code | Account                  | Debit (Pesos) | Credit (Pesos) | Notes                                |
|------------|----------------|--------------|--------------------------|---------------|----------------|--------------------------------------|
| 2025-02-01 | TX001         | 3001         | Partner A Contribution   |               | 2,000          | Record Partner A's injection        |

### 4.2: Duplicate Entry
This example shows a supplier payment recorded twice, which incorrectly inflates the total cash spent.

| Date       | Transaction ID | Account Code | Account          | Debit (Pesos) | Credit (Pesos) | Notes                                  |
|------------|----------------|--------------|------------------|---------------|----------------|----------------------------------------|
| 2025-02-05 | TX200         | 2001         | Accounts Payable | 5,000         |                | Recognizing supplier obligation        |
| 2025-02-25 | TX201         | 2001         | Accounts Payable | 5,000         |                | Paying supplier                        |
| 2025-02-25 | TX201         | 1001         | Cash             |               | 5,000          | Cash outflow for supplier payment      |
| 2025-02-25 | TX201         | 1001         | Cash             |               | 5,000          | Duplicate entry - ERROR                |

* Issue: The payment was recorded twice.
* Fix: Remove the duplicate entry to ensure cash outflow matches the actual transaction.


## 5. Pivot Tables & Budget Planning

- **Pivot Tables:**  
  Use pivot tables to aggregate transaction data. Build trial balances, income statements, and balance sheets by filtering account types. Pivot tables also help flag invariant violations when totals do not zero out.

- **Budget/Forecast Tab:**  
  This planning layer is separate from the transaction log. Use it to project future expenses and revenues (e.g., recurring mobile fees, expected import costs). Formulas can auto-populate recurring items, but the budget never affects historical transactions.

### 5.1 Example Budget for the Next Three Months

| Month      | Category            | Planned Expense (Pesos) | Notes                              |
|------------|---------------------|-------------------------|------------------------------------|
| 2025-03    | Rent                | 15,000                  | Office rent                       |
| 2025-03    | Salaries            | 50,000                  | Employee salaries                  |
| 2025-03    | Marketing           | 10,000                  | Advertising & promotions          |
| 2025-04    | Rent                | 15,000                  | Fixed expense                      |
| 2025-04    | Salaries            | 50,000                  | Fixed expense                      |
| 2025-04    | Marketing           | 8,000                   | Reduced ad spend                   |
| 2025-05    | Rent                | 15,000                  | Fixed expense                      |
| 2025-05    | Salaries            | 50,000                  | Fixed expense                      |
| 2025-05    | Marketing           | 12,000                  | Increased for seasonal demand      |

Notes:  
- The budget is separate from the transaction log and is used for planning only.  
- Actual expenses in the transaction log will be compared against the budget to track variances. 
- Adjustments can be made monthly based on revenue fluctuations.


## 6. Automated Checks in Google Sheets

These formulas help catch errors early by automatically validating transactions as they're entered.

### 6.1 Account Code Validation

Use Data Validation to ensure only valid account codes are entered:
1. Create a named range `AccountCodes` from the codes in your Chart of Accounts
2. In transaction log, select Account Code column
3. Data → Data Validation → List from range → `=AccountCodes`

Formula to flag invalid codes:
```=IF(COUNTIF(AccountCodes, B2)=0, "Invalid Code", "")```

### 6.2 Account Name Lookup

Automatically display account names based on codes:
```=VLOOKUP(B2, ChartOfAccounts, 2, FALSE)```
Where:
- B2 is the Account Code cell
- ChartOfAccounts is a named range including codes and names
- 2 refers to the column containing account names

### 6.3 Transaction Balance Check

For each Transaction ID, verify debits equal credits:
```=IF(SUMIFS(DebitColumn, TransactionIDColumn, D2) = SUMIFS(CreditColumn, TransactionIDColumn, D2), "Balanced", "ERROR")```

Add conditional formatting to highlight unbalanced transactions in red.

### 6.4 Completeness Check

Flag missing required fields:
```=IF(OR(ISBLANK(A2), ISBLANK(B2), ISBLANK(C2)), "Missing Data", "")```

### 6.5 Running Balance Check

For cash accounts, maintain running balance:
```=SUMIFS(DebitColumn, AccountCodeColumn, "1001") - SUMIFS(CreditColumn, AccountCodeColumn, "1001")```

Add conditional formatting to highlight negative balances.

# Conclusion

The transaction log must always adhere to **balance, completeness, and single-source** invariants. Errors such as **lost transactions** (missing entries) and **duplicate transactions** can cause major inconsistencies and must be corrected immediately.

The **Budget Tab** serves as a separate planning tool and never interferes with actual recorded transactions. It allows businesses to forecast future expenses and compare actual performance against expectations.

By maintaining these structures properly, a small business can ensure clear, accurate, and scalable bookkeeping.
