import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, clone, csv, extractFields, makeSchedule, nextStep, normalizeField, recordStatus, renderMessage, uid, validDate, validateConfig, validateWorkspace } from '../src/domain.js';
// Test fixtures stay independent of the company configuration in an exported project.
const config = {
  version: 1, id: 'test-company', company: { name: 'Example Co', subtitle: '', logo: '', color: '#185b4c', currency: 'MYR' },
  fields: [
    { id: 'customer', label: 'Customer', type: 'text', aliases: 'Customer, Company', required: true },
    { id: 'contact', label: 'Contact', type: 'text', aliases: 'Attention, Attn', required: false },
    { id: 'reference', label: 'Reference', type: 'text', aliases: 'Quotation No, Reference', required: false },
    { id: 'email', label: 'Email', type: 'email', aliases: 'Email', required: false },
    { id: 'amount', label: 'Amount', type: 'number', aliases: 'Grand Total', required: false },
  ],
  cadence: { count: 3, every: 1, unit: 'weeks', steps: [1, 2, 3].map((n) => ({ title: `Step ${n}`, message: 'Hi {{contact}}, checking in on {{reference}}. — {{company}}' })) },
  templates: [],
};
const record = () => ({ id: uid(), title: 'Quotation', values: { customer: 'Example Trading', contact: 'Alex', reference: 'QT-1' }, owner: 'Sam', startedOn: '2026-10-29', outcome: 'open', schedule: makeSchedule('2026-10-29', config.cadence), history: [] });

