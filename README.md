# FollowUp Workspace V5

This is the upgraded company-dashboard-builder project. Existing V1/V2 workspace IDs, records, schedules, history, label templates and backups remain compatible. V3 adds per-template fields, dynamic service modules, fee provenance and immutable record snapshots. The separate ams-followup-dashboard project is not modified.


## Smart template setup

Step 3 is Configure add-on details. All eight steps have a skip action; skipping activation saves a draft and returns to the library. Next automatically passes completed/skipped steps. Uploading, mapping and testing on step 4 can therefore go directly to step 7. You can revisit any step from its card, and Previous visits the immediately preceding step.

Completion and skips are saved with the template. Changing sample, field definitions, mappings, regions or OCR language invalidates an earlier extraction test. The wizard keeps the uploaded sample and mappings when navigating; Save draft persists them to browser storage. Normal configuration validation still applies when saving.

## V5 daily operations and visual upgrade

- Daily queue on Home and Today’s Follow-Ups, separated into overdue, today and upcoming. Quick completion and reply/reschedule actions use real saved records.
- Separate client outcomes: awaiting reply, interested, proposal accepted, not interested and on hold. Interested keeps reminders active; accepted/declined/hold stop them.
- Record replies and chronological activity. Details group fields, selected service fees, original documents, follow-ups and history. Secondary sections collapse for readability.
- Duplicate import review uses references, company + document date, exact source rows and SHA-256 file matching for new uploads. Update preserves record identity, owner, notes, outcomes, schedule and history. Legacy originals acquire a hash when loaded/imported again.
- Source and extracted fields appear side by side on wide screens and stacked on smaller screens. Missing values are highlighted; extraction still requires manual review.
- Backup reminder after seven days (or no backup yet), recording the last successful download request. This is not a guarantee that the file was retained. Restore remains a full private workspace backup operation.
- First-attempt date override on record creation; optional weekend rolling; reschedule unfinished attempts without changing completed ones. Weekend rolling moves Saturday/Sunday dates to Monday, not public holidays.
- Editable per-stage message drafts now also support {{client_name}}, {{services}}, {{proposal_date}}. Staff send messages themselves.
- Search includes notes and history. Named filter views are saved per workspace. Bulk owner, client outcome, reschedule and selected CSV export operate only on selected records visible in the current filter.
- Reports include date-filtered response/acceptance/activity metrics, status distribution, owner/service breakdowns and open amounts separated by fee type. Amounts are proposal values, not collected revenue.
- Setup checklist includes OCR mapping/testing and sample import. Unsaved settings banners and record-close guards protect pending edits.
- Responsive cards, clearer spacing, sticky dialog action bars and larger mobile controls. Top dropdowns retain labels only.

Existing browser data is not reset. Keep the same browser and URL/port to access the same local records. No automatic background sending, online synchronization or Vercel deployment is enabled by this upgrade. Source exports omit records, originals, credentials and saved search views; private backups include workspace data.

## V4 visual navigation

The default Home is a visual launcher with 20 original, colorful function icons. The sidebar shows category launchers; the horizontal menus open the same functions directly. Both navigation modes use the active workspace and the existing V3 editors and data operations.

- Home → Create Workspace opens the real creation form; Manage Workspaces supports open, duplicate, edit and delete.
- The top-right workspace picker shows company names/logos and offers Create, Manage and Settings. Switching returns to that workspace’s Home.
- Create Template opens preset selection and the existing eight-step wizard. Preset Field Settings opens template fields with a template selector; Field Mapping opens the existing OCR/label/column editor.
- Follow-Up Records includes Document date, Selected services, Status, Attempts and Next follow-up. Existing custom layouts remain saved. Open Details for remarks, manual attempt completion and rescheduling.
- Follow-Up Schedule lists actual generated attempts, with date and pending/completed filters. Paused or stopped records do not create active pending reminders.
- Export Records opens the existing filtered table and functional CSV export. Download Source Code creates a complete ZIP, including the V4 UI files.
- The setup checklist saves skip/resume progress separately for each workspace in this browser. It is optional and does not block experienced users.
- Browser Back/Forward and bookmarked `#/...` routes are supported. Leaving unsaved template/settings edits asks whether to discard them. Keyboard users can Tab through functions, use Enter to activate, use Arrow Down/Up within top menus and Escape to close them.
- Desktop uses 4–6 tiles per row; tablet uses 3; mobile uses 2. Temporary preview viewport overrides are reset after QA.

