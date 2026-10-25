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
function priceText(p){
  if(!p) return '<div class="price none">價格：暫無資料</div>';
  const cur=p.currency==='USD'?'US$':p.currency+' ';
  const v=p.price>=100?Math.round(p.price):p.price.toFixed(2);
  return `<div class="price ${p.stale?'stale':''}">約 ${cur}${v}（<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)}</a>，${esc(p.fetched)}${p.stale?'，舊資料':''}）</div>`;
}
