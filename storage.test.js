import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getFile, loadState, saveState } from '../src/storage.js';

test('browser saves are atomic and reject stale tabs instead of losing company data', async () => {
  assert.equal(await loadState(), undefined);
  const first = { storageRevision: 1, workspaces: [{ config: { id: 'first-company' }, records: [{ title: 'Original' }] }] };
  await saveState(first, 0);
  assert.deepEqual(await loadState(), first);
  const second = structuredClone(first); second.storageRevision = 2; second.workspaces[0].records[0].title = 'Updated in tab one';
  await saveState(second, 1);
  const stale = structuredClone(first); stale.storageRevision = 2; stale.workspaces = [];
  await assert.rejects(saveState(stale, 1), /Another tab changed/);
  assert.deepEqual(await loadState(), second);
  const newCompany = { config: { id: 'second-company' }, records: [] };
  const third = structuredClone(second); third.storageRevision = 3; third.workspaces.push(newCompany);
  await saveState(third, 2);
  assert.equal((await loadState()).workspaces[0].records[0].title, 'Updated in tab one');
  assert.deepEqual((await loadState()).workspaces[1].records, []);
  const fourth=structuredClone(third);fourth.storageRevision=4;
  await saveState(fourth,3,[{id:'document-1',file:new Blob(['original document'],{type:'text/plain'})}]);
  assert.equal(await (await getFile('document-1')).text(),'original document');
  await assert.rejects(saveState(fourth,3,[{id:'document-1',delete:true}]),/Another tab changed/);
  assert.equal(await (await getFile('document-1')).text(),'original document');
  const fifth=structuredClone(fourth);fifth.storageRevision=5;
  await saveState(fifth,4,[{id:'document-1',delete:true}]);
  assert.equal(await getFile('document-1'),undefined);
});
