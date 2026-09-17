// Turns the Claude Design source (design.dc.html) into a static index.html:
// no dc runtime, no React — the four template bindings become vanilla JS.
import fs from "node:fs";

const src = fs.readFileSync("design.dc.html", "utf8");
const between = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`markers ${a} / ${b}`);
  return src.slice(i + a.length, j);
};

const head = between("<helmet>", "</helmet>");
let body = between("</helmet>", "<sc-if");
body = body.replace(`<div onClick="{{ onRootClick }}" style=`, `<div id="root" style=`);
if (body.includes("{{")) throw new Error("unconverted binding left in body");

const lightbox = between("<sc-if", "</sc-if>")
  .replace(/^[^>]*>/, "")
  .replace(`<div onClick="{{ closeShot }}" style="`, `<div id="shot" hidden style="`)
  .replace(`src="{{ shot }}"`, `src=""`);
if (lightbox.includes("{{")) throw new Error("unconverted binding left in lightbox");

const logic = between("class Component extends DCLogic {", "renderVals()");
const count = logic.slice(logic.indexOf("runCount(el) {") + "runCount(el) {".length, logic.lastIndexOf("}"));

const script = `
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function runCount(el) {${count}}

  if (!reduce) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countIO.unobserve(e.target); runCount(e.target); } });
    }, { threshold: 0.35 });
    document.querySelectorAll('[data-countup]').forEach(function (el) { countIO.observe(el); });

    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { revealIO.unobserve(e.target); e.target.style.opacity = '1'; e.target.style.transform = 'none'; }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)';
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      revealIO.observe(el);
    });
  }

  var box = document.getElementById('shot'), img = box.querySelector('img');
  function close() { box.hidden = true; box.style.display = 'none'; img.removeAttribute('src'); }
  function open(src) { img.src = src; box.hidden = false; box.style.display = 'flex'; }
  close();
  document.getElementById('root').addEventListener('click', function (e) {
    var frame = e.target.closest && e.target.closest('[data-shot]');
    if (frame) open(frame.dataset.shot);
  });
  box.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alaa Maged Mubarak — Portfolio</title>
<meta name="description" content="Alaa Maged Mubarak — portfolio and results, backed by unretouched Shopify dashboards.">
<meta name="theme-color" content="#0A0A0B">
${head.trim()}
</head>
<body>
${body.trim()}
${lightbox.trim()}
</div>
<script>${script}</script>
</body>
</html>
`;
fs.writeFileSync("index.html", html);
console.log("index.html", html.length, "bytes");
