## Smart wizard verification — 3 November 2026

- 51 automated tests pass, including five tests for step jumping, revisiting/skipping, configuration invalidation and saved progress.
- Browser: uploaded synthetic CSV in step 4, mapped Customer and ran Test. Steps 5 and 6 marked complete; Next went directly to step 7.
- Skipped add-on details; Next passed completed extraction steps. Skipping final activation saved a draft with the original CSV and progress. Reopening retained Complete/Skipped markers and the sample preview.

# V5 verification — 2 November 2026

- 46 automated tests passed, including eight new workflow tests: preserving completed attempts; weekend/date overrides; client outcomes; duplicate matching and merge preservation; daily queue; note search; reporting; message variables.
- Production Vite build passed. Existing informational dynamic-import bundling warnings remain.
- Browser QA used isolated localhost port 5180 with synthetic records, not customer data.
- Verified manual record creation, first-date override persisting after save, Interested outcome, reply history, remaining-date shifts, daily queue counts and quick completion.
- Verified bulk owner assignment and saved client-outcome filters.
- Imported synthetic CSV, saw missing-field highlights, re-imported and selected Update existing record. No duplicate record added.
- Phone 390px viewport: no document horizontal overflow; reply dialog controls accessible. Viewport restored afterward.
- Existing OCR/template/date/storage regression tests remain passing. Live Vercel and Supabase are not configured or verified.
- Screenshots are outside the source package in dashboard-qa/v5-homepage.png and v5-mobile.png.

Final review also checked that putting a record on hold does not count as a response, schedule-only changes trigger the unsaved guard, and exact duplicates use the worksheet plus row identity.

Previous verification history follows.

# V4 verification — 30 October 2026

## Scope

Visual launcher, shared navigation, workspace picker, optional onboarding and schedule presentation were added around the existing V3 business operations. No storage schema or backend changes were made.

## Passed

- Production build and 38 automated tests, including existing date/OCR, template, fee, snapshot, schedules, migration, storage concurrency and source archive checks. New tests cover route restoration and schedule filtering without changing records.
- Clicked all 20 homepage tiles in the actual browser. Every tile opened its intended editor, dialog or page; no blank destinations.
- Sidebar categories showed 4 workspace, 5 template, 1 document, 6 follow-up, 1 report, 2 tool and 1 help function. Home showed all 20.
- Top-menu click navigation, Arrow Down/Up navigation and Escape. Fixed a hover/click conflict found during browser QA.
- Created a separate V4 Navigation QA workspace with a synthetic logo. Used Create Template to save an ANC preset and imported the supplied Word proposal. Date was 29 October 2026 and all ten fees matched. Service inclusion remained unconfirmed until review; the QA import deliberately retained no confirmed service selections.
- Saved a remark and marked one QA attempt complete. Table changed from 0 / 3 to 1 / 3 and next date changed to 12 November. Schedule listed the two remaining attempts. These are local QA actions, not real client contact.
- Original Your company workspace retained seven records. Other V3 workspaces and templates remained accessible. Switching updated branding and company data; refresh preserved the active workspace and saved data.
- Existing saved PDF rectangle test returned Example Trading inside the redesigned visual editor. Its coordinates and original file survived the upgrade.
- Browser Back returned from records to import; Forward returned to records. All routes use fragments so ordinary Vercel static hosting remains compatible.
- Sidebar collapse measured 82px with the main area aligned at 82px. Tablet at 1024px used three columns and no page overflow; mobile at 390px used two columns, a functioning category drawer, and no page overflow (375px content width).
- Setup checklist Skip/Resume is stored per workspace in the browser. Help includes illustrated topic shortcuts and searchable instructions.

## Verification limits

Vercel and Supabase remain unconfigured, so no live deployment, cloud login, RLS or cross-device sync claim is made. V4 uses the existing cloud operations. Email/WhatsApp actions still produce drafts and staff completion marks are not delivery receipts. DOCX uses text/table extraction; PDF/image regions assume matching layouts.

Screenshots and QA data stay outside the source archive. The source release excludes private originals, customer records, sessions and environment secrets. The actual in-app source ZIP was downloaded and extracted into a separate folder. Fresh npm ci, production build and all 38 tests passed; npm audit reported zero vulnerabilities. The 56-entry archive had valid CRCs and contained no private client name or original document. No browser console errors were captured during the source download. The final archive also retains configured custom-field visibility.

## Previous V3 / V2 evidence

# V3 verification — 30 October 2026

## V3 checks

