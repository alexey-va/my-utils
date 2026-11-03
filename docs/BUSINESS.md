# Business workspace

`/business` is an administrator-only feature registered in the shared catalog.
Its owner-scoped API is `/api/admin/business`; the server independently enforces
access. The frontend never ships invoice data or bank credentials as assets.

The surface inherits the existing Graphite, Blue, Violet and Light themes.
An aligned financial summary leads into payer, document and incoming-payment
views. Narrow layouts turn ledger rows into readable records. Payer selection
opens all-period history; the URL retains period, payer and selected view.
Invoice creation, reconciliation and bank connection use focused drawers.
The initial overview includes all periods. Explicit month URLs remain monthly,
with a visible scope explanation and a one-click return to all periods.
Quick links use `accountingPeriods` (current invoices); the full selector keeps
archived document periods. Invoice charges, paid amounts and remainder use the
selected period; eligible advances remain global and are labelled separately.

## Accounting semantics

- Money is integer kopecks. Decimal strings are parsed with exact arithmetic;
  displayed line totals are previews and the server returns authoritative totals.
- Only current invoices contribute to charges. An act accompanies an invoice
  and does not create another receivable. Archived versions stay downloadable.
- Paid totals represent allocations to the selected invoice period. Incoming
  totals represent payment posting dates and are displayed separately. In the
  all-period view, cash totals cover the calendars in `accountingPeriods`, not
  every year of bank history. Legacy cash is excluded from current receipts and
  the payer's last current payment. `historicalReceivedMinor` is a separate,
  excluded amount, shown only when the user reveals legacy history.
- Recognized advances across all current contracts/periods remain separate from
  invoice remainder, including in each payer row. The review amount is
  `unallocatedMinor - advanceMinor`; advances
  are still available for future manual allocation and never reduce another
  contract's balance in the interface.
- The server excludes own-account/tax transfers from the business response.
  The payment list and its navigation count show rental/unclassified receipts
  by default. A separate history toggle reveals historical/outside-period rows
  without adding them to current totals. `historical` means an older purpose or
  owner-confirmed legacy receipt; `outside_period` means receipt before current
  accounting months without claiming old invoices were settled. Neither offers
  current allocation.
- Missing coverage is `Не сверено`, not a zero payment or confirmed debt.
  A missing match means no payment was found in the available Tochka statements;
  it does not establish overdue debt or exclude payments through another bank.
- Imported statements and allocations remain useful without a saved bank token.
  The interface displays their coverage and date and offers connection for updates.
- Historical due dates remain absent when sources do not provide them. A new
  invoice has an optional explicit due date and automatic server numbering.

## Flows and failure states

Create a local PDF for any payer, using its invoice template when available.
Creating via Tochka is available for companies/IPs with a connected bank.
Neither action sends the document to a payer. Rejected requests preserve the
draft; uncertain bank writes disable immediate resubmission and require review.

Document downloads use the shared authenticated client and its JWT refresh
flow, fetch bytes as a Blob, and revoke temporary object URLs after download.
Bank tokens use password inputs, clear after an attempt or closing the drawer,
and never enter browser storage. Synchronization is manual and date-bounded.

Allocation drawers load all periods so an October invoice can use a later
payment. A user selects the invoice/payment and a positive amount bounded by
both remainders; the server validates again. Reversing an allocation preserves
the payment and makes its amount available again.

Failed initial reads display an error with retry. Failed background refreshes
keep the previous snapshot with a visible warning. Scope changes never show
the previous payer's numbers under a new title.

## Source and verification

`src/features/business/` owns typed payloads, requests, presentation and forms.
`src/api/endpoints.ts` owns paths. `src/api/client.ts` adds a Blob response mode
without a separate authentication implementation. Synthetic fixtures are used
only by tests; the app has no demonstration-data fallback.

Required checks: ESLint, Vitest, production build and diff check. Browser
acceptance covers 1440, 900 and 390px, all four themes, payer drilldown, archived
versions, downloads, draft preservation, bank connection and allocation flows.
Use synthetic local records for mutations; production verification is read-only.
