const NUMERO = "573227494157";
async function numeroDePedido() {
  try {
    const dia = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");
    const r = await fetch("https://api.counterapi.dev/v1/wammba-viterbo/pedidos-" + dia + "/up");
    const d = await r.json();
    return d.count || "";
  } catch (e) {
    return "";
  }
}

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeuRcRyDjlKfWj4lErGFh5s5hpohZ7lSp-ZplYeDOQLczV0ww/formResponse";
const CAMPOS = {
  nombre: "entry.1764785994",
  telefono: "entry.2043531380",
  platos: "entry.272676301",
  entrega: "entry.2011014206",
  direccion: "entry.150777484",
  pago: "entry.711794326",
  especificaciones: "entry.1005995080",
  total: "entry.533841451"
};
// const COSTO_DOMICILIO = 0; // Domicilio sin costo adicional por ahora

function toggleMenu(titulo) {
  const seccion = titulo.nextElementSibling;
  if (!seccion) return;
  seccion.style.display = seccion.style.display === "block" ? "none" : "block";
}
function toggleCantidad(checkbox) {
  const item = checkbox.closest(".item");
  if (!item) return;
  const cantidad = item.querySelector(".cantidad");
  if (!cantidad) return;
  if (checkbox.checked) {
    cantidad.disabled = false;
    if (Number(cantidad.value) === 0) cantidad.value = 1;
  } else {
    cantidad.value = 0;
    cantidad.disabled = true;
  }
  calcularTotal();
}
function toggleDescripcion(checkbox) {
  const item = checkbox.closest(".item");
  if (!item) return;
  const desc = item.querySelector(".descripcion");
  if (!desc) return;
  desc.style.display = checkbox.checked ? "block" : "none";
}
function calcularTotal() {
  let subtotal = 0;
  let contadorEmpaque = 0;
  document.querySelectorAll(".check-plato").forEach(cb => {
    if (!cb.checked) return;
    const item = cb.closest(".item");
    if (!item) return;
    const cantidad = Number(item.querySelector(".cantidad")?.value) || 0;
    if (cantidad <= 0) return;
    const sel = item.querySelector(".tamano");
    const precio = sel ? Number(sel.value) : Number(item.querySelector(".item-linea span")?.dataset.precio);
    subtotal += (precio || 0) * cantidad;
    contadorEmpaque += cantidad;
  });
  const tipoEntrega = document.getElementById("tipoEntrega")?.value;
  // [SI EL RESTAURANTE COBRA DOMICILIO: descomentar]
  // if (tipoEntrega === "A domicilio") subtotal += COSTO_DOMICILIO;
  // [SI EL RESTAURANTE COBRA EMPAQUE: descomentar]
  // let empaque = (tipoEntrega === "Comer dentro del local") ? 0 : contadorEmpaque * 1500;
  // subtotal += empaque;
  document.getElementById("total").innerText = "$" + subtotal.toLocaleString("es-CO");
  document.getElementById("totalPedido").value = subtotal;
}

/* ---- Mostrar / ocultar campos del formulario ---- */
const $ = id => document.getElementById(id);
$("tipoEntrega").addEventListener("change", () => {
  const t = $("tipoEntrega").value;
  $("direccionField").style.display = t === "A domicilio" ? "block" : "none";
  $("mesaField").style.display = t === "Comer dentro del local" ? "block" : "none";
  $("direccion").required = t === "A domicilio";
  calcularTotal();
});
$("tipoPago").addEventListener("change", () => {
  $("efectivoField").style.display = $("tipoPago").value === "Efectivo" ? "block" : "none";
});

