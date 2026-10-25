// Shared layout: sidebar nav + helpers
(function(){
  const here=location.pathname.split('/').pop()||'index.html';
  const links=[['index.html','📦 卡盒系列總覽'],['rarity.html','✨ 稀有度教學'],['grading.html','🏷️ 鑑定機構介紹'],['exam.html','📝 考試']];
  const side=document.createElement('aside');side.className='side';
  side.innerHTML=`<div class="logo">寶可夢卡牌學習站</div><div class="sub">直播組內部教材 · 繁體中文</div><nav>${links.map(([h,t])=>`<a href="${h}" class="${here===h||(here==='set.html'&&h==='index.html')?'on':''}">${t}</a>`).join('')}</nav>
  <div class="foot">資料來源：TCGdex、Bulbapedia、SNKRDUNK、TCGplayer（經 TCGdex）。<br>價格僅供參考，非即時報價。<br>${window.STATS?'資料建置：'+new Date(STATS.generated).toLocaleDateString('zh-TW'):''}</div>`;
  const top=document.createElement('div');top.className='topbar';top.innerHTML='<button aria-label="選單">☰</button><b>寶可夢卡牌學習站</b>';
  top.querySelector('button').onclick=()=>side.classList.toggle('open');
  document.addEventListener('DOMContentLoaded',()=>{const m=document.querySelector('main');document.querySelector('.layout').prepend(side);m.prepend(top);});
})();
const LANG_ZH={en:'美版',ja:'日版','zh-tw':'繁中','zh-cn':'簡中'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imgTag(src,alt,cls=''){return src?`<img loading="lazy" class="${cls}" src="${esc(src)}" alt="${esc(alt)}" onerror="this.outerHTML='<div class=ph>（圖片無法載入）</div>'">`:`<div class="ph">（暫無圖片）</div>`;}
function fmtUSD(v){return 'US$'+(v>=100?Math.round(v):v.toFixed(2));}
function priceLine(label,x){
  if(!x||x.price==null) return `<div class="price none">${label}：待確認</div>`;
  const cur=x.currency==='USD'?fmtUSD(x.price):x.currency+' '+x.price;
  return `<div class="price ${x.stale?'stale':''}">${label}：約 ${cur}（<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.source)}</a>，${esc(x.fetched||'')}${x.stale?'，舊資料':''}）</div>`;
}
// two prices per chase card: raw (ungraded) and PSA 10
function priceText(p){return priceLine('未鑑定（裸卡）',p&&p.price!=null?p:null)+priceLine('PSA 10',p&&p.psa10);}
