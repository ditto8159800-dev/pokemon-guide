// Renders one grading company's catalog page: numbered, annotated label mock-up next to a real slab photo (content/grading-labels.json).
(function(){
const name=window.COMPANY,L=(window.GRADING_LABELS||{})[name],G=(window.GRADING||[]).find(g=>g.name===name)||{},P=(window.GRADING_PHOTOS||{})[name]||{};
const el=document.getElementById('gc');if(!L){el.innerHTML='<p>找不到資料</p>';return;}
const order=['PSA','BGS','CGC','SGC','TAG','ACE'];
const nav=`<div class="gnav"><a href="grading.html">← 鑑定機構目錄</a> ${order.map(n=>{const s=(window.GRADING_LABELS[n]||{}).slug;return n===name?`<b>${n}</b>`:`<a href="grading-${s}.html">${n}</a>`;}).join(' · ')}</div>`;
const b=(f)=>f.noBadge?'<i class="co ghost"></i>':`<i class="co">${f.n}</i>`;
const row=f=>`<div class="lr${f.big?' big':''}">${b(f)}<span>${esc(f.t)}</span>${f.badge?`<em class="gm">${esc(f.badge)}</em>`:''}</div>`;
const lab=L.label;
const label=`<div class="mlabel t-${L.theme}">${lab.top?`<div class="ltop">${esc(lab.top)}</div>`:''}<div class="lcols"><div class="lleft">${lab.left.map(row).join('')}${lab.barcode?'<div class="bar"></div>':''}</div><div class="lright">${lab.right.map(row).join('')}</div></div><div class="llogo">${esc(lab.logo||name)}</div></div>`;
const fields=`<div class="fgrid">${L.fields.map(f=>`<div class="fitem"><i class="co">${f.n}</i><div><b>${esc(f.title)}</b><div class="small">${esc(f.desc)}</div></div></div>`).join('')}</div>`;
const colors=L.colors?`<h3>🎨 標籤顏色代表什麼</h3><div class="lcolors">${L.colors.map(c=>`<div class="lc"><span class="sw sw-${c.c}"></span><b>${esc(c.name)}</b><div class="small">${esc(c.desc)}</div></div>`).join('')}</div>`:'';
const photo2=L.photo2?`<figure class="slab"><a href="${esc(L.photo2)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(L.photo2)}" alt="${name} 鑑定盒背面"></a><figcaption class="small">同一張的背面<br><span class="muted">圖片來源：<a href="${esc(L.photoUrl)}" target="_blank" rel="noopener">${esc(L.photoCredit)}</a></span></figcaption></figure>`:'';
const more=(P.photos||[]).filter(p=>p.src!==L.photo&&p.src!==L.photo2).map(p=>`<figure class="slab"><a href="${esc(p.src)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(p.src)}" alt="${esc(p.alt)}"></a><figcaption class="small">${esc(p.caption)}<br><span class="muted">圖片來源：<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.credit)}</a></span></figcaption></figure>`).join('');
const info=G.name?`<h3>📋 公司小檔案</h3><table class="kv"><tr><td>全名</td><td>${esc(G.full||'')}</td></tr><tr><td>國家／成立</td><td>${esc(G.country||'')} · ${esc(G.since||'')}</td></tr><tr><td>分數制度</td><td>${esc(G.scale||'')}</td></tr><tr><td>標籤／外殼</td><td>${esc(G.label||'')}</td></tr><tr><td>優點</td><td><ul class="pc">${(G.pros||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></td></tr><tr><td>缺點</td><td><ul class="pc">${(G.cons||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></td></tr></table>`:'';
el.innerHTML=`${nav}<div class="small muted">鑑定</div><h1>${esc(L.title)}</h1><p class="muted">${esc(L.intro)}</p>
<div class="lwrap"><div class="lmain">${label}${fields}</div>
<figure class="slab lphoto"><a href="${esc(L.photo)}" target="_blank" rel="noopener"><img src="${esc(L.photo)}" alt="${esc(L.photoCaption)}"></a><figcaption class="small">${esc(L.photoCaption)}<br><span class="muted">圖片來源：<a href="${esc(L.photoUrl)}" target="_blank" rel="noopener">${esc(L.photoCredit)}</a></span></figcaption></figure></div>
<p class="small muted">左邊標籤是依右邊照片重新排版的示意圖（文字照抄照片），方便標上編號說明。</p>
${colors}${L.extra&&L.extra.length?`<h3>💡 補充</h3><ul class="pc">${L.extra.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
${photo2||more?`<h3>📷 更多實物照片</h3><div class="slabs">${photo2}${more}</div>`:''}
${info}<h3>🔗 資料來源</h3><ul class="pc small">${L.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul>
<p class="small muted">標示「待確認」的內容表示尚未找到可靠來源核實，請以各公司官網為準。</p>`;
})();