No database reset, backend rebuild or business-rule migration is required. Existing IndexedDB stores, Supabase policies, workspaces, files, schedules and template snapshots retain their previous formats. New navigation uses URL fragments; the website origin remains unchanged. A different domain or port has a different browser store.

## Run locally

Install Node.js 22.12+ (Node 24 recommended). Extract the source ZIP into its own folder, then run:

```sh
npm ci
npm run dev
```

Open the Local URL printed in the terminal. Windows users can double-click START-DASHBOARD.cmd. Use the same website origin and port to retain access to existing browser data. Localhost, production and preview URLs each have separate stores.

The predev and prebuild scripts copy the OCR engine, WASM and English/Malay/Chinese language assets from pinned npm dependencies into public/ocr. They also generate public/releases/source.zip from an explicit source allowlist. Neither feature retrieves source from a deployed Vercel repository or needs an upload API.

## Recommended workflow

1. Workspaces → Create workspace. Set company name, logo, color, currency and follow-up defaults. Duplicate a workspace to reuse its setup for another company; customer records are excluded by default.
2. Template Library → Create template. Choose General, Invoice, Quotation, ANC Fee Proposal, Outstanding Payment, Contract Renewal or Custom. You can also start the sample-document workflow.
3. Configure fields: add Date or other missing fields, select types/defaults/required flags, groups, extraction sources and visibility. Multi-select and repeating-table fields are supported. Reorder with drag-and-drop or arrows. Stable field keys preserve stored values.
4. Configure service modules and fee fields. Rename/add/remove modules and change their standard prices. Blank defaults remain blank. Default selections apply only to manual records. Proposal inclusion never automatically means client selection.
5. Upload a sample in the wizard or Visual OCR Editor. PDF/images support a three-panel editor: field library, document, properties. Choose a field and draw a rectangle around its value; circles are optional. Add missing fields directly from **Assign to dashboard field → + Add new dashboard field…**. Move/resize regions and Test template before saving. Normalized page coordinates are reused on future documents of the same layout.
6. Configure the template workflow: attempts (for example 3), interval (1 week), starting Date field, and messages. Arrange/show/hide record detail sections, then Save & activate. Draft/archived templates are excluded from new-import suggestions.
7. Import Documents → upload a new document and verify the suggested active template. Review client fields, service inclusion/selection evidence, fees and conditions. Correct values and explicitly confirm service selections. Tick the review confirmation and Import selected records. Spreadsheet imports support separate field, module-selection and fee column mappings.
8. Open Details for grouped fields, services/fees with sources, original document preview/download, follow-up dates, message drafts, rescheduling and history. Existing records retain their template version and schedule when a template changes. Edit details → regenerate sequence explicitly if desired.
9. Follow-Up Records → filter by template/service/status, customize column visibility/order/width and Export filtered records. Each template has its own saved layout.
10. Use User Guide & Help Center, search, context help and the guided topic walkthrough. Template Library supports edit/duplicate, JSON configuration export/import, versions, and archival of templates referenced by records.

Message placeholders: {{company}}, {{title}}, {{owner}}, {{signature}}, {{company_email}}, {{company_phone}}, and any custom field key. Email and WhatsApp links open drafts for staff to send. A completion mark is not a delivery receipt. There is no unattended message sending, background scheduler or push delivery service in this project.

## Document support

- PDF: rendered preview, multi-page regions (up to 12 pages), direct text extraction when available, region OCR for scans.
- PNG/JPG/WebP/BMP: preview and local OCR. Supported languages: English, English+Malay, English+Simplified Chinese.
- DOCX: text preview through Mammoth and structured XML table extraction. The ANC profile extracts company/contact/date/title and proposed-fee cells, including separate Form E / Form EA rates and conditions. Exact Word page positioning is not preserved. Export DOCX to PDF for visual regions.
- XLSX: worksheet selection and column mapping through ExcelJS. Save legacy XLS as XLSX first.
- CSV: quoted/escaped fields parsed through Papa Parse; unique column headings required.
- TXT: text preview and label extraction.
- JSON: structured proposal objects, arrays or a `records` array. Exact field and module keys are required (see example below).
- Maximum original file size: 15 MB. Spreadsheets: up to 5,000 data rows and 100 columns. The first 100 review rows are editable in the import screen; all selected rows are validated before saving. Split larger files when you need to edit later rows before import.

