// script.js
(() => {
  // عناصر الواجهة
  const exprEl = document.getElementById('expr'); // هذا عنصر <input readonly>
  const resultEl = document.getElementById('result');
  const buttons = Array.from(document.querySelectorAll('.btn'));
  const degRadBtn = document.getElementById('degRadBtn');
  const memoryIndicator = document.getElementById('memoryIndicator');
  const shiftBtn = document.getElementById('shiftBtn');
  let expr = ''; // تعبير الداخل (سلسلة داخلية)
  let lastAnswer = 0;
  let memory = 0;
  let degMode = true; // true -> degrees, false -> radians
  let shiftMode = false;
  let ansInserted = false; // لمنع تكرار ANS عند الضغط المتكرر
  // خريطة لتحويل أرقام وعلامات للنص العلوي (superscript)
  const superscriptMap = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
    '+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'
  };
  function toSuper(text){
    return String(text).split('').map(c => superscriptMap[c] || c).join('');
  }
  // تحديث الواجهة — ملاحظة: النتيجة لا تظهر إلا بعد الضغط على '='
  function updateDisplay(){
    // exprEl هو input readonly؛ سنعرض نسخة من التعبير مع تحسينات بصرية فقط
    exprEl.value = formatForDisplay(expr);
    // لا نعرض أي نتيجة إلا بعد '=' (المستخدم طلب كده)
    // لذا نترك resultEl فارغ هنا؛ وسنملأه عند handle '='
    memoryIndicator.style.visibility = memory !== 0 ? 'visible' : 'hidden';
  }
  // فورمات العرض: نحول شعارات القوى إلى superscript للعرض فقط،
  // ونحول بعض الأشياء اللي تحب تشوفها أجمل (مثل 2π يظهر كـ 2π، ANS يظهر كنص)
  function formatForDisplay(s){
    if(!s) return '';
    // عرض الأس: نحول ^( ... ) أو ^number إلى superscript بصري
    // نعمل نسخة مؤقتة من السلسلة ونستبدل
    let out = '';
    for(let i=0;i<s.length;i++){
      const ch = s[i];
      if(ch === '^'){
        // حاول التقاط ما بعد ^: إذا قادم '(' التقط لموازنة الأقواس، وإلا التقط أرقام/علامات بسيطة
        let rest = '';
        if(s[i+1] === '('){
          // التقط المحتوى داخل القوسين
          let depth = 0;
          let j = i+1;
          for(; j<s.length; j++){
            rest += s[j];
            if(s[j] === '(') depth++;
            else if(s[j] === ')'){
              depth--;
              if(depth === 0){ j++; break; }
            }
          }
          i = j-1;
        } else {
          // التقط أرقام وعلامات صغيرة
          let j = i+1;
          while(j < s.length && /[0-9+\-()]/.test(s[j])){
            rest += s[j];
            j++;
          }
          i = j-1;
        }
        out += toSuper(rest.replace(/^\(|\)$/g,'')); // نحذف أي أقواس خارجية ونحول للسوبر
      } else {
        out += ch;
      }
    }
    // عرض ANS كنص
    out = out.replace(/ANS/g,'ANS');
    return out;
  }
  function push(s){
    // أي إدخال جديد يصحح حالة ansInserted لو دخلت أي شيء غير ANS
    // لو s == 'ANS' نتحقق من ansInserted
    if(s === 'ANS'){
      if(ansInserted) return; // منع التكرار
      ansInserted = true;
      expr += 'ANS';
    } else {
      // إذا المستخدم يدخل رقم أو عملية بعد ANS نسمح بإدخال ANS مرة تانية لاحقًا
      // نعتبر أن أي إدخال غير 'ANS' يعيد إمكانية إدخال ANS
      if(ansInserted && !s){} // no-op
      ansInserted = false;
      expr += s;
    }
    updateDisplay();
  }
function clearAll(){
  expr = '';                // امسح التعبير كله
  ansInserted = false;      // رجع الفلاج للوضع الطبيعي
  resultEl.textContent = ''; // امسح الناتج
  updateDisplay();          // حدث الشاشة
}
  function delChar(){
    // حذف آخر توكن بسيط (حذف حرف واحد كافٍ لأننا نتعامل كسلسلة)
    if(expr.endsWith('ANS')) {
      expr = expr.slice(0, -3);
      ansInserted = false;
    } else {
      expr = expr.slice(0, -1);
    }
    updateDisplay();
  }
function safeEval(e) {
  // استبدال ANS ورموز أساسية  
  let baseExpr = String(e).replace(/ANS/g, `(${Number(lastAnswer)})`);
  let s = baseExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/2π/g, `(${2*Math.PI})`)
    .replace(/π/g, `(${Math.PI})`)
    .replace(/--/g, '+');
	
	
	// تحويل ^ إلى **
s = s.replace(/(\))\s*\^\s*([0-9()+\-]+)/g, '$1**($2)');
s = s.replace(/([0-9.]+)\s*\^\s*([0-9.]+)/g, '($1)**($2)');
s = s.replace(/\^\s*\(/g, '**(');

// دوال رياضية
s = s.replace(/\bsqrt\s*\(/g, 'Math.sqrt(');
s = s.replace(/\babs\s*\(/g, 'Math.abs(');
s = s.replace(/\bfloor\s*\(/g, 'Math.floor(');
s = s.replace(/\bceil\s*\(/g, 'Math.ceil(');

// log (أساس 10)
s = s.replace(/\blog\s*\(\s*([^)]+)\)/g, 'Math.log10($1)'); // log(100) → Math.log10(100)
// ln (الطبيعي)
s = s.replace(/\bln\s*\(\s*([^)]+)\)/g, 'Math.log($1)');    // ln(5) → Math.log(5)
  // --- Helpers: فاكتوريال ودوال الزوايا مع دعم الأقواس المتداخلة ---
  function replaceFactorial(str) {
    let res = str;
    let idx = 0;
    while ((idx = res.indexOf('!', idx)) !== -1) {
      let end = idx - 1;
      if (end < 0) { idx++; continue; }

      if (res[end] === ')') {
        // ابحث للخلف عن '(' المطابق
        let depth = 0, start = end;
        for (; start >= 0; start--) {
          if (res[start] === ')') depth++;
          else if (res[start] === '(') {
            depth--;
            if (depth === 0) break;
          }
        }
        if (start < 0) { idx++; continue; }
        const operand = res.slice(start, end + 1); // يشمل الأقواس
        res = res.slice(0, start) + `__fac(${operand})` + res.slice(idx + 1);
        idx = start + (`__fac(${operand})`).length;
      } else {
        // رقم/جزء عشري
        let start = end;
        while (start >= 0 && /[0-9.]/.test(res[start])) start--;
        start++;
        const operand = res.slice(start, end + 1);
        res = res.slice(0, start) + `__fac(${operand})` + res.slice(idx + 1);
        idx = start + (`__fac(${operand})`).length;
      }
    }
    return res;
  }
function replaceTrig(str) {
  // نتعامل مع asin/acos/atan قبل sin/cos/tan
  const names = ['asin','acos','atan','sin','cos','tan'];
  let res = str;
  let offset = 0;
  while (true) {
    let bestIdx = -1;
    let bestName = null;
    // najd أقرب توجيه من الأسماء
    for (const name of names) {
      const idx = res.indexOf(name + '(', offset);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestName = name;
      }
    }
    if (bestIdx === -1) break;
    // لو الدالة جزء من اسم أطول نطنّشها
    if (bestIdx > 0) {
      const ch = res[bestIdx - 1];
      if (/[A-Za-z0-9_.]/.test(ch)) { offset = bestIdx + 1; continue; }
    }
    // نحدد محتوى الأقواس مع التداخل
    const startInner = bestIdx + bestName.length + 1;
    let depth = 1, j = startInner;
    for (; j < res.length; j++) {
      if (res[j] === '(') depth++;
      else if (res[j] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (j >= res.length) { offset = bestIdx + 1; continue; }
    const inner = res.slice(startInner, j);
    let replacement;
if (bestName === 'sin' || bestName === 'cos' || bestName === 'tan') {
  replacement = `Math.${bestName}(angleToRad(${inner}))`;
} else {
  // للدوال العكسية: الناتج نحوله لدرجات لو الـ degMode مفعّل
  if (typeof degMode !== 'undefined' && degMode) {
    replacement = `(Math.${bestName}(${inner}) * 180 / Math.PI)`;
  } else {
    replacement = `Math.${bestName}(${inner})`;
  }
}
    res = res.slice(0, bestIdx) + replacement + res.slice(j + 1);
    offset = bestIdx + replacement.length;
  }
  return res;
}
  // نطبق التحويلات
  s = replaceFactorial(s);
  s = replaceTrig(s);

  // حماية خفيفة (يمكن تعديل حسب الحاجة)
  // نسمح بالحروف والأرقام والعمليات والأقواس والفواصل وunderscore ونقطتين نجمتين (**)
  // ملاحظة: هذا ليس بديلًا عن بيئة تنفيذ آمنة ولكنه مفيد كفلتر بسيط
  if (/[^0-9+\-*/().,% _A-Za-z]/.test(s)) {
    // لا نرمي خطأ فورًا - لكن الاستدعاء قد يفشل لاحقًا لو كان هناك رمز غير متوقع
  }
// الآن التنفيذ داخل Function مع دالة __fac
try {
  const __fac = (n) => {
    n = Number(n);
    if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) return NaN;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  };
  if (!Math.log10) Math.log10 = (x) => Math.log(x) / Math.LN10;
  // angleToRad: تحويل الزوايا لو في وضع الدرجات
  function angleToRad(exprPart) {
    try {
      if (typeof exprPart === 'number') {
        return degMode ? (exprPart * Math.PI / 180) : exprPart;
      }
      let clean = String(exprPart)
        .replace(/%/g, '/100')
        .replace(/ANS/g, String(Number(lastAnswer)))
        .replace(/π/g, String(Math.PI));
      const v = new Function('return (' + clean + ')')();
      return degMode ? (v * Math.PI / 180) : v;
    } catch {
      return NaN; // أي خطأ = نرجع NaN
    }
  }
  // ننفذ التعبير s مع تمرير الدوال المساعدة
  const fn = new Function('__fac', 'Math', 'angleToRad', 'return (' + s + ')');
  const val = fn(__fac, Math, angleToRad);
  return val;
} catch (err) {
  return NaN;
}}
console.log(Math.log(10));     // 2.302585... (ده ln(10))
console.log(Math.log10(100));  // 2
// إدخال ذكي للقوسين: يقرر ) أو ( أو ×(
function insertParen() {
  const endsWithANS = expr.endsWith('ANS');
  const lastChar = expr.slice(-1);
  // حساب عدد الأقواس المفتوحة غير المغلقة
  let open = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') open++;
    else if (expr[i] === ')') open--;
  }
  // هل آخر توكن يشبه رقم/نقطة/π/قوس إغلاق أو ANS؟
  const lastIsNumberLike = endsWithANS || /[0-9\.π)]/.test(lastChar);

  if (lastIsNumberLike && open > 0) {
    // لو في أقواس مفتوحة ونهاية التعبير رقمية -> أغلق القوس
    push(')');
  } else if (lastIsNumberLike) {
    // لو نهاية رقمية ولكن مافي أقواس مفتوحة -> ضيف ضمنية ضرب ثم قوس فتّاح
    // نستخدم '×(' لأن الكود يحوّل × لاحقاً إلى * عند التقييم
    push('×(');
  } else {
    // في أي مكان تاني نفتح قوس جديد
    push('(');
  }
}
function handleFn(fn){
  switch(fn){
    // ... الحالات اللي عندك
    case 'paren':
      insertParen();
      break;
    // ... باقي الحالات
  }
}
  function roundSmart(v,dec){
    if(!isFinite(v)) return v;
    if(Math.abs(v - Math.round(v)) < 1e-12) return Math.round(v);
    return parseFloat(v.toFixed(dec));
  }
  // تحويل decimal إلى fraction تقريبي (مستخدم عند زر التحويل - لكن حسب طلبك الزر frac لا يعطى مقدار افتراضي)
  function decimalToFraction(x, maxDen = 10000) {
    if(!isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const eps = 1e-10;
    let a = Math.floor(x);
    if (Math.abs(a - x) < eps) return [sign*a,1];
    let h1 = 1, k1 = 0, h = a, k = 1;
    let frac = x - a;
    while (Math.abs(x - h/k) > eps && k < maxDen) {
      frac = 1/frac;
      a = Math.floor(frac);
      let h2 = h1; let k2 = k1;
      h1 = h; k1 = k;
      h = a*h1 + h2;
      k = a*k1 + k2;
      frac = frac - a;
      if (isNaN(frac)) break;
    }
    return [sign*h, k];
  }
  // ذاكرة العمليات
  function memClear(){ memory = 0; updateDisplay(); }
  function memRecall(){ push(String(memory)); }
  function memAdd(){ memory = Number(memory) + Number(lastAnswer || 0); updateDisplay(); }
  function memSub(){ memory = Number(memory) - Number(lastAnswer || 0); updateDisplay(); }
  // نسخ النتيجة
  async function copyResult(){
    try {
      await navigator.clipboard.writeText(resultEl.textContent || '');
      flashTemp('Copied ✓');
    } catch {
      flashTemp('Copied');
    }
  }
  function flashTemp(msg){
    const old = resultEl.textContent;
    resultEl.textContent = msg;
    setTimeout(()=> resultEl.textContent = old,700);
  }
  // التعامل مع الضغط على الأزرار
  buttons.forEach(b => {
    b.addEventListener('click', () => {
      const num = b.dataset.num;
      const op = b.dataset.op;
      const fn = b.dataset.fn;
      if(num !== undefined){
        // أي إدخال رقم/نقطة يُعيد إمكانية ANS
        ansInserted = false;
        push(num);
      } else if(op !== undefined){
        ansInserted = false;
        push(op);
      } else if(fn !== undefined){
        handleFn(fn);
      }
    });
  });
  // منطق الدوال والأزرار
  function handleFn(fn){
    switch(fn){
      case 'ac': clearAll(); break;
      case 'del': delChar(); break;
case '=': {
  const v = safeEval(expr);
  if (Number.isNaN(v) || v === undefined) {
    resultEl.textContent = 'Error';
  } else {
    lastAnswer = roundSmart(v,12);
    // عرض النتيجة تحت بس
    resultEl.textContent = String(lastAnswer);
    ansInserted = false;
    updateDisplay();
  }
  break;
}
      case 'ans':
        // ندخل توكن ANS لكن منع التكرار
        push('ANS');
        break;
      case 'pi': push('π'); break;
      case 'pi2': push('2π'); break;
      case 'mc': memClear(); break;
      case 'mr': memRecall(); break;
      case 'mplus': memAdd(); break;
      case 'mminus': memSub(); break;
      case 'inv': push('1/('); break;
      case 'percent': push('/100'); break;
      case 'sqrt': push('sqrt('); break;
      case 'ln': push('ln('); break;
      case 'log': push('log('); break;
      case 'sin':
      case 'cos':
      case 'tan':
        if(shiftMode){
          // إذا الشيفت مفعّل نُدخل الدوال العكسية
          if(fn === 'sin') push('asin(');
          if(fn === 'cos') push('acos(');
          if(fn === 'tan') push('atan(');
        } else {
          push(fn + '(');
        }
        break;
      case '^':
        // نفتح قوس للأس لكتابة الأس بداخله
        push('^(');
        break;
      case 'exp': push('Math.E**('); break;
      case 'fact': push('!'); break;
      case '+/-': push('-('); break;
case 'frac': {
  // لو لقى رقم أو π أو ANS في الآخر
  const m = expr.match(/(ANS|π|\d+(\.\d+)?|\))$/);
  if (m) {
    // يضيف بس الشرطة /
    expr += '/';
  } else {
    // لو مفيش حاجة قبله برضه يسيبها فاضية
    expr += '';
  }
  ansInserted = false;
  updateDisplay();
  break;
}	
      case 'abs': push('Math.abs('); break;
      case 'floor': push('floor('); break;
      case 'ceil': push('ceil('); break;
	  
case 'rand': 
    if(!ansInserted){   // لو ANS مش مدخّل دلوقتي
        push(Math.random().toFixed(6));
        ansInserted = true; // تمنع تكرار الرقم قبل أي إدخال جديد
    }
    break;
	  
	  
	  
      case 'copy': copyResult(); break;
      default:
        break;
    }
  }
  // زر DEG/RAD
  degRadBtn.addEventListener('click', ()=> {
    degMode = !degMode;
    degRadBtn.textContent = degMode ? 'DEG' : 'RAD';
    updateDisplay();
  });
  // زر SHIFT (لو موجود)
  if(shiftBtn){
    shiftBtn.addEventListener('click', ()=> {
      shiftMode = !shiftMode;
      shiftBtn.classList.toggle('muted', !shiftMode);
      // نغير النص ليدل على الحالة
      shiftBtn.textContent = shiftMode ? 'SHIFT✓' : 'SHIFT';
    });
  }
  // دعم الكيبورد
  window.addEventListener('keydown', (e) => {
    if(e.key >= '0' && e.key <= '9') { ansInserted = false; push(e.key); }
    else if(e.key === '.') { ansInserted = false; push('.'); }
    else if(e.key === 'Enter' || e.key === '='){ handleFn('='); e.preventDefault(); }
    else if(e.key === 'Backspace') delChar();
    else if(e.key === 'Escape') clearAll();
    else if(e.key === '+') { ansInserted = false; push('+'); }
    else if(e.key === '-') { ansInserted = false; push('-'); }
    else if(e.key === '*') { ansInserted = false; push('×'); }
    else if(e.key === '/') { ansInserted = false; push('÷'); }
    else if(e.key === '(') { ansInserted = false; push('('); }
    else if(e.key === ')') { ansInserted = false; push(')'); }
  });
  // أول تشغيل
  updateDisplay();
  // polyfill Math.log10 إذا لم تكن موجودة
  if (!Math.log10) {
    Math.log10 = function(x){ return Math.log(x)/Math.LN10; };
  }
})();










