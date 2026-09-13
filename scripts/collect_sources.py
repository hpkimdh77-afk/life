"""Fetch an allowlisted set of public sources; never read personal portfolio data."""
import datetime as dt
import json
import pathlib
import re
import urllib.request
import urllib.error
import urllib.robotparser
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

UA = 'LifeDashboardPublicReader/1.0'
ETF = [
 ('TIME 미국S&P500액티브', '426020', 'https://timeetf.co.kr/m11_view.php?idx=5'),
 ('TIME 미국나스닥100액티브', '426030', 'https://timeetf.co.kr/m11_view.php?idx=2&cate='),
 ('KoAct 미국나스닥성장기업액티브', '', 'https://www.samsungactive.co.kr/etf/view.do?id=2ETFQ1'),
]
BLOGS = ['teasky0221', 'show0159', 'survivaldopb', 'imbk6390']
HOSTS = {'timeetf.co.kr', 'www.timeetf.co.kr', 'www.samsungactive.co.kr', 'samsungactive.co.kr', 'rss.blog.naver.com', 'blog.naver.com', 'm.blog.naver.com'}
ROBOTS = {}

class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self, req, fp, code, msg, headers, url):
  if urllib.parse.urlparse(url).scheme != 'https' or urllib.parse.urlparse(url).hostname not in HOSTS:
   raise ValueError('허용하지 않은 주소로 리디렉션됨')
  return super().redirect_request(req, fp, code, msg, headers, url)

def request(url):
 if urllib.parse.urlparse(url).hostname not in HOSTS: raise ValueError('허용되지 않은 출처')
 req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/rss+xml,application/xml'})
 with urllib.request.build_opener(SafeRedirect()).open(req, timeout=20) as res:
  b=res.read(4000001)
  if len(b)>4000000: raise ValueError('응답 크기 제한 초과')
  charset=res.headers.get_content_charset() or 'utf-8'
  return b.decode(charset, errors='replace')

def fetch(url):
 p=urllib.parse.urlparse(url);origin=f'{p.scheme}://{p.netloc}'
 if origin not in ROBOTS:
  robot=urllib.robotparser.RobotFileParser()
  try: robot.parse(request(origin+'/robots.txt').splitlines())
  except urllib.error.HTTPError as e:
   if e.code==404: robot.parse([])
   else: raise ValueError('robots 접근 정책 확인 실패') from e
  ROBOTS[origin]=robot
 if not ROBOTS[origin].can_fetch(UA,url): raise ValueError('robots 정책에서 수집을 허용하지 않음')
 return request(url)

class Tables(HTMLParser):
 def __init__(self):
  super().__init__();self.tables=[];self.table=None;self.row=None;self.cell=None;self.text=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'): self.skip+=1
  if tag=='table': self.table=[]
  if tag=='tr': self.row=[]
  if tag in ('td','th'): self.cell=[]
 def handle_data(self,data):
  if self.skip:return
  self.text.append(data)
  if self.cell is not None:self.cell.append(data)
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.skip=max(0,self.skip-1)
  if tag in ('td','th') and self.cell is not None:
   if self.row is not None:self.row.append(' '.join(''.join(self.cell).split()))
   self.cell=None
  if tag=='tr' and self.row is not None:
   if self.table is not None:self.table.append(self.row)
   self.row=None
  if tag=='table' and self.table is not None:self.tables.append(self.table);self.table=None

def number(value):
 cleaned=value.replace(',','').strip().rstrip('%').strip()
 if not re.fullmatch(r'-?\d+(?:\.\d+)?',cleaned):raise ValueError('숫자 형식 불일치')
 return float(cleaned)

def parse_etf(html, code, today=None):
 p=Tables();p.feed(html);text=' '.join(p.text);today=today or dt.date.today()
 if code and code not in text:raise ValueError('상품 코드 확인 실패')
 prices=[];holdings=[]
 for table in p.tables:
  headers=' '.join(' '.join(r) for r in table[:3])
  if '기준가격' in headers and ('종가' in headers or '시장가격' in headers):
   for r in table:
    if len(r)<4 or not re.fullmatch(r'\d{4}[.-]\d{2}[.-]\d{2}',r[0]):continue
    date=dt.date.fromisoformat(r[0].replace('.','-'))
    if date>today:continue
    nav=number(r[1]);market=number(r[3])
    if nav<=0 or market<=0:continue
    prices.append({'date':date.isoformat(),'nav':nav,'close':market})
  if '종목명' in headers and '비중' in headers and '평가금액' in headers:
   for r in table:
    if len(r)!=5 or '종목명' in r[1]:continue
    try:weight=number(r[4])
    except ValueError:continue
    if not 0<=weight<=100:continue
    holdings.append({'name':r[1],'weight':weight})
 prices.sort(key=lambda x:x['date'],reverse=True)
 if not prices:raise ValueError('기준일·가격 표 미확인: 동적 화면 또는 구조 변경')
 return {'price':prices[0],'history':prices[:20],'holdings':holdings[:10],'holdingsDate':None,
         'holdingsNote':'페이지에 표시된 구성종목. 보유내역 기준일은 별도 확인 필요.'}

def parse_rss(text, blog):
 root=ET.fromstring(text);items=[]
 for item in root.findall('.//item')[:8]:
  title=(item.findtext('title') or '').strip();url=(item.findtext('link') or '').strip()
  u=urllib.parse.urlparse(url)
  if not title or u.scheme not in ('http','https') or u.hostname not in ('blog.naver.com','m.blog.naver.com'):continue
  if blog not in u.path and blog not in u.query:continue
  items.append({'title':title[:250],'url':url,'date':item.findtext('pubDate') or None})
 if not items:raise ValueError('공개 RSS에서 글 목록을 확인하지 못함')
 return items

def collect():
 now=dt.datetime.now(dt.timezone.utc).isoformat();out={'attemptedAt':now,'funds':[],'blogs':[]}
 for name,code,url in ETF:
  result={'name':name,'code':code,'url':url,'status':'unavailable','attemptedAt':now}
  try:result.update(parse_etf(fetch(url),code));result['status']='ok';result['collectedAt']=now
  except Exception as e:result['message']=str(e)[:180]
  out['funds'].append(result)
 for blog in BLOGS:
  result={'name':blog,'url':'https://blog.naver.com/'+blog,'status':'unavailable','attemptedAt':now}
  try:result['items']=parse_rss(fetch('https://rss.blog.naver.com/'+blog+'.xml'),blog);result['status']='ok';result['collectedAt']=now
  except Exception as e:result['message']=str(e)[:180]
  out['blogs'].append(result)
 return out

if __name__=='__main__':
 data=collect();target=pathlib.Path('assets/public-sources.js');target.parent.mkdir(exist_ok=True)
 target.write_text('window.PUBLIC_SOURCES='+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';',encoding='utf-8')
 print(json.dumps({'successful':sum(r['status']=='ok' for r in data['funds']+data['blogs']),'total':7}))