/* ---- Envío por WhatsApp ---- */
let enviando = false;
$("pedidoForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (enviando) return;
  const platos = [...document.querySelectorAll(".check-plato:checked")].map(cb => {
    const it = cb.closest(".item");
    const q = Number(it.querySelector(".cantidad").value) || 0;
    if (q <= 0) return null;
    const s = it.querySelector(".sabor, .tamano");
    return lineasPlato(cb, it, q);
  }).filter(Boolean);
  if (!platos.length) { alert("Selecciona al menos un plato 🍔"); return; }

  const entrega = $("tipoEntrega").value, pago = $("tipoPago").value;
  const btnEnv = document.querySelector(".btn");
  btnEnv.disabled = true;
  const numPedido = await numeroDePedido();
  btnEnv.disabled = false;
  const hora = new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  let m = "🍔 *PEDIDO" + (numPedido ? " #" + numPedido : "") + " - Wammba*\n🕘 " + hora + "\n\n";
  m += "👤 *Nombre:* " + $("nombre").value + "\n📞 *Teléfono:* " + $("telefono").value + "\n\n";
  m += "🛒 *Pedido:*\n\n" + platos.join("\n\n") + "\n\n";
  m += "📦 *Entrega:* " + entrega + "\n";
  if (entrega === "A domicilio") m += "📍 *Dirección:* " + $("direccion").value + "\n";
  if (entrega === "Comer dentro del local") m += "🔢 *Mesa:* " + $("numeroMesa").value + "\n";
  m += "💰 *Pago:* " + pago + "\n";
  if (pago === "Efectivo" && $("efectivoCliente").value) m += "💵 *Paga con:* " + $("efectivoCliente").value + "\n";
  if ($("especificaciones").value.trim()) m += "📒 *Especificaciones:* " + $("especificaciones").value.trim() + "\n";
  m += "\n💸 *Total:* " + $("total").innerText;

  // Anti doble envío (5 s)
  const btn = document.querySelector(".btn");
  enviando = true; btn.disabled = true;
  setTimeout(() => { enviando = false; btn.disabled = false; }, 5000);

    const urlWA = "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(m);
  let fue = false;
  const irAWhatsApp = () => { if (fue) return; fue = true; window.location.href = urlWA; };

  const f = new URLSearchParams();
  f.append(CAMPOS.nombre, (numPedido ? "#" + numPedido + " - " : "") + $("nombre").value);
  f.append(CAMPOS.telefono, $("telefono").value);
  const aHoja = t => { const p = t.split("\n"); return p[0] + (p.length > 1 ? " (" + p.slice(1).map(x => x.replace("　• ", "")).join(", ") + ")" : ""); };
  f.append(CAMPOS.platos, platos.join("\n\n").split("\n\n").map(aHoja).join("\n"));
  f.append(CAMPOS.entrega, entrega);
  f.append(CAMPOS.direccion, entrega === "A domicilio" ? $("direccion").value : (entrega === "Comer dentro del local" ? "Mesa " + $("numeroMesa").value : ""));
  f.append(CAMPOS.pago, pago);
  f.append(CAMPOS.especificaciones, $("especificaciones").value.trim());
  f.append(CAMPOS.total, $("totalPedido").value);

  fetch(FORM_URL, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: f.toString()
  }).catch(() => {}).finally(irAWhatsApp);

  setTimeout(irAWhatsApp, 1500);
});

/* Al tocar la cantidad se selecciona el número: escribes encima sin borrar */
function seleccionarCantidad(e){
  const el = e.target;
  if (!el.classList || !el.classList.contains("cantidad")) return;
  setTimeout(() => { try { el.select(); } catch(err){} }, 0);
}
document.addEventListener("focusin", seleccionarCantidad);
document.addEventListener("click", seleccionarCantidad);

/* El total se actualiza mientras escribe */
document.addEventListener("input", e => {
  if (e.target.classList && e.target.classList.contains("cantidad")) calcularTotal();
});

/* ---- Pestañas por plato ---- */
function cantidadDe(item){
  return Math.max(1, Math.floor(Number(item.querySelector(".cantidad")?.value)) || 1);
}

function crearUnidad(item){
  const u = document.createElement("div");
  u.className = "unidad";
  const main = item.querySelector(".tamano");
  let html = "";
  if (main) html += '<div class="tam-wrap"><label class="tam-label"></label></div>';
  html += '<label class="obs-label"></label><textarea class="observacion" rows="2" placeholder="Ej: sin hielo, poca azúcar, doble queso..."></textarea>';
  u.innerHTML = html;
  if (main){
    const s = main.cloneNode(true);
    s.removeAttribute("onchange");
    s.className = "tamano-u";
    s.selectedIndex = main.selectedIndex;
    s.addEventListener("change", () => calcularTotal());
    u.querySelector(".tam-wrap").appendChild(s);
  }
  return u;
}

function actualizarUnidades(item){
  let desc = item.querySelector(".descripcion");
  if (!desc){
    desc = document.createElement("div");
    desc.className = "descripcion";
    desc.style.display = "none";
    item.appendChild(desc);
  }
  let wrap = item.querySelector(".unidades");
  if (!wrap){
    wrap = document.createElement("div");
    wrap.className = "unidades";
    wrap.innerHTML = '<div class="u-hint" style="display:none"></div><div class="u-tabs"></div><div class="u-bloques"></div>';
    desc.appendChild(wrap);
  }
  const bl = wrap.querySelector(".u-bloques");
  const tabs = wrap.querySelector(".u-tabs");
  const hint = wrap.querySelector(".u-hint");
  const main = item.querySelector(".tamano");
  const n = cantidadDe(item);
  const nPrev = Number(wrap.dataset.n) || 1;
  const eraMulti = item.classList.contains("multi");

  while (bl.children.length > n) bl.lastElementChild.remove();
  while (bl.children.length < n) bl.appendChild(crearUnidad(item));

  const u1 = bl.children[0].querySelector(".tamano-u");
  if (main && u1){
    if (n > 1 && !eraMulti) u1.selectedIndex = main.selectedIndex;
    if (n === 1 && eraMulti) main.selectedIndex = u1.selectedIndex;
  }

  const activa = Math.min(Number(tabs.dataset.activa) || 1, n);
  tabs.dataset.activa = activa;
  tabs.style.display = n > 1 ? "flex" : "none";
  tabs.innerHTML = n > 1
    ? Array.from({length: n}, (_, i) => '<button type="button" class="u-tab' + (i + 1 === activa ? ' activa' : '') + '" data-u="' + (i + 1) + '">Plato ' + (i + 1) + '</button>').join("")
    : "";

  [...bl.children].forEach((b, i) => {
    b.style.display = (i + 1 === activa) ? "block" : "none";
    const t = b.querySelector(".tam-label");
    if (t) t.textContent = "🍽️ Elige tamaño o combo" + (n > 1 ? " del Plato " + (i + 1) : "") + ":";
    b.querySelector(".obs-label").textContent = "📝 Observación" + (n > 1 ? " Plato " + (i + 1) : "") + ":";
  });

  item.classList.toggle("multi", n > 1);
  wrap.dataset.n = n;

  if (n > 1 && nPrev !== n){
    hint.textContent = main
      ? "👆 Toca cada pestaña: elige el tamaño y la observación de cada plato"
      : "👆 Toca cada pestaña: escribe la observación de cada plato";
    hint.style.display = "block";
    tabs.classList.add("parpadeo");
    clearTimeout(item._tu);
    item._tu = setTimeout(() => {
      hint.style.display = "none";
      tabs.classList.remove("parpadeo");
    }, 3000);
  }
  if (n === 1){
    hint.style.display = "none";
    tabs.classList.remove("parpadeo");
  }
  calcularTotal();
}

