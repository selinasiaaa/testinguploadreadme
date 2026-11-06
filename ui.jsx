import { useEffect, useId, useRef, useState } from 'react';

import { ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Cloud, Copy, Download, FileScan, FileText, FolderOpen, LayoutDashboard, ListFilter, LoaderCircle, Mail, MessageCircle, Plus, Search, Settings2, Sparkles, Trash2, Upload, X } from 'lucide-react';

export const Label = ({ children, hint }) => <div className="field-label">{children}{hint && <span>{hint}</span>}</div>;

export function Button({ icon: Icon, children, kind = '', className = '', type = 'button', ...props }) { return <button type={type} className={`button ${kind} ${className}`} {...props}>{Icon && <Icon size={16} />}{children}</button>; }

export function Empty({ icon: Icon = FolderOpen, title, children, action }) { return <div className="empty"><div className="empty-icon"><Icon size={26} /></div><h3>{title}</h3><p>{children}</p>{action}</div>; }

export function Modal({ title, children, onClose, wide = false }) {

  const dialogRef = useRef(null);

  const titleId = useId();

  useEffect(() => { const dialog = dialogRef.current; dialog.showModal(); return () => dialog.close(); }, []);

  return <dialog ref={dialogRef} aria-labelledby={titleId} className={`modal ${wide ? 'wide' : ''}`} onCancel={(event) => { event.preventDefault(); onClose(); }}><div className="modal-head"><h2 id={titleId}>{title}</h2><button aria-label="Close dialog" className="icon-button" onClick={onClose}><X size={21} /></button></div>{children}</dialog>;

}

export function FileInput({ children, accept, onFile, disabled, className = '' }) {

  return <label className={`button ${className} ${disabled ? 'disabled' : ''}`}><Upload size={16} />{children}<input disabled={disabled} className="sr-only" type="file" accept={accept} onChange={async (event) => { const file = event.target.files[0]; event.target.value = ''; if (file) await onFile(file); }} /></label>;

}

export function Confirm({ request, onClose }) { return <Modal title={request.title} onClose={onClose}><div className="modal-body"><p>{request.message}</p></div><div className="modal-foot"><Button onClick={onClose}>Cancel</Button><Button kind={request.danger ? 'danger' : 'primary'} onClick={async () => { onClose(); await request.action(); }}>{request.label || 'Continue'}</Button></div></Modal>; }

export function FieldInput({field,value='',onChange,...props}) {

 if(field.type==='multiselect')return <div className="multiselect-options">{(field.options||[]).map((option)=><label className="check-label" key={option}><input type="checkbox" checked={(Array.isArray(value)?value:[]).includes(option)} disabled={props.disabled} onChange={(e)=>onChange(e.target.checked?[...(Array.isArray(value)?value:[]),option]:(Array.isArray(value)?value:[]).filter((v)=>v!==option))}/>{option}</label>)}</div>;
 if(field.type==='table'){const rows=Array.isArray(value)?value:[],columns=field.columns?.length?field.columns:[{id:'description',label:'Description'},{id:'amount',label:'Amount'}];return <div className="repeating-table"><div className="table-scroll"><table><thead><tr>{columns.map((c)=><th key={c.id}>{c.label}</th>)}<th>Action</th></tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{columns.map((c)=><td key={c.id}><input aria-label={`${field.label} row ${i+1} ${c.label}`} disabled={props.disabled} value={row[c.id]??''} onChange={(e)=>onChange(rows.map((r,j)=>j===i?{...r,[c.id]:e.target.value}:r))}/></td>)}<td><Button disabled={props.disabled} onClick={()=>onChange(rows.filter((_,j)=>j!==i))}>Remove row</Button></td></tr>)}</tbody></table></div><Button disabled={props.disabled} onClick={()=>onChange([...rows,Object.fromEntries(columns.map((c)=>[c.id,'']))])}>Add row</Button></div>;}
 if(field.type==='checkbox')return <span className="check-label"><input type="checkbox" checked={value==='true'} onChange={(e)=>onChange(e.target.checked?'true':'false')} {...props}/>Yes</span>;

 if(field.type==='dropdown')return <select value={value} onChange={(e)=>onChange(e.target.value)} {...props}><option value="">Select…</option>{(field.options||[]).map((o)=><option key={o}>{o}</option>)}</select>;

 if(field.type==='textarea')return <textarea rows={3} value={value} onChange={(e)=>onChange(e.target.value)} {...props}/>;

 return <input type={field.type==='currency'?'number':field.type} step={['number','currency'].includes(field.type)?'any':undefined} onInput={field.type==='date'?(e)=>onChange(e.currentTarget.value):undefined} value={value} onChange={(e)=>onChange(e.target.value)} {...props}/>;

}



