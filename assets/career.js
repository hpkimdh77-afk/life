'use strict';
const CAREER_KEY='life-career-v1';
const careerDefault=()=>({version:1,goal:'55세 이후 소방안전 서비스 창업',items:[
 ['업무','EHS 안전기획 · 사고 복기회의','진행 중','복기회의 운영 경험을 익명화한 개선 사례로 정리'],
 ['업무','주간 안전 KPI 리포팅','진행 중','지표 정의와 보고 자동화 개선점 1개 기록'],
 ['AI','AI 안전 데이터 플랫폼','진행 중','사고 기록·검색·KPI 중 먼저 완성할 기능 1개 선정'],
 ['활동','투자 스터디 운영','진행 중','다음 모임의 주제와 운영 결과 기록'],
 ['자격','소방설비기사(전기)','준비 중','필기 학습 범위와 이번 주 공부 시간 정하기'],
 ['자격','위험물기능장','재검토','재도전 시점과 병행 가능 시간 검토'],
 ['자격','소방시설관리사','장기 목표','응시요건과 경력 증빙을 공식 안내로 확인'],
 ['자격','소방기술사','장기 목표','실무 사례를 기술 답안 주제로 축적']
 ].map(([axis,title,status,next])=>({axis,title,status,next,due:'',evidence:''})),bonus:{year:'2027',cash:'',stock:'',locked:'',note:''}});
let career=careerDefault();
function validCareer(x){return x&&x.version===1&&typeof x.goal==='string'&&x.goal.length<=1000&&Array.isArray(x.items)&&x.items.length<=100&&x.items.every(t=>['axis','title','status','next','due','evidence'].every(k=>typeof t[k]==='string'&&t[k].length<=10000))&&x.bonus&&['year','note'].every(k=>typeof x.bonus[k]==='string')&&['cash','stock','locked'].every(k=>x.bonus[k]===''||(typeof x.bonus[k]==='number'&&Number.isFinite(x.bonus[k])&&x.bonus[k]>=0))}
try{const x=JSON.parse(localStorage.getItem(CAREER_KEY));if(validCareer(x))career=x}catch(e){}
function saveCareer(){try{localStorage.setItem(CAREER_KEY,JSON.stringify(career));$('saveState').textContent='커리어·성과급 시나리오 저장됨'}catch(e){$('saveState').textContent='저장 공간 부족 · 전체 백업을 저장하세요'}}
function careerView(){
 const old=document.createElement('details');old.className='card';old.innerHTML='<summary>기존 LIFE WIKI · 원문과 과거 기록</summary>';while($('content').firstChild)old.append($('content').firstChild);
 $('title').textContent='커리어 · 활동';
 $('content').innerHTML=`<section class="hero"><span class="eyebrow">EHS → EXPERTISE → BUSINESS</span><h2>경험을 쌓고, 자격을 갖추고, 내 일을 만든다.</h2><label>장기 목표<input id="careerGoal" maxlength="1000" value="${esc(career.goal)}"></label><p class="hint">2026.09.13 인계 문서 기준의 시작 상태입니다. 완료·합격 여부는 직접 갱신합니다.</p></section><section class="card"><div class="row"><h2>현재 활동과 자격 로드맵</h2><button id="addCareer">활동 추가</button></div><p class="hint">자격 순서는 개인 계획입니다. 자동으로 응시자격이나 사업 면허가 생기는 경로를 뜻하지 않습니다. <a href="https://www.q-net.or.kr/" target="_blank" rel="noopener">Q-Net 공식 안내</a>에서 종목별 조건을 확인하세요.</p><div class="grid">${career.items.map((t,i)=>`<article class="card"><span class="eyebrow">${esc(t.axis)}</span><label>활동·자격<input data-ci="${i}" data-ck="title" maxlength="10000" value="${esc(t.title)}"></label><label>상태<select data-ci="${i}" data-ck="status">${['준비 중','진행 중','재검토','장기 목표','완료','보류'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select></label><label>다음 행동<textarea data-ci="${i}" data-ck="next" maxlength="10000">${esc(t.next)}</textarea></label><label>목표일<input type="date" data-ci="${i}" data-ck="due" value="${esc(t.due)}"></label><label>실행 결과·학습 기록<textarea data-ci="${i}" data-ck="evidence" maxlength="10000" placeholder="이번 주에 실제로 한 일">${esc(t.evidence)}</textarea></label><button data-delete-career="${i}">항목 삭제</button></article>`).join('')}</div></section>`;
 $('content').append(old);
 $('careerGoal').oninput=e=>{career.goal=e.target.value;saveCareer()};
 document.querySelectorAll('[data-ci]').forEach(el=>el.oninput=()=>{career.items[+el.dataset.ci][el.dataset.ck]=el.value;saveCareer()});
 $('addCareer').onclick=()=>{if(career.items.length>=100)return;career.items.push({axis:'활동',title:'새 활동',status:'준비 중',next:'',due:'',evidence:''});saveCareer();render()};
 document.querySelectorAll('[data-delete-career]').forEach(el=>el.onclick=()=>{if(!confirm('이 활동과 기록을 삭제할까요?'))return;career.items.splice(+el.dataset.deleteCareer,1);saveCareer();render()});
}
function bonusView(){
 const b=career.bonus;const panel=document.createElement('details');panel.className='card';panel.innerHTML=`<summary>DS 성과급 · 시뮬레이터와 내 예상 기록</summary><h2 class="gap">DS 성과급 시나리오</h2><a class="button primary" href="https://salarycrew.com/samsung" target="_blank" rel="noopener noreferrer">삼성전자 성과급 시뮬레이터 열기 ↗</a><p class="hint">사용자가 제공한 samsung-bonus.vercel.app의 현재 연결 주소입니다. 비공식 계산기이며 결과는 자동으로 가져오지 않습니다. 계산기의 가정과 결과를 아래에 기록하세요.</p><div class="fields"><label>대상 연도<input id="bonusYear" maxlength="4" value="${esc(b.year)}"></label>${[['cash','예상 현금 실수령 (원)'],['stock','올해 매도 가능한 주식 예상액 (원)'],['locked','향후에 풀리는 주식 예상액 (원)']].map(([k,l])=>`<label>${l}<input type="number" min="0" step="1" data-bonus="${k}" value="${b[k]}"></label>`).join('')}<label class="wide">계산 기준·사업부·연봉·세금 가정<textarea id="bonusNote" maxlength="10000">${esc(b.note)}</textarea></label></div><p id="bonusTotal"></p><p class="hint">예상액은 가계부 수입이나 현재 자산에 더하지 않습니다. 실제 지급·매도 후 기록하세요.</p>`;
 $('content').append(panel);
 const total=()=>{$('bonusTotal').textContent=b.cash===''||b.stock===''?'현금과 올해 매도 가능 주식 예상액을 모두 입력하세요.':'올해 현금화 가능 예상 합계 '+money(b.cash+b.stock)+' · 향후 주식 제외'};total();
 panel.querySelectorAll('[data-bonus]').forEach(el=>el.oninput=()=>{if(!el.validity.valid)return;b[el.dataset.bonus]=el.value===''?'':Number(el.value);saveCareer();total()});$('bonusYear').oninput=e=>{b.year=e.target.value;saveCareer()};$('bonusNote').oninput=e=>{b.note=e.target.value;saveCareer()};
}
