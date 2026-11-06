import {validateTemplateDefinition,defaultSections} from './templates.js';
export const uid = () => crypto.randomUUID();

export const clone = (value) => structuredClone(value);

export const today = () => localDate(new Date());

export function localDate(date) {

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

}

export function validDate(value) {

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);

  return !Number.isNaN(date.getTime()) && localDate(date) === value;

}

export function addDays(value, days) {

  if (!validDate(value)) throw new Error('Choose a valid start date.');

  const date = new Date(`${value}T12:00:00`);

  date.setDate(date.getDate() + days);

  return localDate(date);

}

export function formatDate(value) {

  return validDate(value) ? new Date(`${value}T12:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

}

export function makeSchedule(start, cadence) {

  const days = Number(cadence.every) * (cadence.unit === 'weeks' ? 7 : 1);

  return Array.from({ length: Number(cadence.count) }, (_, index) => ({

    id: uid(), due: scheduleDate(start,cadence,index),

    title: cadence.steps[index]?.title || `Follow-up ${index + 1}`,

    message: cadence.steps[index]?.message || 'Hi {{contact}}, following up on {{reference}}. — {{company}}',

    completedAt: null,

  }));

}

function scheduleDate(start,cadence,index){
 let date=cadence.firstDate ? (cadence.unit==='months'?addMonths(cadence.firstDate,Number(cadence.every)*index):addDays(cadence.firstDate,Number(cadence.every)*(cadence.unit==='weeks'?7:1)*index)) : (cadence.unit==='months'?addMonths(start,Number(cadence.every)*(index+1)):addDays(start,Number(cadence.every)*(cadence.unit==='weeks'?7:1)*(index+1)));
 if(cadence.skipWeekends)while([0,6].includes(new Date(date+'T12:00:00').getDay()))date=addDays(date,1);
 return date;
}

export function nextStep(record) {

  if (record.outcome !== 'open') return null;

  return record.schedule.filter((step) => !step.completedAt).sort((a, b) => a.due.localeCompare(b.due))[0] || null;

}

export function recordStatus(record, date = today()) {

  if (record.outcome !== 'open') return record.outcome;

  const next = nextStep(record);

  return !next ? 'completed' : next.due < date ? 'overdue' : next.due === date ? 'today' : 'upcoming';

}

export function renderMessage(template, record, config) {

  const values = { ...record.values, services:(record.serviceModules||[]).filter(m=>m.selected).map(m=>m.name).join(', '), client_name:record.values.customer||record.values.company_name||record.title, proposal_date:record.values.proposal_date||record.values.document_date||'', title: record.title, owner: record.owner, company: config.company.name, signature: config.company.signature || '', company_email: config.company.email || '', company_phone: config.company.phone || '' };

  return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, key) => Array.isArray(values[key])?values[key].map((v)=>typeof v==='object'?Object.values(v).join(' / '):v).join(', '):String(values[key] ?? ''));

}

export function normalizeField(value, type) {

  if(type==='multiselect'){if(Array.isArray(value))return value.map(String);try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return parsed.map(String);}catch{}return String(value||'').split(',').map((v)=>v.trim()).filter(Boolean);}
  if(type==='table'){if(Array.isArray(value))return value;try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[];}catch{return [];}}
  const text = String(value ?? '').trim();

  if (type === 'checkbox') return /^(true|yes|1|checked|paid|☑|✓|✔|\[x\])$/i.test(text) ? 'true' : 'false';

  if (type === 'number' || type === 'currency') {

    const number = text.replace(/^(?:RM|MYR|USD|SGD|EUR|GBP|\$)\s*/i, '').replace(/,/g, '');
    if(!/^-?\d+(?:\.\d+)?$/.test(number))return ''; 

    return number && Number.isFinite(Number(number)) ? number : '';

  }

  if (type === 'date') {
    // A selected Word/PDF/OCR area can include the printed "Date:" label.
    const dateText = text.replace(/^(?:(?:document|proposal)\s+)?date\s*[:#=\-]\s*/i, '');
    if (validDate(dateText)) return dateText;

    const named = dateText.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
    if (named) {
      const month = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(named[2].toLowerCase()) + 1;
      const converted = `${named[3]}-${String(month).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
      return validDate(converted) ? converted : '';
    }

    const match = dateText.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);

    const converted = match && `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;

    return validDate(converted) ? converted : '';

  }

  return text;

}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function extractFields(text, fields, template) {

  const aliases = (field) => {
    const configured = String(template?.mappings?.[field.id] || field.aliases || field.label).split(',').map((x) => x.trim()).filter(Boolean);
    if (field.type === 'date' && (field.id === 'document_date' || field.id === 'proposal_date' || /^document date$/i.test(field.label.trim()))) {
      if (!configured.some((x) => x.toLowerCase() === 'date')) configured.push('Date');
    }
    return configured;
  };

  const allLabels = fields.flatMap(aliases).sort((a, b) => b.length - a.length).map(escapeRegex).join('|');

  const result = {};

  for (const field of fields) {

    for (const label of aliases(field)) {

      const prefix = label.toLowerCase() === 'date' ? '(?:^|\\n)[ \\t]*' : '(?:^|[ \\t|])';
      const pattern = new RegExp(`${prefix}${escapeRegex(label)}(?![\\p{L}\\p{N}_])[ \\t]*(?:[:#=\\-][ \\t]*)?([^\\n\\r]*)`, 'imu');

      const match = text.match(pattern);

      if (!match) continue;

      let value = match[1].trim();

      if (allLabels) value = value.split(new RegExp(`\\s+(?:${allLabels})\\s*[:#=]`, 'i'))[0].trim();

      if (field.type === 'email') value = value.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';

      result[field.id] = normalizeField(value, field.type);

      break;

    }

  }

  return result;

}

