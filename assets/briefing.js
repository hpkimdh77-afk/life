'use strict';
function briefingView(){
 document.getElementById('briefingPanel')?.remove();
 const feeds=window.PUBLIC_SOURCES?.telegram||[],all=feeds.flatMap(f=>(f.items||[]).map(i=>({...i,channel:f.name}))),grouped=new Map();
 for(const item of all){const key=item.fingerprint||item.url;if(!grouped.has(key))grouped.set(key,{...item,channels:[]});grouped.get(key).channels.push(item.channel)}
 const recent=[...grouped.values()].sort((a,b)=>((b.tags||[]).length-(a.tags||[]).length)||(Date.parse(b.date||0)-Date.parse(a.date||0)));
 const panel=document.createElement('section');panel.className='hero';panel.id='briefingPanel';
 const safe=u=>/^https:\/\/t\.me\/(daegurr|gaoshoukorea|insidertracking|YeouidoStory2)\/\d+$/i.test(u)?u:'#';
 panel.innerHTML=`<span class="eyebrow">PORTFOLIO RADAR · 20 MIN</span><h2>지금 확인할 투자 채널 이슈</h2><p>${feeds.filter(f=>f.status==='ok').length}/4개 채널 수집 · 최근 ${all.length}개 게시물 · 동일 본문 ${all.length-grouped.size}개 묶음</p><p class="hint">키워드 관련성이 높은 글부터 표시합니다. AI 분석·사실 검증 결과가 아닙니다. 공개 미리보기의 최근 글만 대상으로 하며 오래된 글도 포함될 수 있습니다.</p>${recent.filter(i=>i.tags?.length).slice(0,5).map(i=>`<div class="card"><span class="eyebrow">${esc(i.tags.join(' · '))}</span><p><a href="${esc(safe(i.url))}" target="_blank" rel="noopener">${esc(i.title)}</a></p><small>${esc(i.channels.join(' / '))} · ${esc(i.date?new Date(i.date).toLocaleString('ko-KR'):'게시일 미제공')}</small><p class="hint">확인할 것: 원문에 연결된 공시·보도자료와 발표일. 채널 의견만으로 확정하지 않기.</p></div>`).join('')||'<p>최근 수집 글에서 관심 종목 키워드가 확인되지 않았습니다.</p>'}`;
 $('content').prepend(panel);
}