- 36 automated tests pass. Added preset validity, safe service detection, DOCX fee-cell extraction, conditional Form E/EA price separation, structured flags, spreadsheet service/fee mappings, unreadable region handling, strict currency parsing, missing-date/default provenance, typed fields, version snapshots and archival preservation.
- Named-month Word dates (`Date: 29 October 2026`) now map to a Document Date field, and OCR selections containing the printed Date label normalize the same way. Invalid calendar dates remain blank.
- Production V3 build passes. The compiler reports two informational ineffective-dynamic-import warnings; functionality builds successfully.
- Real supplied ANC DOCX imported in a local QA workspace. Company, contact, proposal date (29 October 2026), title and all ten fees matched the source. All four service tables initially remained unselected/included-unconfirmed. The QA reviewer manually checked all four and confirmed review before saving; details clearly display Manual confirmation.
- Fees verified: BPO monthly 3,600 and 2,100; consultation hourly 2,000; audit 28,000, MBRS 700, disbursements 400; tax Form C 13,500, MITRS 200, Form E 500, Form EA 50. Conditional source excerpts are retained. The private DOCX and customer records are not packaged in source.
- Created an independent workspace and ANC preset; added a multi-select field and repeating table through the field configurator; saved/activated the template. Duplicated the template and renamed a field without changing the original definition.
- Actual rectangle drawing read Example Trading from a synthetic PDF. Saved the mapping, reused it on a second PDF, and extracted Sample Trading and Jamie Lim. Entered the missing proposal date manually and imported the second reviewed record.
- Template-specific table layout saved a 300px company column and hid reference. The record retained template version 1 while current configuration advanced. Archiving the referenced template and reloading preserved its original document, service fees, dates and history.
- First reviewed proposal generated weekly stages on 5, 12 and 19 November 2026 from its proposal date. Details showed selected services, individual fee sources, original-file actions and attempt progress.
- Verified workspace isolation: original Your company workspace retained its seven records; the independent QA workspace showed only its own imports. Reload persisted templates, layouts, records and originals in IndexedDB.
- Searchable Help Center and guided topic walkthrough operated in the browser. Template JSON export was downloaded and imported as a new draft.
- Edited a fee default to MYR 1,234 and enabled BPO as the manual-record default. A new manual record displayed that default, while imported proposal selections still required explicit review. Created a manual record with Onsite multi-select and a repeating scope row; both values appeared in its saved detail view.
- Template Library fit a 390px mobile viewport without page overflow (measured viewport 390px, page width 375px).

## Packaging and live limits

The full source release uses an explicit allowlist, excludes private uploads, records, sessions, environment secrets, node_modules and generated output. The in-app download uses this actual build archive and injects configuration only. The downloaded configured archive was independently extracted; `npm ci`, production build and all 34 tests passed for the earlier release; the latest date fix passes all 36 tests in the source workspace. Its 50 source entries contain no private client name or original document. npm audit reported 0 vulnerabilities.

Vercel and Supabase are not configured by the owner, so live cloud auth, RLS, upload/download, cross-device synchronization and production redeployment remain unverified. Same-origin local refresh persistence is tested. No destructive SQL migration is needed for V3; existing JSON payload storage supports the new properties. Refer to README.md for setup and storage behavior.

DOCX uses text/table parsing, not exact Word-page regions. Arbitrary native Word checkbox controls or photographed marks require explicit regions, structured/mapped flags or manual confirmation. Import review is required. OCR layout shifts still need verification. Email/WhatsApp controls generate drafts; no unattended sending or delivery confirmation is implemented.

## Prior V2 regression evidence

The following report records tests from the V2 implementation; V3 adds the checks above and retains those automated regression tests. These older browser checks were not all repeated for V3.

# V2 verification — 29 October 2026

## Passed

- 23 automated tests: weekly/month-end schedules, starting-date fields, stop outcomes, normalized selection geometry, region text extraction, layout review, CSV/XLSX mapping validation, legacy migration, workspace duplication, backup validation, atomic state/file storage, stale-tab rejection and release ZIP contents.
- Production build from the upgraded source.
- Actual browser download of the complete release ZIP, extraction into a separate folder, npm ci, independent production build, and tests.
- Browser PDF preview and actual rectangle extraction; move and lower-right-corner resize; optional ellipse selection; saved regions preserved after reload and zoom; reused on a second quotation with different customer/reference values.
- Multi-page PDF preview and next-page navigation.
- Actual scanned-image OCR using packaged same-origin worker/core/language files, with no browser error logs during the successful test.
- Real CSV and XLSX imports using a saved column mapping; DOCX preview and label extraction. Seven synthetic records imported with schedules.
- Workspace creation, switching, configuration-only duplication, deletion of the disposable clone, and confirmation that other workspace records/templates remained intact.
- Workspace-specific branding, custom currency/dropdown/checkbox/date fields, hidden table columns and a document-date monthly schedule. Starting 31 January 2027 produced 28 February, 31 March and 30 April. Paid outcome stopped the active queue.
- Actual V1 data migration at its original local address: both existing demo workspaces, record, completed stage and activity notes remained accessible.
- JSON backup download and restoration: seven records plus six original document files. Restored sample preview and template extraction remained functional.
- Desktop and 390px mobile layout checks found no page-level horizontal overflow; mobile navigation worked.
- npm audit reported zero vulnerabilities for the installed dependency tree.

## Limits / not tested live

- The owner confirmed the dashboard has not been deployed to Vercel. The local production bundle was tested; no claim of live Vercel verification is made.
- No Supabase project/account was configured. The PostgreSQL/Auth/private-storage implementation and owner policies are included, but live cloud auth, storage policies, conflict handling and cross-device sync require owner setup and testing.
- DOCX supports text preview and label extraction, not exact Word page regions. Legacy XLS must be saved as XLSX. PDF/image file limit is 15 MB and PDF page limit is 12. Review remains mandatory for unrelated/shifted layouts, unusual fonts and low-confidence OCR.
- This app generates reminders and drafts. It does not send email/WhatsApp messages, run unattended background jobs or verify external delivery.

All browser sample records and files were synthetic. The separate original AMS project was not edited.

## Manual field assignment update

The assignment dropdown now offers Add new dashboard field, with a visible Add field manually action. Browser-tested creating Document date as a Date without an OCR region, saving the template, reloading, and finding a working Date input in New record. The dropdown creation action also opened the inline name/type form. Production build and all 23 existing tests passed after the code change.
