'use strict';
const LEDGER_KEY='life-os-private-ledger-v1';
function validateLedger(input){
 if(!input||!Array.isArray(input.rows)||input.rows.length>50000||input.rows.length===0)throw Error('거래 목록이 없습니다.');
 const allowed=['차량 취득','주택 거래비용','세금·세목 확인','가구·가전','대출 상환','대출 이자','고정생활비','생활기본','자유소비','계획소비','확인 필요','수입','이체'];
 const ids=new Set();const rows=input.rows.map(r=>{
  if(!r||!Number.isInteger(r.id)||ids.has(r.id)||typeof r.amount!=='number'||!Number.isFinite(r.amount)||Math.abs(r.amount)>1e12||!['수입','지출','이체'].includes(r.type)||!allowed.includes(r.group)||!/^2026-\d{2}-\d{2}$/.test(r.date)||r.date<'2026-01-01'||r.date>'2026-09-13')throw Error('현재 화면은 재분류된 2026년 1월~9월 13일 기록을 지원합니다. 파일 형식을 확인하세요.');
  if(r.type==='지출'&&['수입','이체'].includes(r.group))throw Error('지출 분류가 올바르지 않습니다.');
  if(r.type!=='지출'&&r.group!==r.type)throw Error('거래 종류가 일치하지 않습니다.');
  ids.add(r.id);const out={id:r.id,date:r.date,type:r.type,amount:r.amount,group:r.group,credit:r.type==='지출'&&r.amount>0};
  for(const k of ['category','sub','name','account','memo','detail','reason']){if(typeof r[k]!=='string'||r[k].length>30000)throw Error('거래 내용 형식을 확인하세요.');out[k]=r[k]}
  return out;
 });
 const audit={income:0,gross:0,credits:0,net:0,groups:Object.fromEntries(allowed.filter(g=>!['수입','이체'].includes(g)).map(g=>[g,0]))};
 for(const r of rows){if(r.type==='수입')audit.income+=r.amount;if(r.type==='지출'){audit.net-=r.amount;audit.groups[r.group]-=r.amount;if(r.amount<0)audit.gross-=r.amount;else audit.credits+=r.amount}}
 return {source:typeof input.source==='string'?input.source:'개인 가계부',asOf:'2026-09-13',rows,audit};
}
function parseLedger(text){
 // Legacy data file compatibility without executing the selected JavaScript.
 let body=text.trim().replace(/^\uFEFF/,'');
 if(body.startsWith('window.LEDGER_DATA='))body=body.slice('window.LEDGER_DATA='.length).replace(/;\s*$/,'');
 return validateLedger(JSON.parse(body));
}
let ledgerLoadError='';
try{if(window.LEDGER_DATA)window.LEDGER_DATA=validateLedger(window.LEDGER_DATA)}catch(e){window.LEDGER_DATA=null;ledgerLoadError='기본 가계부 검증 실패'}
try{const saved=localStorage.getItem(LEDGER_KEY);if(saved)window.LEDGER_DATA=parseLedger(saved)}catch(e){ledgerLoadError='저장된 가계부를 읽지 못했습니다. 개인 데이터 파일을 다시 불러와 주세요.'}
