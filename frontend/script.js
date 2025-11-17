const API_URL = window.API_URL || "http://localhost:8000/api";

let token = localStorage.getItem("token") || null;

function showToast(message) {
  const toast = document.getElementById("toast");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  toast.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showLoader(show) {
  document.getElementById("loader").classList.toggle("hidden", !show);
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = "Error";
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

async function signup(email, password) {
  return apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

async function login(email, password) {
  const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  token = data.access_token;
  localStorage.setItem("token", token);
  document.getElementById("logoutBtn").classList.remove("hidden");
  document.getElementById("loginBtn").classList.add("hidden");
  showToast("Logged in");
  await initAfterAuth();
}

async function logout() {
  token = null;
  localStorage.removeItem("token");
  document.getElementById("logoutBtn").classList.add("hidden");
  document.getElementById("loginBtn").classList.remove("hidden");
  showToast("Logged out");
}

async function getMe() {
  return apiFetch("/auth/me");
}

async function listProducts(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/products${q ? `?${q}` : ""}`);
}

async function addProduct(data) {
  return apiFetch("/products", { method: "POST", body: JSON.stringify(data) });
}

async function updateProduct(id, data) {
  return apiFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

async function deleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}

async function adjustProductQuantity(id, delta) {
  return apiFetch(`/products/${id}/adjust_quantity?delta=${delta}`, { method: "PATCH" });
}

async function listCategories() { return apiFetch("/categories"); }
async function addCategory(data) { return apiFetch("/categories", { method: "POST", body: JSON.stringify(data) }); }
async function updateCategory(id, data) { return apiFetch(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }); }
async function deleteCategory(id) { return apiFetch(`/categories/${id}`, { method: "DELETE" }); }

async function listTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/transactions${q ? `?${q}` : ""}`);
}

async function createTransaction(items) {
  return apiFetch("/transactions", { method: "POST", body: JSON.stringify({ items }) });
}

async function getAnalyticsSummary() { return apiFetch("/transactions/analytics/summary"); }

function renderProducts(products) {
  const container = document.getElementById("productsList");
  container.className = "list";
  container.innerHTML = products.map(p => `
    <div class="card">
      <h3>${p.name}</h3>
      <div>Price: ${p.price.toFixed(2)}</div>
      <div>Qty: ${p.quantity}</div>
      <div>Category: ${p.category_id ?? ""}</div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="primary" data-edit="${p.id}">Edit</button>
        <button data-delete="${p.id}">Delete</button>
        <button data-inc="${p.id}">+1</button>
        <button data-dec="${p.id}">-1</button>
      </div>
    </div>
  `).join("");
}

function renderCategories(categories) {
  const container = document.getElementById("categoriesList");
  container.className = "list";
  container.innerHTML = categories.map(c => `
    <div class="card">
      <h3>${c.name}</h3>
      <div>${c.description || ""}</div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="primary" data-edit-cat="${c.id}">Edit</button>
        <button data-delete-cat="${c.id}">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderTransactions(transactions) {
  const container = document.getElementById("transactionsList");
  container.className = "list";
  container.innerHTML = transactions.map(t => `
    <div class="card">
      <h3>Transaction #${t.id}</h3>
      <div>Total: ${t.total_amount.toFixed(2)}</div>
      <ul>${(t.items || []).map(i => `<li>${i.quantity} × ${i.product_id} @ ${i.unit_price}</li>`).join("")}</ul>
    </div>
  `).join("");
}

function renderAnalytics(summary) {
  const container = document.getElementById("analyticsSummary");
  container.innerHTML = `
    <div class="card">
      <div>Total Sales: ${Number(summary.total_sales || 0).toFixed(2)}</div>
      <div>Total Transactions: ${summary.total_transactions}</div>
      <div>Top Products:</div>
      <ul>${(summary.top_products || []).map(p => `<li>${p.name}: ${p.quantity}</li>`).join("")}</ul>
    </div>
  `;
}

function openModal(html, onConfirm) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");
  body.innerHTML = html;
  modal.classList.remove("hidden");
  const confirm = document.getElementById("modalConfirm");
  const cancel = document.getElementById("modalCancel");
  const cleanup = () => modal.classList.add("hidden");
  cancel.onclick = cleanup;
  confirm.onclick = async () => {
    try { await onConfirm(); cleanup(); } catch (e) { showToast(e.message); }
  };
}

async function initAfterAuth() {
  try { await getMe(); } catch { return; }
  document.getElementById("login").classList.add("hidden");
  await refreshProducts();
  await refreshCategories();
  await refreshTransactions();
  await refreshAnalytics();
}

async function refreshProducts() {
  showLoader(true);
  try {
    const q = document.getElementById("search").value;
    const products = await listProducts(q ? { q } : {});
    renderProducts(products);
  } catch (e) { showToast(e.message); }
  showLoader(false);
}

async function refreshCategories() {
  showLoader(true);
  try { renderCategories(await listCategories()); } catch (e) { showToast(e.message); }
  showLoader(false);
}

async function refreshTransactions() {
  showLoader(true);
  try { renderTransactions(await listTransactions()); } catch (e) { showToast(e.message); }
  showLoader(false);
}

async function refreshAnalytics() {
  showLoader(true);
  try { renderAnalytics(await getAnalyticsSummary()); } catch (e) { showToast(e.message); }
  showLoader(false);
}

function switchPanel(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("nav button[data-nav]").forEach(btn => btn.addEventListener("click", () => switchPanel(btn.dataset.nav)));
  document.getElementById("refreshProducts").addEventListener("click", refreshProducts);
  document.getElementById("openProductModal").addEventListener("click", () => {
    openModal(`
      <h3>Add Product</h3>
      <input id="pName" placeholder="Name" />
      <input id="pPrice" type="number" step="0.01" placeholder="Price" />
      <input id="pQty" type="number" placeholder="Qty" />
      <input id="pCat" type="number" placeholder="Category ID" />
    `, async () => {
      const data = {
        name: document.getElementById("pName").value,
        price: Number(document.getElementById("pPrice").value),
        quantity: Number(document.getElementById("pQty").value || 0),
        category_id: Number(document.getElementById("pCat").value || null) || null,
      };
      await addProduct(data);
      showToast("Product added");
      await refreshProducts();
    });
  });
  document.getElementById("openCategoryModal").addEventListener("click", () => {
    openModal(`
      <h3>Add Category</h3>
      <input id="cName" placeholder="Name" />
      <input id="cDesc" placeholder="Description" />
    `, async () => {
      await addCategory({ name: document.getElementById("cName").value, description: document.getElementById("cDesc").value });
      showToast("Category added");
      await refreshCategories();
    });
  });
  document.getElementById("openTransactionModal").addEventListener("click", () => {
    openModal(`
      <h3>Create Transaction</h3>
      <textarea id="tItems" placeholder='Items JSON, e.g. [{"product_id":1,"quantity":2}]' style="width:100%;height:120px;"></textarea>
    `, async () => {
      const items = JSON.parse(document.getElementById("tItems").value || "[]");
      await createTransaction(items);
      showToast("Transaction created");
      await refreshTransactions();
      await refreshProducts();
      await refreshAnalytics();
    });
  });

  document.getElementById("productsList").addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-edit") || e.target.getAttribute("data-delete") || e.target.getAttribute("data-inc") || e.target.getAttribute("data-dec");
    if (!id) return;
    if (e.target.hasAttribute("data-delete")) {
      await deleteProduct(Number(id));
      showToast("Deleted");
      await refreshProducts();
      return;
    }
    if (e.target.hasAttribute("data-inc")) {
      await adjustProductQuantity(Number(id), 1);
      await refreshProducts();
      return;
    }
    if (e.target.hasAttribute("data-dec")) {
      await adjustProductQuantity(Number(id), -1);
      await refreshProducts();
      return;
    }
    const products = await listProducts();
    const p = products.find(x => x.id === Number(id));
    openModal(`
      <h3>Edit Product</h3>
      <input id="epName" value="${p.name}" />
      <input id="epPrice" type="number" step="0.01" value="${p.price}" />
      <input id="epQty" type="number" value="${p.quantity}" />
      <input id="epCat" type="number" value="${p.category_id || ""}" />
    `, async () => {
      const data = {
        name: document.getElementById("epName").value,
        price: Number(document.getElementById("epPrice").value),
        quantity: Number(document.getElementById("epQty").value),
        category_id: Number(document.getElementById("epCat").value || null) || null,
      };
      await updateProduct(Number(id), data);
      showToast("Updated");
      await refreshProducts();
    });
  });

  document.getElementById("categoriesList").addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-edit-cat") || e.target.getAttribute("data-delete-cat");
    if (!id) return;
    if (e.target.hasAttribute("data-delete-cat")) {
      await deleteCategory(Number(id));
      showToast("Deleted");
      await refreshCategories();
      return;
    }
    const cats = await listCategories();
    const c = cats.find(x => x.id === Number(id));
    openModal(`
      <h3>Edit Category</h3>
      <input id="ecName" value="${c.name}" />
      <input id="ecDesc" value="${c.description || ""}" />
    `, async () => {
      await updateCategory(Number(id), { name: document.getElementById("ecName").value, description: document.getElementById("ecDesc").value });
      showToast("Updated");
      await refreshCategories();
    });
  });

  document.getElementById("loginBtn").addEventListener("click", () => switchPanel("login"));
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("signupLink").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("signupForm").classList.toggle("hidden"); });
  document.getElementById("loginForm").addEventListener("submit", async (e) => { e.preventDefault(); try { await login(document.getElementById("loginEmail").value, document.getElementById("loginPassword").value); } catch (err) { showToast(err.message); } });
  document.getElementById("signupForm").addEventListener("submit", async (e) => { e.preventDefault(); try { await signup(document.getElementById("signupEmail").value, document.getElementById("signupPassword").value); showToast("Account created, please login"); } catch (err) { showToast(err.message); } });

  if (token) {
    document.getElementById("logoutBtn").classList.remove("hidden");
    document.getElementById("loginBtn").classList.add("hidden");
    initAfterAuth();
  } else {
    refreshProducts();
  }
});

// TODO add client-side form validation and better error handling