Excel/CSV imports use a separate column-mapping interface. Save the mapping as a named template, select it on future uploads, preview real rows and import one record per selected row. Invalid required fields prevent the batch from being saved.

OCR is a real local text recognizer, not a universal document understanding model. A saved region assumes the same layout. Missing pages, changed proportions, changed PDF text positions, blank fields and low OCR confidence request review. Scanned documents with shifted content can still produce incorrect text inside a valid region: always verify the result. Ellipse selections use bounding-box text on text PDFs and an elliptical crop mask for scanned content. Rectangles are recommended. PDF character boundaries use measured glyph advances; unusual fonts/rotated text may need a slightly wider box or manual correction. Number conversion assumes decimal points and comma thousands separators. Date parsing accepts ISO, day-first numeric dates, and English month names such as `Date: 29 October 2026`, which becomes 2026-10-29 (displayed as 29/10/2026 in a DD/MM/YYYY workspace). Set the target field type to Date; map the printed Date label or draw a region around the date. Workspace date format controls display.

## Workspaces and data isolation

Create any number of workspaces within available device/database storage. Rename/edit a workspace in Settings. Duplicate copies branding, field definitions, templates and follow-up rules; customer records/history are excluded unless explicitly selected. Original documents are not copied, and copied region templates can use a new sample. Deletion affects only the selected local workspace and requires confirmation. Download its backup first. Deleting a local workspace does not silently delete a separate cloud copy; cloud copies can be removed explicitly in Cloud & backup.

## Local persistence and backup

IndexedDB retains workspace data and original file Blobs across reloads. The V2 database upgrade adds a files store without resetting the V1 state store. State and file writes share one transaction; revision checks reject stale tabs instead of overwriting newer data. Existing V1/V2 records are upgraded in memory without changing IDs or schedules; legacy field definitions are frozen in a record snapshot. V3 template edits increment versions and store previous definitions; new records snapshot enabled fields, modules, workflow and detail sections. Archived templates and historical record values remain available. Original files discarded by V1 cannot be recovered; upload them again if needed.

Originals are persisted when a template is saved or records are imported, not merely when a file is chosen. Imported Documents lists saved originals with preview, download and delete controls. Deleting an original preserves its imported records and template regions, but removes that sample preview.

Download JSON backup contains the current workspace, records, templates and original documents encoded as attachments. V1 JSON backups without attachments remain supported. Restore replaces only a matching workspace after confirmation. Backups can contain private customer information; keep them private. CSV is a report, not a complete restorable backup.

Local mode requires no Firebase, Firestore or login. It is not encrypted multi-user access control: people using the same browser profile can access loaded local workspaces. Clearing site storage can delete it. Browser data does not automatically sync to Vercel or other computers.

## Optional authenticated cloud persistence

The backend is **Supabase PostgreSQL + Auth + private object storage**, called directly from the browser using owner-scoped row-level security. There is no custom backend API server or temporary Vercel filesystem database.

1. Create your own Supabase project.
2. Run all of supabase.sql in SQL Editor, or database/001-workspaces-and-private-documents.sql. The script is rerunnable. On a V1 cloud project, rerun it to add the V2 private bucket and owner delete policies.
3. Create/confirm an email/password user under Supabase Authentication.
4. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Use only a publishable key (or legacy anon key), never service-role/secret keys in frontend code.
5. Restart dev, or add the two variables to Vercel and redeploy.
6. Settings → Cloud & backup → sign in → Push this company. Configuration/records go to PostgreSQL, and originals go to the private followup-documents bucket under the authenticated owner/workspace folder.
7. On another device, sign in to the same account, list cloud companies and Load. The app downloads original files as well as records before committing the loaded workspace locally.

Sync is manual and account-scoped, not real-time collaboration. Load the latest copy before editing on a second device, then push after editing. Revision checks reject stale cloud writes. Back up local changes before resolving a conflict. Private storage uses authenticated owner-folder RLS, not public file URLs. Different staff accounts are isolated; a shared team membership/roles feature is not implemented. Sign-out does not wipe previously loaded local data. Use trusted browser profiles.

Cloud/Vercel configuration requires the owner's account. These resources were not provisioned by the local upgrade. Read the verification report for exactly which local tests ran; live cloud permissions cannot be confirmed without a configured project.

## Download complete source

