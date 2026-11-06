import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoute,routePage,scheduleEntries} from '../src/navigation.js';
test('navigation safely restores bookmarked routes and old dashboard links',()=>{
 assert.equal(readRoute('#/schedule'),'schedule');assert.equal(routePage(readRoute('#/library-create')),'library');assert.equal(routePage(readRoute('#/field-mapping')),'templates');assert.equal(readRoute('#/dashboard'),'home');assert.equal(readRoute('#/unsupported-page'),'home');assert.equal(readRoute('#/records?anything=1'),'records');
});
test('schedule uses real attempt dates, excludes paused reminders and filters without changing records',()=>{
 const records=[{id:'a',title:'Client A',outcome:'open',schedule:[{id:'a2',due:'2026-11-12',completedAt:null},{id:'a1',due:'2026-11-05',completedAt:'2026-11-05T10:00:00Z'}]},{id:'b',title:'Client B',outcome:'paused',schedule:[{id:'b1',due:'2026-11-01',completedAt:null}]}];
 const before=structuredClone(records);assert.deepEqual(scheduleEntries(records).map(e=>e.step.id),['a1','a2']);assert.deepEqual(scheduleEntries(records,{status:'pending'}).map(e=>e.step.id),['a2']);assert.deepEqual(scheduleEntries(records,{status:'completed'}).map(e=>e.step.id),['a1']);assert.equal(scheduleEntries(records,{from:'2026-11-06',to:'2026-11-11'}).length,0);assert.deepEqual(records,before);
});
