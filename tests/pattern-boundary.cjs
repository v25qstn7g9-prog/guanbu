const {test}=require('node:test');
const assert=require('node:assert/strict');
test('build converter handles beginning and end 干 without treating empty string as stem context',async()=>{const {convert}=await import('../ziwei-engine/build-pattern-terms.mjs');assert.equal(convert('技术骨干'),'技術骨幹');assert.equal(convert('干活'),'幹活');for(const s of ['天干','年干','干支','阴干年'])assert.ok(convert(s).includes('干'));});