Download Source Code → Download complete source ZIP. This fetches the actual build-time release archive from this same deployment, validates required source files, injects the current workspace configuration and creates a valid ZIP. It includes all frontend source, backend SQL functions/policies, migration, package/lock files, build preparation script, examples, tests and this guide.

Customer records, original uploads, sample-document IDs, sessions, .env.local, node_modules and dist are excluded. Region geometry and label/column mappings are included. Company branding, field definitions and message templates are configuration shipped as client code and visible after deployment; keep confidential information out of these public configuration values.

The ZIP contains source rather than generated OCR binaries. npm ci installs the pinned OCR dependencies; npm run dev/build prepares their assets. Never omit public/ocr or public/releases from the built dist deployment. A missing release/engine file shows an explicit error instead of a fake successful download/import.

## Deploy to Vercel

1. Run locally and test the configuration.
2. Push the extracted project to a new private Git repository and import it into Vercel.
3. Select Vite, Node 24, build command npm run build, output directory dist. If deploying from the parent folder, set Root Directory to company-dashboard-builder.
4. Add optional Supabase environment variables if using cloud sync.
5. Deploy. vercel.json contains framework/build settings.
6. At the new website address, restore a private backup or sign in and load your cloud workspace. Source configuration alone starts with no customer records.

For updates, back up first, deploy the new source to the **same production domain** with the same Supabase project and workspace IDs, and apply the SQL migration when needed. Configuration and records live outside the deployment bundle, so they survive redeployment. Do not reset browser storage, change database projects, or rotate workspace IDs as part of an update. Vercel preview domains have separate local storage; online sync or backup transfer is needed there. Configuration edits, fields, mappings and branding save at runtime and require no rebuild. Environment-variable changes do require a rebuild because Vite embeds public build configuration.

To clone for another company, use Workspaces → Duplicate with customer copying unchecked, then edit branding/fields/automation. Download that workspace's configured source to deploy a separate app. Use a separate Supabase project or owner account if the new company requires an independent security boundary.

## Checks

```sh
npm run prepare:assets
npm test
npm run build
npm run preview
```

Automated checks cover legacy scheduling, month-end/date-field schedules, stop outcomes, normalized geometry, PDF-region text, layout warnings, spreadsheet-to-record mapping, required data, V1 migration, cloning, backup validation, atomic storage and release archive contents. Browser verification is still required for dragging/resizing regions and real format/OCR imports.

References: https://vite.dev/guide/static-deploy, https://vercel.com/docs/storage, https://supabase.com/docs/guides/storage/security/access-control, https://github.com/naptha/tesseract.js

## Structured proposal JSON

The source system can provide exact selections without relying on printed checkbox recognition. Select the intended active template when importing. Use its stable field and module keys, available in the field configuration and exported template JSON:

```json
{
  "title": "Example proposal",
  "templateName": "ANC Fee Proposal Follow-Up",
  "values": {
    "customer": "Example Company Sdn Bhd",
    "contact": "Ms. Example",
    "proposal_date": "2026-10-30"
  },
  "selectedModules": ["bpo", "tax"],
  "modules": [
    {"id": "bpo", "selected": true, "fees": {"monthly_accounting": 1200, "monthly_einvoice": 600}},
    {"id": "tax", "selected": true, "fees": {"form_c": 9000, "mitrs": 200, "form_e": 500, "form_ea": 50}}
  ]
}
```

`selectedModules` is an explicit full list; modules absent from this list are unselected. Alternatively, supply boolean `selected` flags in `modules`. Fees missing from the source retain clearly labelled template defaults or remain blank. Every import still requires human review. Native Word checkbox-control states and arbitrary photographed checkbox marks are not universally recognized; use selection regions, checked text labels, mapped true/false columns, structured JSON or manual confirmation.

## V3 storage upgrade

No destructive database migration is required for V3. The existing owner-protected JSON workspace payload stores fields, module definitions, fees, layout, template versions and record snapshots. IndexedDB retains the same database/store names. Existing V2 Supabase installations use the same SQL schema and private bucket; new installations run `supabase.sql`. Browser refresh and same-origin redeployment retain local data. Cross-device access and recovery after browser clearing require a backup or explicit Supabase push/load. Vercel hosts the app; it does not automatically receive or persist browser records.

The ANC preset ships sample standard defaults from the supplied brief. These are editable configuration, not a quote or tax calculation engine. Imported prices and conditional footnotes must be reviewed for the actual client. The app manages follow-up records; it does not generate a new Word fee proposal.
