'use strict';
const ORIGINAL_KEY='life-original-finance-v1';
let originalFinance='',originalURL=null;
try{originalFinance=localStorage.getItem(ORIGINAL_KEY)||''}catch(e){}
function validOriginal(s){return typeof s==='string'&&s.length<=5000000&&(!s||/<html[\s>]/i.test(s))}
function saveOriginal(s){originalFinance=s;try{localStorage.setItem(ORIGINAL_KEY,s);return true}catch(e){return false}}
function releaseOriginalFrame(){if(originalURL){URL.revokeObjectURL(originalURL);originalURL=null}}
function mountOriginalFinance(){
 const card=document.createElement('section');card.className='card original-shell';
 card.innerHTML='<div class="row"><div><h2>보관한 원본 파일</h2></div><button id="loadOriginal">원본 HTML 불러오기</button></div><input id="originalFile" type="file" accept=".html,.htm,text/html" hidden><div id="originalMount"></div>';
 $('content').append(card);
 if(originalFinance){originalURL=URL.createObjectURL(new Blob([originalFinance],{type:'text/html;charset=utf-8'}));const frame=document.createElement('iframe');frame.title='원본 Finance OS';frame.className='original-frame';frame.setAttribute('sandbox','allow-scripts allow-downloads allow-modals');frame.src=originalURL+(location.hash==='#heat'?'#heat':'');$('originalMount').append(frame);}
 else $('originalMount').hidden=true;
 $('loadOriginal').onclick=()=>$('originalFile').click();
 $('originalFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>5000000)throw Error('5MB 이하 HTML을 선택하세요.');const html=await f.text();if(!validOriginal(html))throw Error('HTML 문서를 확인하세요.');const saved=saveOriginal(html);render();$('saveState').textContent=saved?'원본 HTML 저장 완료':'원본 열기 완료 · 저장 공간 부족. 전체 백업을 저장하세요.'}catch(err){alert(err.message)}};
}
