const NUMERO = "573227494157";
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
$("pedidoForm").addEventListener("submit", e => {
  e.preventDefault();
  if (enviando) return;
  const platos = [...document.querySelectorAll(".check-plato:checked")].map(cb => {
    const it = cb.closest(".item");
    const q = Number(it.querySelector(".cantidad").value) || 0;
    if (q <= 0) return null;
    const s = it.querySelector(".sabor, .tamano");
    const obs = it.querySelector(".observacion")?.value.trim();
    return "• " + q + " × " + cb.value + (s ? " (" + s.options[s.selectedIndex].text + ")" : "") + (obs ? " - Obs: " + obs : "");
  }).filter(Boolean);
  if (!platos.length) { alert("Selecciona al menos un plato 🍔"); return; }

  const entrega = $("tipoEntrega").value, pago = $("tipoPago").value;
  let m = "🍔 *Nuevo pedido - Wammba*\n\n";
  m += "👤 *Nombre:* " + $("nombre").value + "\n📞 *Teléfono:* " + $("telefono").value + "\n\n";
  m += "🛒 *Pedido:*\n" + platos.join("\n") + "\n\n";
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
  f.append(CAMPOS.nombre, $("nombre").value);
  f.append(CAMPOS.telefono, $("telefono").value);
  f.append(CAMPOS.platos, platos.join("\n"));
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

/* Campo de observación dentro de cada plato */
document.querySelectorAll(".item").forEach(item => {
  if (item.querySelector(".observacion")) return;
  let desc = item.querySelector(".descripcion");
  if (!desc) {
    desc = document.createElement("div");
    desc.className = "descripcion";
    desc.style.display = "none";
    item.appendChild(desc);
  }
  const caja = document.createElement("div");
  caja.className = "obs-caja";
  caja.innerHTML = '<label>📝 Observación:</label><textarea class="observacion" rows="2" placeholder="Ej: sin hielo, poca azúcar, doble queso..."></textarea>';
  desc.appendChild(caja);
});

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