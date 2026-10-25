const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
// 直接載入網頁用的打包檔（和瀏覽器同一份）
function load(file,expose){const g={};new Function('window',fs.readFileSync(path.join(__dirname,'../public',file),'utf8')+';'+expose)(g);return g;}
const engine=load('ziwei-engine.js','window.E=GuanbuZiwei;').E;
const terms=load('ziwei-pattern-terms.js','window.f=zwPatternText;').f;

test('the engine rejects dates, times and genders that do not exist instead of charting another day',()=>{
  for(const [date,time,gender,msg] of [['2023-02-29','23:30','M',/day does not exist/],['2023-02-31','10:00','M',/day does not exist/],['1990-05-09','10:61','M',/invalid time/],['1990-05-09','10','M',/invalid time/],['1990-05-09','24:00','M',/invalid time/],['1990-05-09','10:00','X',/invalid gender/],['1990-05-09','10:00','',/invalid gender/],['1990-5-9','10:00','M',/invalid date/]])
    assert.throws(()=>engine.buildChart({date,time,gender}),msg,`${date} ${time} ${gender}`);
  assert.equal(engine.buildChart({date:'2024-02-29',time:'23:30',gender:'F'}).chartDate,'2024-03-01');
  // 只排 1900–2100 年：0–99 年不會被 Date.UTC 當成 1900 年代
  for(const date of ['0050-03-01','1899-12-31','2101-01-01']) assert.throws(()=>engine.validateBirth({date,time:'10:00',gender:'M'}),/year must be 1900-2100/,date);
  for(const date of ['1900-01-01','2100-12-31']) assert.doesNotThrow(()=>engine.validateBirth({date,time:'10:00',gender:'M'}),date);
});
test('the page facts limit is the same as the server limit',()=>{
  const page=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8').match(/const ZW_FACTS_LIMIT=(\d+);/)[1];
  const server=fs.readFileSync(path.join(__dirname,'../functions/ask.js'),'utf8').match(/const MAX_FACTS_LEN = (\d+);/)[1];
  assert.equal(page,server);
});
test('pattern results keep the upstream conditions, breaking warnings and source',()=>{
  const p=engine.buildChart({date:'1940-08-15',time:'10:00',gender:'M'}).patterns.find(x=>x.name==='府相朝垣');
  assert.ok(p,'府相朝垣 should be detected');
  assert.deepEqual(p.breaking,['命宫坐煞星','三方四正煞星过多']);
  assert.ok(p.required.length>0);assert.match(p.source,/紫微斗数全书/);
});
test('pattern text uses Zi Wei wording: 丑 stays 丑, stem 干 stays 干, 骨干 becomes 骨幹',()=>{
  const r=engine.buildChart({date:'1940-12-07',time:'06:00',gender:'M'}).patterns.find(p=>p.name==='武贪格');
  assert.ok(r,'武贪格 should be detected');assert.equal(terms(r.required[0]),'武曲貪狼同宮（丑/未）');
  assert.equal(terms('陰干年'),'陰干年');assert.equal(terms('年干'),'年干');assert.match(terms('技术骨干'),/骨幹/);
  assert.doesNotMatch(terms('太阳太阴同入丑宫'),/醜/);
});
test('pattern text in Traditional Chinese matches the build-time conversion of the whole sentence',async()=>{
  const {convert}=await import(pathToFileURL(path.join(__dirname,'../ziwei-engine/build-pattern-terms.mjs')).href);
  const strings=new Set();
  for(const date of ['1940-08-15','1955-02-03','1970-01-20','1988-07-15','1999-11-30','2012-05-05'])for(const time of ['00:30','06:00','10:00','15:00','21:00'])for(const gender of ['M','F'])
    engine.buildChart({date,time,gender}).patterns.forEach(p=>[p.name,p.source,p.description,...p.required,...p.bonus,...p.breaking].forEach(s=>s&&strings.add(s)));
  assert.ok(strings.size>50);
  const bad=[...strings].filter(s=>terms(s)!==convert(s));
  assert.deepEqual(bad,[]);
});
