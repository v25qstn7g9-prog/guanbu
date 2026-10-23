const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
// 記下送給 AI 的系統提示與長度上限，不真的呼叫 AI
const sentTokens={};
async function systemPromptFor(module){
  const {onRequestPost}=await import(pathToFileURL(path.join(__dirname,'../functions/ask.js')).href);
  let sent;
  const env={AI:{run:async(model,input)=>{sent=input.messages[0].content;sentTokens[module]=input.max_tokens;return {response:'ok'};}}};
  const request=new Request('http://x/ask',{method:'POST',body:JSON.stringify({module,lang:'zh',facts:{A:1}})});
  const res=await onRequestPost({request,env});
  assert.equal(res.status,200);
  return sent;
}
test('the Zi Wei AI writes a whole-chart summary instead of repeating every palace',async()=>{
  const ziwei=await systemPromptFor('ziwei');
  assert.match(ziwei,/紫微綜合總結任務/);
  assert.match(ziwei,/財帛宮、官祿宮、遷移宮/);
  assert.match(ziwei,/不要逐宮照抄/);
  assert.match(ziwei,/【給你的建議】/);
  assert.match(ziwei,/900～1300 字/);
  for(const other of ['yijing','tarot','runes','daily']) assert.doesNotMatch(await systemPromptFor(other),/綜合總結任務/);
  assert.ok(sentTokens.ziwei>=4000,'Zi Wei summary needs room for a long answer');
  for(const other of ['yijing','tarot','runes','daily']) assert.equal(sentTokens[other],700);
});
