'use strict';
async function unzipWorkbook(buffer){
 const bytes=new Uint8Array(buffer),v=new DataView(buffer),decoder=new TextDecoder();let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('일반 .xlsx 파일을 선택하세요. 암호가 설정된 파일은 지원하지 않습니다.');
 const count=v.getUint16(end+10,true);let p=v.getUint32(end+16,true),total=0;const files={};
 if(count>3000)throw Error('워크북이 너무 큽니다.');
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('손상된 Excel 파일입니다.');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),raw=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),ex=v.getUint16(p+30,true),co=v.getUint16(p+32,true),off=v.getUint32(p+42,true),name=decoder.decode(bytes.slice(p+46,p+46+nl));p+=46+nl+ex+co;
  if(!/^xl\/(workbook.xml|sharedStrings.xml|worksheets\/sheet\d+.xml)$/.test(name))continue;
  if(flags&1)throw Error('암호화된 Excel 파일은 읽을 수 없습니다.');
  total+=raw;if(raw>30000000||total>60000000)throw Error('가계부 시트가 너무 큽니다.');
  if(off+30>bytes.length||v.getUint32(off,true)!==0x04034b50)throw Error('Excel 압축 구조가 올바르지 않습니다.');
  const start=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true);if(start+size>bytes.length)throw Error('파일이 잘렸습니다.');
  const packed=bytes.slice(start,start+size);let out;
  if(method===0)out=packed;else if(method===8){
   if(typeof DecompressionStream==='undefined')throw Error('최신 Edge 또는 Chrome에서 열어 주세요.');
   const reader=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();const parts=[];let n=0;
   while(true){const chunk=await reader.read();if(chunk.done)break;n+=chunk.value.length;if(n>raw||n>30000000){await reader.cancel();throw Error('압축 해제 크기가 올바르지 않습니다.')}parts.push(chunk.value)}
   out=new Uint8Array(n);let at=0;for(const part of parts){out.set(part,at);at+=part.length}
  }else throw Error('지원하지 않는 Excel 압축 형식입니다.');
  if(out.length!==raw)throw Error('손상된 Excel 데이터입니다.');files[name]=decoder.decode(out);
 }
 return files;
}
function classifyExcelRow(r){
 const c=r.category,s=r.sub,n=r.name,m=r.memo;
 let g='확인 필요',detail=c+' / '+s,reason='원본만으로 거래 목적을 확정할 수 없음';
 const set=(a,b,why)=>{g=a;detail=b;reason=why};
 if(r.type!=='지출')set(r.type,s,'원본 거래 종류 유지');
 else if(/엔카/.test(n))set('차량 취득','차량 대금·부대비용','차량 플랫폼 결제: 쇼핑 합계에서 분리');
 else if(/복비|중개보수/.test(m))set('주택 거래비용','중개보수','원본 메모');
 else if(/법무법인/.test(n))set('주택 거래비용','법무비용','거래명과 기존 주택 거래 맥락. 상세 명세는 확인 필요');
 else if(/지방세입금/.test(n))set('세금·세목 확인','지방세','세금 결제 확인. 세목 미확인');
 else if(/대출상환/.test(n))set('대출 상환','원금·이자 미분리','원금과 이자 비율은 명세서 필요');
 else if(/대출이자/.test(n))set('대출 이자','대출 이자','거래명에 이자 명시');
 else if(/시계|갤럭시워치|카메라/.test(m))set('자유소비','시계·전자기기','원본 메모');
 else if(/지갑/.test(m))set('자유소비','지갑·잡화','원본 메모');
 else if(/골프/.test(m))set('자유소비','골프','원본 메모');
 else if(/택시비/.test(m))set('생활기본','택시','원본 메모');
 else if(/여행/.test(m))set('계획소비','여행','원본 메모');
 else if(/결혼식|축의금|부의금/.test(m))set('계획소비','경조·선물','원본 메모');
 else if(/캐치테이블/.test(n))set('생활기본','외식·예약','식당 예약 서비스. 실제 결제 성격은 필요 시 확인');
 else if(/관리비/.test(m)||/박육범/.test(n))set('고정생활비','관리비','사용자 지정 관리비 또는 원본 메모');
 else if(/웰빙클럽/.test(n))set('고정생활비','웰빙클럽','정기 결제');
 else if(c==='생활'&&s==='가구/가전')set('가구·가전',s,'내구재 구입 분리');
 else if(c==='금융'&&s==='보험'&&!/복지/.test(n))set('고정생활비','보험','원본 보험 분류');
 else if(c==='주거/통신'&&['가스비','전기료','휴대폰','인터넷'].includes(s))set('고정생활비',s,'원본 주거·통신 분류');
 else if(['식비','교통','생활','자동차','반려동물'].includes(c))set('생활기본',c+' / '+s,'원본 분류 기반 잠정 분류');
 else if(c==='의료/건강')set(s==='피부과'?'자유소비':'생활기본',s,'원본 의료 세부분류');
 else if(['온라인쇼핑','패션/쇼핑','술/유흥','카페/간식','뷰티/미용','문화/여가','교육/학습'].includes(c))set('자유소비',s,'원본 분류 기반 잠정 분류. 명시된 자산 거래는 우선 분리');
 else if(['여행/숙박','경조/선물'].includes(c))set('계획소비',s,'원본 여행·경조 분류');
 if(r.type==='지출'&&r.amount>0)reason+=' · 양수 지출은 원장 부호대로 차감';
 return {...r,group:g,detail,reason};
}
async function importExcel(file){
 const files=await unzipWorkbook(await file.arrayBuffer());
 const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('Excel XML 오류');return d};
 const texts=e=>Array.from(e.getElementsByTagName('t')).map(t=>t.textContent).join('');
 const shared=files['xl/sharedStrings.xml']?Array.from(xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')).map(texts):[];
 const epoch=/date1904="(?:1|true)"/.test(files['xl/workbook.xml']||'')?Date.UTC(1904,0,1):Date.UTC(1899,11,30);
 let assetSnapshot=null;
 for(const [name,source] of Object.entries(files)){
  if(!name.startsWith('xl/worksheets/'))continue;
  const sheet=xml(source),grid={};for(const row of sheet.getElementsByTagName('row')){const vals=[];for(const c of row.getElementsByTagName('c')){let col=0;for(const ch of (c.getAttribute('r')||'').replace(/\d/g,''))col=col*26+ch.charCodeAt(0)-64;const raw=c.getElementsByTagName('v')[0]?.textContent??'';vals[col-1]=c.getAttribute('t')==='s'?shared[Number(raw)]:c.getAttribute('t')==='inlineStr'?texts(c):raw}grid[Number(row.getAttribute('r'))]=vals}
  if(grid[44]?.[1]==='항목'&&grid[44]?.[2]==='상품명'){
   const items=[];let group='';for(let i=45;i<107;i++){const a=grid[i]||[];if(a[1])group=a[1];if(a[2]&&a[4]!==undefined&&a[4]!=='')items.push({name:a[2],kind:'자산',group,value:Number(a[4]),include:true,note:'원본 재무현황 '+i+'행. 계좌·보유종목 중복 여부 검토 필요'});if(a[6]&&a[8]!==undefined&&a[8]!=='')items.push({name:a[6],kind:'부채',group:a[5]||'대출',value:Number(a[8]),include:true,note:'원본 재무현황 '+i+'행'})}
   for(const a of items)if(a.kind==='자산'&&a.value<0&&items.some(b=>b.kind==='부채'&&b.value===-a.value)){a.include=false;a.note+=' · 동일 금액 대출과 중복 가능: 기본 합계 제외, 직접 확인'}
   assetSnapshot={date:'',items,source:file.name};
  }
 }
 for(const [name,source] of Object.entries(files)){
  if(!name.startsWith('xl/worksheets/'))continue;
  const sheet=xml(source),records=[];let header=null;
  for(const row of sheet.getElementsByTagName('row')){
   const vals=[];for(const c of row.getElementsByTagName('c')){const letters=(c.getAttribute('r')||'').replace(/\d/g,'');let col=0;for(const ch of letters)col=col*26+ch.charCodeAt(0)-64;const raw=c.getElementsByTagName('v')[0]?.textContent??'';vals[col-1]=c.getAttribute('t')==='s'?shared[Number(raw)]:c.getAttribute('t')==='inlineStr'?texts(c):raw}
   if(!header){if(vals.includes('날짜')&&vals.includes('금액')&&vals.includes('타입'))header=vals;continue}
   const get=k=>vals[header.indexOf(k)]??'';let date=String(get('날짜'));
   if(/^\d+(\.\d+)?$/.test(date))date=new Date(epoch+Number(date)*86400000).toISOString().slice(0,10);else date=date.slice(0,10);
   if(!date.startsWith('2026-'))continue;
   if(date>'2026-09-13')throw Error('현재 분석은 2026년 9월 13일까지 지원합니다. 이후 거래가 있는 파일은 아직 지원하지 않습니다.');
   const amount=Number(String(get('금액')).replace(/,/g,''));if(get('금액')===''||!Number.isFinite(amount))throw Error('금액이 올바르지 않은 행이 있습니다.');
   records.push(classifyExcelRow({id:Number(row.getAttribute('r')),date,type:String(get('타입')),category:String(get('대분류')),sub:String(get('소분류')),name:String(get('내용')),amount,account:String(get('결제수단')),memo:String(get('메모'))}));
  }
  if(header){if(!records.length)throw Error('2026년 거래가 없습니다.');const result=validateLedger({source:file.name,rows:records});if(assetSnapshot)result.assetSnapshot=assetSnapshot;return result}
 }
 throw Error('날짜·타입·금액 열이 있는 가계부 시트를 찾지 못했습니다. 제공하신 가계부 형식의 .xlsx를 선택하세요.');
}
