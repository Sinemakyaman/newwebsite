// Etkinlik sınıflandırma mantığı için küçük test: `npm test`
import assert from 'node:assert/strict';
import { renderTalks, validateTalkDates } from '../lib/talks.mjs';

const ui = { upcoming: 'Yaklaşan', past: 'Geçmiş', open: 'Aç' };
const talks = [
  { event: 'A', start: '2026-11-03' },                      // tek gün
  { event: 'B', start: '2026-05-05', end: '2026-05-08' },   // aralık
  { event: 'C', start: '2025-05' },                         // yalnızca ay
  { event: 'D', start: '2024' },                            // yalnızca yıl
];
const sig = (today) => renderTalks(talks, ui, today).signature;

assert.equal(sig('2026-10-13'), '0');          // yalnızca A yaklaşan
assert.equal(sig('2026-11-03'), '0');          // etkinlik günü hâlâ "yaklaşan"
assert.equal(sig('2026-11-04'), '');           // ertesi gün geçmişe düşer
assert.equal(sig('2026-05-08'), '1,0');        // aralığın son günü hâlâ yaklaşan; sıra: tarihe göre artan (B, sonra A)
assert.equal(sig('2026-05-09'), '0');
assert.equal(sig('2025-05-31'), '2,1,0');      // ay bitmeden "yaklaşan"
assert.equal(sig('2025-06-01'), '1,0');
assert.equal(sig('2024-12-31'), '3,2,1,0');    // yıl bitmeden "yaklaşan"
assert.match(renderTalks(talks, ui, '2026-10-13').html, /3 Kasım 2026/);
assert.match(renderTalks(talks, ui, '2026-10-13').html, /5–8 Mayıs 2026/);
assert.match(renderTalks(talks, ui, '2026-10-13').html, /Mayıs 2025/);

assert.deepEqual(validateTalkDates(talks), []);
assert.equal(validateTalkDates([{ event: 'X', start: '3 Kasım 2026' }]).length, 1);
assert.equal(validateTalkDates([{ event: 'X', start: '2026-02-30' }]).length, 1);
assert.equal(validateTalkDates([{ event: 'X', start: '2026-05-08', end: '2026-05-05' }]).length, 1);
console.log('Etkinlik testleri geçti (13 kontrol).');
