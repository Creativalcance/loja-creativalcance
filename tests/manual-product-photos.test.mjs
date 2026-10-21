import test from 'node:test';
import assert from 'node:assert/strict';
import { detectProductPhoto, parseProductPhotos } from '../src/lib/manual-products/photos.ts';
const origin='https://example.supabase.co';
const user='11111111-1111-4111-8111-111111111111';
const url=`${origin}/storage/v1/object/public/product-360-photos/${user}/22222222-2222-4222-8222-222222222222.png`;
test('photo validation uses bytes, rejecting SVG and renamed documents',()=>{
 assert.equal(detectProductPhoto(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')),null);
 assert.equal(detectProductPhoto(new TextEncoder().encode('%PDF-1.7\nnot an image')),null);
 assert.equal(detectProductPhoto(Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])).mime,'image/png');
});
test('photo URLs must belong to the current storage and administrator',()=>{
 assert.deepEqual(parseProductPhotos(JSON.stringify([url]),origin,user),[url]);
 for(const bad of [url.replace('example.','attacker.'),url+'?x=1',url.replace(user,'33333333-3333-4333-8333-333333333333'),url.replace('.png','.svg'),url.replace('22222222-2222-4222-8222-222222222222.png','../secret.png')])
  assert.throws(()=>parseProductPhotos(JSON.stringify([bad]),origin,user));
});
test('empty galleries preserve legacy URL flow; duplicates and oversized galleries are rejected',()=>{
 assert.deepEqual(parseProductPhotos('',origin,user),[]);
 assert.throws(()=>parseProductPhotos(JSON.stringify([url,url]),origin,user));
 assert.throws(()=>parseProductPhotos(JSON.stringify(Array(11).fill(url)),origin,user));
 assert.throws(()=>parseProductPhotos('{}',origin,user));
});