function lineasPlato(cb, it, q){
  const bl = [...it.querySelectorAll(".unidad")];
  const multi = q > 1 && it.classList.contains("multi");
  const unidades = multi
    ? bl.slice(0, q).map(b => {
        const s = b.querySelector(".tamano-u");
        return { tam: s ? s.options[s.selectedIndex].text : "", obs: b.querySelector(".observacion")?.value.trim() || "" };
      })
    : [(() => {
        const s = it.querySelector(".sabor, .tamano");
        return { tam: s ? s.options[s.selectedIndex].text : "", obs: bl[0]?.querySelector(".observacion")?.value.trim() || "" };
      })()];
  const grupos = [];
  unidades.forEach(u => {
    const g = grupos.find(x => x.tam === u.tam && x.obs === u.obs);
    if (g) g.n++; else grupos.push({ tam: u.tam, obs: u.obs, n: 1 });
  });
  return grupos.map(g => {
    let t = (multi ? g.n : q) + " × " + cb.value;
    if (g.tam) t += "\n　• " + g.tam;
    if (g.obs) t += "\n　• Observación: " + g.obs;
    return t;
  }).join("\n\n");
}

document.addEventListener("click", e => {
  const t = e.target.closest ? e.target.closest(".u-tab") : null;
  if (!t) return;
  const wrap = t.closest(".unidades");
  const tabs = wrap.querySelector(".u-tabs");
  tabs.dataset.activa = t.dataset.u;
  tabs.querySelectorAll(".u-tab").forEach(b => b.classList.toggle("activa", b === t));
  [...wrap.querySelector(".u-bloques").children].forEach((b, i) => {
    b.style.display = (i + 1 === Number(t.dataset.u)) ? "block" : "none";
  });
});

document.addEventListener("change", e => {
  if (e.target.classList && e.target.classList.contains("check-plato")) actualizarUnidades(e.target.closest(".item"));
});
document.addEventListener("input", e => {
  if (e.target.classList && e.target.classList.contains("cantidad")) actualizarUnidades(e.target.closest(".item"));
});

/* ---- Total con tamaño distinto por plato ---- */
const _calcularTotalBase = calcularTotal;
calcularTotal = function(){
  _calcularTotalBase();
  let extra = 0;
  document.querySelectorAll(".item.multi").forEach(item => {
    const cb = item.querySelector(".check-plato");
    const main = item.querySelector(".tamano");
    if (!cb || !cb.checked || !main) return;
    let suma = 0;
    item.querySelectorAll(".tamano-u").forEach(s => suma += Number(s.value) || 0);
    extra += suma - (Number(main.value) || 0) * cantidadDe(item);
  });
  if (extra){
    const nuevo = (Number($("totalPedido").value) || 0) + extra;
    $("total").innerText = "$" + nuevo.toLocaleString("es-CO");
    $("totalPedido").value = nuevo;
  }
};

/* ---- Aviso parpadeante al elegir plato con opciones ---- */
document.addEventListener("change", e => {
  const cb = e.target;
  if (!cb.classList || !cb.classList.contains("check-plato")) return;
  const item = cb.closest(".item");
  if (!item) return;
  item.querySelector(".aviso-opcion")?.remove();
  item.querySelectorAll(".parpadeo").forEach(x => x.classList.remove("parpadeo"));
  clearTimeout(item._t);
  if (!cb.checked) return;
  const sel = item.querySelector(".tamano, .sabor");
  if (!sel) return;
  const opciones = [...sel.options].map(o => o.text.split(" – ")[0]).join(" o ");
  const aviso = document.createElement("div");
  aviso.className = "aviso-opcion";
  aviso.textContent = "👆 Elige " + opciones + " y la cantidad";
  item.querySelector(".item-linea").after(aviso);
  sel.classList.add("parpadeo");
  item._t = setTimeout(() => {
    aviso.remove();
    sel.classList.remove("parpadeo");
  }, 3000);
});