export function validateConfig(config) {

  if (!config || config.version !== 1 || typeof config.id !== 'string' || !config.id || config.id.length > 100) throw new Error('Unsupported dashboard configuration.');

  if (!config.company || typeof config.company.name !== 'string' || !config.company.name.trim()) throw new Error('Enter a company name.');

  if (typeof config.company.subtitle !== 'string' || typeof config.company.logo !== 'string') throw new Error('Company branding must contain text and an optional image logo.');

  if (!/^#[0-9a-f]{6}$/i.test(config.company.color)) throw new Error('Choose a valid brand color.');

  if (!/^[A-Z]{3}$/.test(config.company.currency)) throw new Error('Currency must be a three-letter code, e.g. MYR.');

  if (config.company.logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(config.company.logo)) throw new Error('Use a PNG, JPG, or WebP logo.');

  if (String(config.company.logo || '').length > 2800000) throw new Error('Logo is too large. Use an image under 2 MB.');

  if (!Array.isArray(config.fields) || config.fields.length < 1 || config.fields.length > 30) throw new Error('Add between 1 and 30 fields.');

  const ids = new Set();

  for (const field of config.fields) {

    if (!/^[a-z][a-z0-9_]*$/.test(field.id) || ['__proto__', 'constructor', 'prototype', 'company', 'owner', 'title'].includes(field.id) || ids.has(field.id)) throw new Error('Field keys must be unique, start with a letter, and contain only lowercase letters, numbers or underscores. Avoid company, owner and title.');

    ids.add(field.id);

    if (field.type === 'dropdown' && (!Array.isArray(field.options) || !field.options.length || field.options.some((o) => typeof o !== 'string' || !o.trim()))) throw new Error('Dropdown fields need options.');

    if (typeof field.label !== 'string' || !field.label.trim() || typeof field.required !== 'boolean' || typeof field.aliases !== 'string' || !['text', 'textarea', 'number', 'date', 'email', 'tel', 'currency', 'dropdown', 'checkbox', 'multiselect', 'table'].includes(field.type)) throw new Error('Every field needs a name, OCR label text, and a supported type.');

  }

  const c = config.cadence;

  if (!c || !Number.isInteger(Number(c.count)) || c.count < 1 || c.count > 24 || !Number.isInteger(Number(c.every)) || c.every < 1 || c.every > 365 || !['days', 'weeks', 'months'].includes(c.unit) || !Array.isArray(c.steps) || c.steps.length !== Number(c.count)) throw new Error('Use 1–24 follow-ups, spaced 1–365 days or weeks apart.');

  if (c.steps.some((step) => typeof step.title !== 'string' || !step.title.trim() || typeof step.message !== 'string')) throw new Error('Each follow-up needs a title and message text.');

  if (!Array.isArray(config.templates) || new Set(config.templates.map((t) => t?.id)).size !== config.templates.length || config.templates.some((t) => !t || typeof t.id !== 'string' || typeof t.name !== 'string' || !t.name.trim() || typeof t.mappings !== 'object' || !t.mappings || Array.isArray(t.mappings) || Object.values(t.mappings).some((v) => typeof v !== 'string'))) throw new Error('Invalid OCR templates.');

  if (c.startField && c.startField !== 'startedOn' && !config.fields.some((f) => f.id === c.startField && f.type === 'date')) throw new Error('Choose an existing date field for the schedule start.');

  if (config.workspace && (!config.workspace.name?.trim() || !['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'].includes(config.workspace.dateFormat))) throw new Error('Enter a workspace name and supported date format.');
  if (config.company.secondaryColor && !/^#[0-9a-f]{6}$/i.test(config.company.secondaryColor)) throw new Error('Choose a valid secondary color.');
  for (const template of config.templates) {
    validateTemplateDefinition(template);
    const regionFields=(template.fields||config.fields).concat((template.modules||[]).flatMap((m)=>[{id:`module_${m.id}_selection`},...(m.fields||[]).map((f)=>({...f,id:`module_${m.id}_${f.id}`}))]));
    if (template.regions && new Set(template.regions.map((r)=>r.fieldId)).size!==template.regions.length) throw new Error('Assign each dashboard field to one region per template.');

    if (template.regions && (!Array.isArray(template.regions) || template.regions.some((r) => !regionFields.some((f) => f.id === r.fieldId) || !Number.isInteger(r.page) || r.page < 1 || !['rectangle', 'ellipse'].includes(r.shape) || ![r.x,r.y,r.width,r.height].every(Number.isFinite) || r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 || r.x + r.width > 1.001 || r.y + r.height > 1.001))) throw new Error('OCR regions must reference existing fields and stay within the page.');

  }

  return config;

}

export function validateWorkspace(workspace) {

  validateConfig(workspace?.config);

  if (workspace.documents && (!Array.isArray(workspace.documents) || new Set(workspace.documents.map((d)=>d.id)).size!==workspace.documents.length || workspace.documents.some((d)=>!d || !/^[a-zA-Z0-9_-]{1,100}$/.test(d.id) || typeof d.name!=='string' || typeof d.type!=='string' || !Number.isFinite(d.size) || d.size>15*1024*1024))) throw new Error('Invalid workspace document metadata.');
  if (!Array.isArray(workspace.records)) throw new Error('Backup has no records list.');

  const ids = new Set();

  for (const record of workspace.records) {

    if (typeof record.id !== 'string' || ids.has(record.id) || typeof record.title !== 'string' || !record.title.trim() || (record.owner !== undefined && typeof record.owner !== 'string') || (record.notes !== undefined && typeof record.notes !== 'string') || !record.values || typeof record.values !== 'object' || Array.isArray(record.values) || Object.values(record.values).some((value) => !storedValue(value)) || !validDate(record.startedOn) || !['open', 'won', 'lost', 'paused', 'completed', 'paid', 'replied', 'cancelled'].includes(record.outcome) || !Array.isArray(record.schedule) || record.schedule.length > 24) throw new Error('Backup contains an invalid record.');

    if(record.clientOutcome&&!['awaiting','interested','accepted','declined','hold'].includes(record.clientOutcome))throw new Error('Invalid client outcome.');
    ids.add(record.id);
    if(record.templateSnapshot)validateTemplateDefinition(record.templateSnapshot);
    if(record.serviceModules&&(!Array.isArray(record.serviceModules)||record.serviceModules.some((m)=>typeof m.moduleId!=='string'||typeof m.name!=='string'||typeof m.selected!=='boolean'||!m.fees||typeof m.fees!=='object'||Object.values(m.fees).some((f)=>!f||!storedValue(f.value)))))throw new Error('Invalid saved service modules or fees.');

    const stepIds = new Set();

    for (const step of record.schedule) {

      if (typeof step.id !== 'string' || stepIds.has(step.id) || !validDate(step.due) || typeof step.title !== 'string' || typeof step.message !== 'string' || (step.completedAt !== null && (typeof step.completedAt !== 'string' || Number.isNaN(Date.parse(step.completedAt))))) throw new Error('Backup contains an invalid follow-up schedule.');

      stepIds.add(step.id);

    }

    if (!Array.isArray(record.history) || record.history.some((item) => typeof item.id !== 'string' || typeof item.text !== 'string' || Number.isNaN(Date.parse(item.at)))) throw new Error('Backup contains invalid activity history.');

  }

  return workspace;

}

export function csv(records, fields) {

  const headers = ['Title', 'Owner', 'Started on', 'Status', 'Next follow-up', ...fields.map((f) => f.label)];

  const cell = (value) => {

    let text = String(value ?? '');

    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;

    return `"${text.replace(/"/g, '""')}"`;

  };

  return '\uFEFF' + [headers, ...records.map((r) => [r.title, r.owner, r.startedOn, recordStatus(r), nextStep(r)?.due || '', ...fields.map((f) => r.values[f.id] || '')])].map((row) => row.map(cell).join(',')).join('\r\n');

}



export function addMonths(value, months) {

  if (!validDate(value)) throw new Error('Choose a valid date.');

  const [year, month, day] = value.split('-').map(Number);

  const last = new Date(year, month - 1 + months + 1, 0, 12).getDate();

  return localDate(new Date(year, month - 1 + months, Math.min(day, last), 12));

}

export function scheduleStart(record, cadence) {

  const value = cadence.startField && cadence.startField !== 'startedOn' ? record.values[cadence.startField] : record.startedOn;

  if (!validDate(value)) throw new Error('Fill in the configured starting date field before generating follow-ups.');

  return value;

}

export function upgradeWorkspace(workspace) {

  const w = clone(workspace);

  w.documents ||= [];

  const c = w.config;

  c.workspace ||= { name: c.company.name, description: '', dateFormat: 'DD/MM/YYYY' };

  c.company = { secondaryColor: '#edf3f1', email: '', phone: '', address: '', title: 'FollowUp Workspace', signature: '', ...c.company };

  c.cadence.startField ||= 'startedOn';

  c.fields = c.fields.map((f) => ({ visible: true, detailVisible: true, options: [], ...f }));

  c.templates = c.templates.map((t) => ({ kind: 'labels', regions: [], status:'active',version:1,versions:[], ...t }));

  w.records=w.records.map((record)=>record.templateSnapshot?record:{...record,templateId:record.templateId||'legacy_workspace_default',templateVersion:1,templateSnapshot:{id:record.templateId||'legacy_workspace_default',name:'Workspace default (legacy)',version:1,fields:clone(c.fields),modules:[],workflow:clone(c.cadence),sections:defaultSections(c.fields)}});
  return w;

}

export function makeRecord(values, config, extra = {}) {

  const record = { id: uid(), title: values.reference || values.customer || Object.values(values).find(Boolean) || 'Imported record', owner: '', startedOn: today(), values: Object.fromEntries(config.fields.map((f) => [f.id, normalizeField(values[f.id], f.type)])), outcome: 'open', notes: '', history: [], ...extra };

  for (const field of config.fields) {

    const value = record.values[field.id];

    if (field.required && (!value || (Array.isArray(value)&&!value.length) || (field.type === 'checkbox' && value !== 'true'))) throw new Error(`${field.label} is required.`);

    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${field.label} must be a valid email.`);

    if (field.type === 'dropdown' && value && !field.options.includes(value)) throw new Error(`${field.label} must match a dropdown option.`);

  }

  if(!record.title.trim())throw new Error('Record title is required.');
  record.schedule = makeSchedule(scheduleStart(record, config.cadence), config.cadence);

  record.history.push({ id: uid(), at: new Date().toISOString(), text: 'Record imported. Follow-up dates generated.' });

  return record;

}

export function cloneWorkspace(source, { name, includeRecords = false } = {}) {

  const w = upgradeWorkspace(source); w.config.id = uid(); w.config.workspace.name = name || `${w.config.workspace.name} copy`;

  w.documents = []; w.updatedAt = new Date().toISOString();

  w.config.templates.forEach((t) => { delete t.sampleDocumentId; });

  if (!includeRecords) w.records = [];

  else w.records = w.records.map((r) => ({ ...r, id: uid(), documentId: undefined, schedule: r.schedule.map((s) => ({ ...s, id: uid() })), history: r.history.map((h) => ({ ...h, id: uid() })) }));

  return w;

}

export function displayValue(value, field, config) {

  if (value === undefined || value === '') return '—';

  if (field.type === 'checkbox') return value === 'true' ? 'Yes' : 'No';

  if (field.type === 'date' && validDate(value)) {

    const [y,m,d] = value.split('-'); const format = config.workspace?.dateFormat;

    return format === 'YYYY-MM-DD' ? value : format === 'MM/DD/YYYY' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;

  }

  if (field.type === 'currency') return `${config.company.currency} ${Number(value).toLocaleString('en-MY', {minimumFractionDigits:2,maximumFractionDigits:2})}`;

  if(Array.isArray(value))return field.type==='table'?`${value.length} rows`:value.join(', ');
  return String(value);

}


function storedValue(v){return typeof v==='string'||(Array.isArray(v)&&v.every((item)=>typeof item==='string'||(item&&typeof item==='object'&&!Array.isArray(item)&&Object.values(item).every((cell)=>cell===null||['string','number','boolean'].includes(typeof cell)))));}
