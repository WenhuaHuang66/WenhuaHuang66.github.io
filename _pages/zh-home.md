---
permalink: /zh/
title: "首页"
author_profile: true
locale: zh-CN
---

感悟并欣赏化学！

---

<div class="compound-search" style="margin-top: 2em; padding: 1em; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa;">
  <h3 style="margin-top: 0; font-size: 1.1em;">化合物结构搜索</h3>
  <p style="font-size: 0.9em; color: #666; margin-bottom: 0.8em;">输入化合物中文名或英文名，搜索其化学结构式</p>
  <div style="display: flex; gap: 0.5em; margin-bottom: 1em;">
    <input type="text" id="compound-input-zh" placeholder="请输入化合物名（例如苯或benzene)" style="flex: 1; padding: 0.5em; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em;" onkeydown="if(event.key==='Enter')searchCompound('zh')">
    <button onclick="searchCompound('zh')" style="padding: 0.5em 1.2em; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">搜索</button>
  </div>
  <div id="compound-result-zh" style="min-height: 1em; font-size: 0.9em; color: #666;">
    <!-- 搜索结果将显示在这里 -->
  </div>
</div>

<script>
// Chinese-English dictionary of common compounds (verified professional names)
const ZH_EN_DICT = {"苯":"Benzene","甲苯":"Toluene","二甲苯":"Xylene","苯乙烯":"Styrene","萘":"Naphthalene","蒽":"Anthracene","菲":"Phenanthrene","联苯":"Biphenyl","苯酚":"Phenol","苯胺":"Aniline","苯甲醛":"Benzaldehyde","苯甲酸":"Benzoic acid","苯甲醚":"Anisole","硝基苯":"Nitrobenzene","甲醇":"Methanol","乙醇":"Ethanol","丙醇":"Propanol","异丙醇":"Isopropanol","丁醇":"Butanol","乙二醇":"Ethylene glycol","甘油":"Glycerol","甲醛":"Formaldehyde","乙醛":"Acetaldehyde","丙酮":"Acetone","环己酮":"Cyclohexanone","甲酸":"Formic acid","乙酸":"Acetic acid","草酸":"Oxalic acid","柠檬酸":"Citric acid","乳酸":"Lactic acid","水杨酸":"Salicylic acid","阿司匹林":"Aspirin","乙醚":"Diethyl ether","四氢呋喃":"Tetrahydrofuran","乙腈":"Acetonitrile","二氯甲烷":"Dichloromethane","氯仿":"Chloroform","四氯化碳":"Carbon tetrachloride","环己烷":"Cyclohexane","己烷":"Hexane","葡萄糖":"Glucose","果糖":"Fructose","蔗糖":"Sucrose","麦芽糖":"Maltose","乳糖":"Lactose","淀粉":"Starch","纤维素":"Cellulose","尿素":"Urea","甘氨酸":"Glycine","丙氨酸":"Alanine","缬氨酸":"Valine","亮氨酸":"Leucine","异亮氨酸":"Isoleucine","苯丙氨酸":"Phenylalanine","酪氨酸":"Tyrosine","色氨酸":"Tryptophan","丝氨酸":"Serine","苏氨酸":"Threonine","半胱氨酸":"Cysteine","甲硫氨酸":"Methionine","蛋氨酸":"Methionine","赖氨酸":"Lysine","精氨酸":"Arginine","组氨酸":"Histidine","天冬氨酸":"Aspartic acid","谷氨酸":"Glutamic acid","咖啡因":"Caffeine","尼古丁":"Nicotine","胆固醇":"Cholesterol","乙酸乙酯":"Ethyl acetate","乙酸酐":"Acetic anhydride","二甲基亚砜":"Dimethyl sulfoxide","二甲基甲酰胺":"Dimethylformamide"};

function hasChinese(s) { return /[\u4e00-\u9fa5]/.test(s); }

// Clean raw TM translation: strip XML tags and trailing notes (e.g. "Acetic Acid = Vinegar")
function cleanTranslation(t) {
  if (!t) return "";
  t = String(t).replace(/<[^>]*>/g, "");
  t = t.split(/[，,;；=]/)[0].trim();
  return t;
}

// Chinese -> English: dictionary first, then MyMemory translation API (CORS enabled)
async function translateZhToEn(text) {
  if (ZH_EN_DICT[text]) return ZH_EN_DICT[text];
  try {
    const r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=zh%7Cen");
    const j = await r.json();
    if (j && j.responseData && j.responseData.translatedText) {
      return cleanTranslation(j.responseData.translatedText);
    }
  } catch (e) {}
  return "";
}

function showCompoundResult(result, query, enName, imageUrl, smiles) {
  const label = (query !== enName) ? (query + " (" + enName + ")") : query;
  let html = '<div style="margin-top:0.5em;"><p><strong>' + label + '</strong></p>'
    + '<img src="' + imageUrl + '" alt="Structure of ' + enName + '" style="max-width:200px;max-height:200px;border:1px solid #ddd;padding:4px;background:white;" onerror="this.parentElement.innerHTML=\'<p>没搜到此化合物结构式。</p>\'">';
  if (smiles) html += '<p style="font-size:0.85em;color:#888;margin-top:0.3em;">SMILES: ' + smiles + '</p>';
  html += '</div>';
  result.innerHTML = html;
}

async function searchCompound(lang) {
  const input = document.getElementById('compound-input-' + lang);
  const result = document.getElementById('compound-result-' + lang);
  const query = input.value.trim();
  const notFoundMsg = '没搜到此化合物结构式。';

  if (!query) {
    result.innerHTML = lang === 'en' ? '请输入化合物名。' : '请输入化合物名。';
    return;
  }

  result.innerHTML = '正在查询...';

  // Step 1: resolve Chinese name to English (dictionary -> MyMemory)
  let enName = query;
  if (hasChinese(query)) {
    enName = await translateZhToEn(query);
    if (!enName) { result.innerHTML = notFoundMsg; return; }
  }

  // Step 2: OPSIN resolves English name to structure identifiers
  try {
    const opsinUrl = 'https://www.ebi.ac.uk/opsin/api/name/' + encodeURIComponent(enName) + '.json';
    const resp = await fetch(opsinUrl, { headers: { 'Accept': 'application/json' } });
    if (resp.ok) {
      const data = await resp.json();
      if (data && (data.smiles || data.inchi)) {
        let imageUrl = '';
        if (data.inchi) {
          imageUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchi/' + encodeURIComponent(data.inchi) + '/PNG';
        } else if (data.smiles) {
          imageUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/' + encodeURIComponent(data.smiles) + '/PNG';
        }
        showCompoundResult(result, query, enName, imageUrl, data.smiles || '');
        return;
      }
    }
  } catch (e) { /* fall through to PubChem fallback */ }

  // Step 3: fallback - direct PubChem name lookup (image probe, no CORS issue)
  const pubchemUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + encodeURIComponent(enName) + '/PNG';
  const img = new Image();
  img.onload = function() { showCompoundResult(result, query, enName, pubchemUrl, ''); };
  img.onerror = function() { result.innerHTML = notFoundMsg; };
  img.src = pubchemUrl;
}
</script>

