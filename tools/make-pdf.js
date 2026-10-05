#!/usr/bin/env node
/*
 * Genera el PDF (A4, 2 páginas) de una sesión a partir de su index.html.
 * Lee el objeto SESSION y las imágenes incrustadas de la página y los vuelca en
 * una plantilla pensada para papel. Resultado: <carpeta>/programa.pdf
 *
 * Uso:  node tools/make-pdf.js roche/barcelona-2026-11 [--con-puntos]
 *       --con-puntos incluye las viñetas de cada bloque (el programa pasa a ocupar más de una página).
 * Requiere Google Chrome instalado (se usa en modo headless para imprimir).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const withPoints = process.argv.includes("--con-puntos");
const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!dir) { console.error("Uso: node tools/make-pdf.js <cliente/sesion>"); process.exit(1); }
const htmlPath = path.join(dir, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

/* ── Datos ── */
const m = html.match(/const SESSION = (\{[\s\S]*?\n\});/);
if (!m) throw new Error("No encuentro el objeto SESSION en " + htmlPath);
const SESSION = new Function("return " + m[1])();

const pick = (re) => { const r = html.match(re); return r ? r[1] : ""; };
const heroImg = pick(/class="hero__img" src="(data:[^"]+)"/);
const logoWhite = pick(/class="hero__logo" src="(data:[^"]+)"/);
const logoFooter = pick(/class="footer__logo" src="(data:[^"]+)"/);
const brand = pick(/--brand: (#[0-9A-Fa-f]{6})/) || "#0066CC";
const brandDark = pick(/--brand-dark: (#[0-9A-Fa-f]{6})/) || "#004E9F";
const brandSoft = pick(/--brand-soft: (#[0-9A-Fa-f]{6})/) || "#E8F1FA";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toMin = (t) => { const [h, mi] = t.split(":").map(Number); return h * 60 + mi; };
const [y, mo, d] = SESSION.date.split("-").map(Number);
const longDate = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: SESSION.timeZone }).format(new Date(Date.UTC(y, mo - 1, d, 12)));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const total = toMin(SESSION.end) - toMin(SESSION.start);
const durText = Math.floor(total / 60) + " h" + (total % 60 ? " " + (total % 60) + " min" : "");
const nBlocks = SESSION.blocks.filter((b) => b.kind === "block").length;

/* ── Filas del programa ── */
let n = 0;
const rows = SESSION.blocks.map((b) => {
  const isBlock = b.kind === "block"; if (isBlock) n++;
  const tools = (b.tools || []).map((t) => `<span class="chip">${esc(t.name)}</span>`).join("");
  const points = withPoints ? (b.points || []).map((p) => `<li>${esc(p)}</li>`).join("") : "";
  return `
  <tr class="${isBlock ? "row-block" : "row-soft"}">
    <td class="time"><strong>${esc(b.start)}</strong><span>${esc(b.end)}</span></td>
    <td class="what">
      <div class="title">${isBlock ? `<span class="num">${n}</span>` : ""}${esc(b.title)}</div>
      <p class="summary">${esc(b.summary)}</p>
      ${points ? `<ul class="points">${points}</ul>` : ""}
      ${tools ? `<div class="chips"><span class="chips__label">Herramientas</span>${tools}</div>` : ""}
    </td>
  </tr>`;
}).join("");

const bring = (SESSION.bring || []).map((c) => `
  <div class="card ${c.emph ? "card--emph" : ""}"><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p></div>`).join("");

const after = SESSION.after ? `
  <div class="box box--tint">
    <p class="eyebrow">Después del taller</p>
    <h3>${esc(SESSION.after.title)}</h3>
    <p>${esc(SESSION.after.text)}</p>
    <p class="small"><strong>${esc(SESSION.after.place)}</strong> · ${esc(SESSION.after.address)}</p>
  </div>` : "";

const f = SESSION.facilitator || {};
const refCode = SESSION.client?.refCode || "";

/* ── Plantilla ── */
const page = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(SESSION.title)} · ${esc(SESSION.client.name)}</title>
<style>
  @page { size: A4; margin: 0; }
  :root { --brand: ${brand}; --brand-dark: ${brandDark}; --brand-soft: ${brandSoft}; --ink: #16191F; --soft: #4A5568; --mute: #6B7280; --line: #E2E8F0; --tint: #F3F7FC;
          --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif; --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; font-family: var(--font); color: var(--ink); font-size: 10.5pt; line-height: 1.45; }
  .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; break-after: page; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .page > * { flex: none; }
  ${withPoints ? ".page:first-child { height: auto; overflow: visible; }" : ""}   /* los hijos no se encogen: el hero mantiene su alto */
  .pad { padding: 0 16mm; }

  /* Hero */
  .hero { position: relative; height: 58mm; color: #fff; overflow: hidden; background: #0b1b33; }
  .hero img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; }
  .hero .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,20,40,.25) 0%, rgba(10,20,40,.55) 45%, rgba(10,20,40,.92) 100%); }
  .hero .content { position: absolute; left: 16mm; right: 16mm; top: 8mm; bottom: 8mm; display: flex; flex-direction: column; justify-content: space-between; }
  .hero .logo { height: 9mm; width: auto; align-self: flex-start; }
  .eyebrow { font-family: var(--mono); font-size: 7.5pt; letter-spacing: .18em; text-transform: uppercase; color: var(--brand); margin: 0 0 2mm; display: flex; align-items: center; gap: 2.5mm; }
  .eyebrow::before { content: ""; width: 6mm; height: 1.5px; background: currentColor; }
  .hero .eyebrow { color: rgba(255,255,255,.85); }
  .hero h1 { margin: 0 0 2mm; font-size: 23pt; line-height: 1.02; letter-spacing: -.02em; font-weight: 800; max-width: 120mm; }
  .hero .lead { margin: 0; font-size: 9.5pt; color: rgba(255,255,255,.85); max-width: 130mm; }

  /* Datos clave */
  .facts { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 6mm; padding: 5mm 16mm; margin: 0; border-bottom: 1.5px solid var(--brand); }
  .fact dt { font-family: var(--mono); font-size: 7pt; letter-spacing: .14em; text-transform: uppercase; color: var(--mute); margin: 0 0 1mm; }
  .fact dd { margin: 0; font-weight: 700; font-size: 11pt; line-height: 1.25; }
  .fact dd small { display: block; font-weight: 400; font-size: 8.5pt; color: var(--soft); margin-top: 1mm; }

  /* Programa */
  h2 { margin: 0; font-size: 17pt; letter-spacing: -.015em; font-weight: 800; }
  .section-head { padding: 5mm 16mm 2mm; }
  .section-head p { margin: 1.5mm 0 0; color: var(--mute); font-size: 9.5pt; }
  table.program { width: 178mm; margin: 0 16mm; border-collapse: collapse; }
  table.program td { vertical-align: top; padding: 2.6mm 0; border-top: 1px solid var(--line); }
  table.program tr:first-child td { border-top: 0; }
  td.time { width: 22mm; font-family: var(--mono); font-size: 9pt; color: var(--soft); white-space: nowrap; }
  td.time strong { display: block; color: var(--ink); font-size: 10.5pt; }
  td.what .title { font-weight: 700; font-size: 11pt; display: flex; align-items: center; gap: 2.5mm; }
  .num { display: inline-grid; place-items: center; width: 6.5mm; height: 6.5mm; border-radius: 2mm; background: var(--brand-soft); color: var(--brand-dark); font-family: var(--mono); font-weight: 800; font-size: 8.5pt; }
  .row-soft .title { color: var(--soft); font-weight: 600; }
  .summary { margin: .8mm 0 0; color: var(--soft); font-size: 9.5pt; }
  .row-soft .summary { font-size: 9pt; }
  ul.points { margin: 1.2mm 0 0; padding-left: 4.5mm; color: var(--soft); font-size: 8.5pt; }
  ul.points li { margin: 0 0 .4mm; }
  .chips { display: flex; flex-wrap: wrap; gap: 1.5mm; margin-top: 1.5mm; align-items: center; }
  .chips__label { font-family: var(--mono); font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; color: var(--mute); margin-right: 1mm; }
  .chip { font-size: 8pt; font-weight: 600; padding: .4mm 2.2mm; border-radius: 10mm; border: 1px solid var(--line); background: #F8FAFC; }

  /* Página 2 */
  .cards { display: grid; grid-template-columns: repeat(${Math.max(1, (SESSION.bring || []).length)}, 1fr); gap: 4mm; padding: 0 16mm; }
  .card { padding: 5mm; border-radius: 3mm; background: var(--tint); }
  .card h4 { margin: 0 0 1.5mm; font-size: 10.5pt; }
  .card p { margin: 0; font-size: 9pt; color: var(--soft); }
  .card--emph { background: var(--brand); color: #fff; }
  .card--emph p { color: rgba(255,255,255,.88); }
  .grid2 { display: grid; grid-template-columns: 1.2fr 1fr; gap: 4mm; padding: 0 16mm; }
  .box { border: 1px solid var(--line); border-radius: 3mm; padding: 5mm; }
  .box h3 { margin: 0 0 1.5mm; font-size: 13pt; letter-spacing: -.01em; }
  .box p { margin: 0; color: var(--soft); font-size: 9.5pt; }
  .box .small { font-size: 9pt; margin-top: 1.5mm; }
  .box--tint { background: var(--tint); border-color: transparent; grid-column: 1 / -1; }
  .person { display: flex; gap: 4mm; align-items: flex-start; }
  .avatar { flex: none; width: 13mm; height: 13mm; border-radius: 50%; background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 12pt; }
  .role { font-family: var(--mono); font-size: 7.5pt; letter-spacing: .1em; text-transform: uppercase; color: var(--brand); margin: 0 0 1.5mm !important; }
  .cta { margin: 6mm 16mm 0; border-radius: 4mm; padding: 8mm 9mm; color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-dark)); }
  .cta h2 { color: #fff; margin-bottom: 1.5mm; }
  .cta p { margin: 0; color: rgba(255,255,255,.88); font-size: 10pt; }
  .footer { margin-top: auto; padding: 6mm 16mm 12mm; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: var(--mute); }
  .footer img { height: 9mm; width: auto; }
  .footer .code { font-family: var(--mono); letter-spacing: .06em; }
</style></head><body>

<section class="page">
  <div class="hero">
    ${heroImg ? `<img class="bg" src="${heroImg}" alt="">` : ""}
    <div class="scrim"></div>
    <div class="content">
      ${logoWhite ? `<img class="logo" src="${logoWhite}" alt="${esc(SESSION.client.name)}">` : `<div></div>`}
      <div>
        <p class="eyebrow">${esc(SESSION.eyebrow)}</p>
        <h1>${esc(SESSION.title)}</h1>
        <p class="lead">${esc(SESSION.lead)}</p>
      </div>
    </div>
  </div>
  <dl class="facts">
    <div class="fact"><dt>Fecha</dt><dd>${esc(cap(longDate))}</dd></div>
    <div class="fact"><dt>Horario</dt><dd>${esc(SESSION.start)} – ${esc(SESSION.end)}<small>${esc(durText)} · ${nBlocks} bloques prácticos</small></dd></div>
    <div class="fact"><dt>Lugar</dt><dd>${esc(SESSION.venue.name)}<small>${esc(SESSION.venue.address)}</small></dd></div>
  </dl>
  <div class="section-head"><p class="eyebrow">Programa</p><h2>Así será la sesión</h2></div>
  <table class="program"><tbody>${rows}</tbody></table>
</section>

<section class="page">
  <div class="section-head" style="padding-top:14mm"><p class="eyebrow">Antes de venir</p><h2>Para aprovecharlo al máximo</h2></div>
  <div class="cards">${bring}</div>
  <div class="section-head"><p class="eyebrow">Dónde y con quién</p><h2>Lugar y facilitador</h2></div>
  <div class="grid2">
    <div class="box">
      <p class="eyebrow">Lugar</p>
      <h3>${esc(SESSION.venue.name)}</h3>
      <p>${esc(SESSION.venue.address)}</p>
      ${SESSION.venue.note ? `<p class="small">${esc(SESSION.venue.note)}</p>` : ""}
    </div>
    <div class="box person">
      <div class="avatar">${esc(f.initials || "")}</div>
      <div><h3 style="font-size:11.5pt">${esc(f.name || "")}</h3><p class="role">${esc(f.role || "")}</p><p>${esc(f.bio || "")}</p></div>
    </div>
    ${after}
  </div>
  <div class="cta">
    <h2>Guarda la fecha</h2>
    <p>${esc(cap(longDate))}, de ${esc(SESSION.start)} a ${esc(SESSION.end)}, en ${esc(SESSION.venue.name)}. Trae tu ordenador y resérvate la tarde.</p>
  </div>
  <div class="footer">
    ${logoFooter ? `<img src="${logoFooter}" alt="">` : "<span></span>"}
    <span class="code">${esc(refCode)}</span>
  </div>
</section>

</body></html>`;

/* ── Imprimir ── */
const tmp = path.join(os.tmpdir(), `programa-${Date.now()}.html`);
fs.writeFileSync(tmp, page);
const out = path.resolve(dir, "programa.pdf");
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=3000", `--print-to-pdf=${out}`, "file://" + tmp], { stdio: "ignore" });
fs.unlinkSync(tmp);
console.log("PDF generado:", out);