test('weekly sequence generates all requested details at 7, 14, 21 days', () => {
  const schedule = makeSchedule('2026-10-29', config.cadence);
  assert.deepEqual(schedule.map((s) => s.due), ['2026-11-05', '2026-11-12', '2026-11-19']);
  assert.equal(schedule[0].title, config.cadence.steps[0].title);
  assert.equal(schedule[2].message, config.cadence.steps[2].message);
  assert.equal(new Set(schedule.map((s) => s.id)).size, 3);
});
test('calendar handles leap years and year boundaries', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-28', 7), '2027-01-04');
  assert.equal(validDate('2026-02-30'), false);
  assert.throws(() => addDays('invalid', 1));
});
test('completion preserves later scheduled dates and handles exhausted/closed/paused sequences', () => {
  const r = record();
  r.schedule[0].completedAt = '2026-11-09T00:00:00.000Z';
  assert.equal(nextStep(r).due, '2026-11-12');
  assert.equal(recordStatus(r, '2026-11-13'), 'overdue');
  assert.equal(recordStatus(r, '2026-11-12'), 'today');
  assert.equal(recordStatus(r, '2026-11-10'), 'upcoming');
  r.schedule.forEach((s) => { s.completedAt = new Date().toISOString(); });
  assert.equal(recordStatus(r), 'completed');
  for (const outcome of ['won', 'lost', 'paused']) { r.outcome = outcome; assert.equal(nextStep(r), null); assert.equal(recordStatus(r), outcome); }
});
test('rescheduling an unfinished stage changes the next due date by calendar order', () => {
  const r = record(); r.schedule[0].due = '2026-12-01';
  assert.equal(nextStep(r).due, '2026-11-12');
});
test('record sequence snapshot is independent from company rule edits', () => {
  const c = clone(config); const r = record(); c.cadence.steps[0].title = 'Changed'; c.cadence.every = 2;
  assert.notEqual(r.schedule[0].title, c.cadence.steps[0].title);
  assert.equal(r.schedule[0].due, '2026-11-05');
});
test('OCR extracts aliases, custom template overrides, numeric and date fields', () => {
  const text = 'Customer: Example Trading\nAttention: Alex Tan\nQuotation No: QT-1001\nEmail: alex@example.com\nGrand Total: MYR 2,400.50\nDelivery Date: 05/11/2026';
  const fields = [...config.fields, { id: 'delivery', label: 'Delivery', type: 'date', aliases: 'Delivery Date' }];
  const values = extractFields(text, fields);
  assert.equal(values.customer, 'Example Trading'); assert.equal(values.contact, 'Alex Tan');
  assert.equal(values.reference, 'QT-1001'); assert.equal(values.amount, '2400.50');
  assert.equal(values.email, 'alex@example.com'); assert.equal(values.delivery, '2026-11-05');
  assert.equal(extractFields('Invoice Ref: INV-22', fields, { mappings: { reference: 'Invoice Ref' } }).reference, 'INV-22');
  assert.equal(extractFields('Nothing relevant', fields).customer, undefined);
});
test('OCR supports escaped label punctuation and same-line labeled columns', () => {
  assert.equal(extractFields('Doc (Ref).: A-1', [{ id: 'ref', label: 'Ref', type: 'text', aliases: 'Doc (Ref).' }]).ref, 'A-1');
  const values = extractFields('Customer: Example Trading  Attention: Alex', config.fields);
  assert.equal(values.customer, 'Example Trading'); assert.equal(values.contact, 'Alex');
});
test('Word Date label maps an English month date to Document Date', () => {
  const fields = [{ id: 'document_date', label: 'Document Date', type: 'date', aliases: '', source: 'label' }];
  assert.equal(extractFields('Fee proposal\nDate: 29 October 2026\nDue Date: 30 November 2026', fields).document_date, '2026-10-29');
  assert.equal(extractFields('Due Date: 30 November 2026', fields).document_date, undefined);
  assert.equal(normalizeField('29 October 2026', 'date'), '2026-10-29');
  assert.equal(normalizeField('Date: 29 October 2026', 'date'), '2026-10-29');
  assert.equal(normalizeField('Document Date: 29 October 2026', 'date'), '2026-10-29');
  assert.equal(normalizeField('31 February 2026', 'date'), '');
});
test('empty OCR values never consume the next line or a label prefix', () => {
  const values = extractFields('Customer:\nAttention: Alex\nEmailAddress: wrong@example.com', config.fields);
  assert.equal(values.customer, '');
  assert.equal(values.contact, 'Alex');
  assert.equal(values.email, undefined);
});
test('field conversion leaves uncertain invalid dates empty', () => {
  assert.equal(normalizeField('31/02/2026', 'date'), '');
  assert.equal(normalizeField('2.400,50', 'number'), '2.40050'); // documented point-decimal convention
  assert.equal(normalizeField('no amount', 'number'), '');
});
test('messages resolve company, custom fields, owner, and unknown placeholders', () => {
  const c = clone(config); c.company.name = 'New Co';
  assert.equal(renderMessage('{{contact}} / {{company}} / {{owner}} / {{missing}}', record(), c), 'Alex / New Co / Sam / ');
});
test('configuration rejects duplicate/reserved keys, malformed schedules, and active logo content', () => {
  assert.equal(validateConfig(config), config);
  const c = clone(config); c.fields[1].id = 'customer'; assert.throws(() => validateConfig(c));
  c.fields[1].id = 'constructor'; assert.throws(() => validateConfig(c));
  c.fields[1].id = 'contact'; c.company.logo = 'javascript:alert(1)'; assert.throws(() => validateConfig(c));
  c.company.logo = ''; c.cadence.count = 0; assert.throws(() => validateConfig(c));
});
test('backup rejects broken record/schedule/history while accepting a complete workspace', () => {
  const w = { config: clone(config), records: [record()] }; assert.equal(validateWorkspace(w), w);
  w.records[0].schedule[0].due = 'not-a-date'; assert.throws(() => validateWorkspace(w));
  w.records = [record()]; w.records[0].history = [{ id: uid(), text: 'note', at: 'bad' }]; assert.throws(() => validateWorkspace(w));
  w.records = [record()]; w.records.push(clone(w.records[0])); assert.throws(() => validateWorkspace(w));
});
test('cloned configuration gets an independent company ID and settings', () => {
  const c = clone(config); c.id = uid(); c.company.name = 'Another Co';
  assert.notEqual(c.id, config.id); assert.notEqual(c.company.name, config.company.name);
  assert.equal(c.fields[0].id, config.fields[0].id);
});
test('CSV neutralizes formulas and quotes cells with commas/newlines', () => {
  const r = record(); r.title = '=1+1'; r.values.customer = 'Example, "Trading"\nCo';
  const result = csv([r], config.fields);
  assert.ok(result.includes('"\'=1+1"')); assert.ok(result.includes('"Example, ""Trading""\nCo"'));
});
