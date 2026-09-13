'use strict';
function buildEvidenceReport(feed,portfolio){
 if(!feed?.attemptedAt)throw Error('수집된 자료가 없습니다. 수집 작업이 완료된 뒤 다시 눌러주세요.');
 const sources=[...(feed.telegram||[]),...(feed.blogs||[]),...(feed.news||[])],groups=new Map();let count=0;
 for(const s of sources)for(const i of s.items||[]){count++;const key=i.fingerprint||i.url;if(!groups.has(key))groups.set(key,{...i,sources:[]});groups.get(key).sources.push(s.name)}
 const posts=[...groups.values()].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
 const lines=['# 통합 투자 자료 보고서','',`작성: ${new Date().toLocaleString('ko-KR')}`,`자료 수집: ${feed.attemptedAt}`,'','상태: 수집 자료 정리본 · AI 해석 미연결. 버튼은 서버에 게시된 최신 수집본을 읽으며 채널을 즉시 재수집하지 않습니다.','',`총 ${count}개 글 → 동일 본문을 묶은 ${posts.length}개. 출처 ${sources.filter(s=>s.status==='ok').length}/${sources.length}개 수집 성공. 중복·반복 언급은 사실 검증이나 호재 강도가 아닙니다.`,'','## 보유 종목과 관련 자료'];
 for(const h of portfolio.holdings){const words=[h.name,h.product].filter(Boolean);if(h.name.includes('삼성'))words.push('삼성전자','삼전');if(h.name.includes('하이닉스'))words.push('하이닉스');if(h.name.includes('나스닥'))words.push('나스닥','nasdaq');const matched=posts.filter(p=>words.some(w=>[p.title,...(p.tags||[])].join(' ').toLowerCase().includes(w.toLowerCase())));lines.push('',`### ${h.name}`,`연관 후보 ${matched.length}개 · 이름·키워드 일치 기준`);for(const i of matched.slice(0,5))lines.push(`- ${i.title} | ${i.date||'게시일 미제공'} | ${i.sources.join(', ')}\n  ${i.url}`);if(!matched.length)lines.push('수집된 짧은 발췌에서 연결 근거가 확인되지 않았습니다.');}
 lines.push('','## 업황 점검');for(const [topic,words]of [['반도체',['반도체','hbm','메모리']],['나스닥·성장주',['나스닥','nasdaq','성장']],['금리·거시',['금리','연준','물가']]]){const matched=posts.filter(p=>words.some(w=>(p.title+' '+(p.tags||[]).join(' ')).toLowerCase().includes(w)));lines.push('',`### ${topic}`,`${matched.length}개 관련 글. 방향성 판단은 아직 하지 않았습니다.`);for(const i of matched.slice(0,3))lines.push(`- ${i.title}\n  ${i.url}`)}
 lines.push('','## 미수집·확인할 자료');sources.filter(s=>s.status!=='ok').forEach(s=>lines.push(`- ${s.name}: ${s.message||'수집 대기'}`));lines.push('- 원문에 연결된 공시·기업 발표와 날짜를 대조해야 합니다.','- 매입·평가금액, ETF 내부 구성비, 채널 첨부파일을 이 보고서에서 검증하지 않았습니다.','- AI 업황 해석과 종목별 영향 분석은 서버 연결 후 제공할 기능입니다.');return lines.join('\n');
}
async function openInvestmentReport(){
 const button=document.getElementById('makeInvestmentReport');button.disabled=true;button.textContent='수집 자료 확인 중…';
 try{
  let feed=window.PUBLIC_SOURCES;let refreshFailed=false;
  try{const r=await fetch('assets/public-sources.js?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error();const raw=await r.text();const match=raw.match(/^window\.PUBLIC_SOURCES=(.*);\s*$/s);if(!match)throw Error();const next=JSON.parse(match[1]);if(!next.attemptedAt)throw Error();feed=next;window.PUBLIC_SOURCES=next}catch(e){refreshFailed=true}
  let report=buildEvidenceReport(feed,investments);if(refreshFailed)report='최신 수집본 확인 실패 · 현재 열려 있는 자료로 작성했습니다.\n\n'+report;
  document.getElementById('investmentReportDialog')?.remove();const dialog=document.createElement('dialog');dialog.id='investmentReportDialog';dialog.style.cssText='width:min(960px,95vw);max-height:90vh;background:#191b1b;color:#eee;border:1px solid #dfc18b;border-radius:12px;padding:24px';
  dialog.innerHTML='<div class="row"><h2>통합 투자 자료 보고서</h2><div><button id="saveInvestmentReport">보고서 저장</button> <button id="closeInvestmentReport">닫기</button></div></div><pre style="white-space:pre-wrap;font:inherit;line-height:1.8"></pre>';dialog.querySelector('pre').textContent=report;document.body.append(dialog);dialog.querySelector('#saveInvestmentReport').onclick=()=>download('투자_자료보고서_'+new Date().toISOString().slice(0,10)+'.md',report,'text/markdown;charset=utf-8');dialog.querySelector('#closeInvestmentReport').onclick=()=>dialog.close();dialog.showModal();
 }catch(e){alert(e.message)}finally{button.disabled=false;button.textContent='통합 자료 보고서 만들기'}
}
