class ModalEngine extends HTMLElement {
  #installerConfig = null;
  #isDragging = false;
  #offsetX = 0;
  #offsetY = 0;
  #currentPage = 0;
  #formDataStore = {};
  #modalOverlay = null;
  #modal = null;
  #modalHeader = null;
  #modalBody = null;
  #backBtn = null;
  #nextBtn = null;
  #installerForm = null;

  constructor() { super(); }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("style");
    stylesheet.textContent = `
      .modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4);
        display: none; align-items: center; justify-content: center; z-index: 1000;
      }
      .modal {
        width: 500px; background: #f0f0f0;
        border: 1px solid #a0a0a0;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4); position: fixed;
      }
      .modal-header {
        background: linear-gradient(to bottom, #0078d7, #005a9e);
        color: white; padding: 10px; font-weight: 600;
        cursor: move; user-select: none;
        font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 14px;
      }
      .modal-body { padding: 20px; background: #f0f0f0; font-family: 'Segoe UI', Tahoma, sans-serif; }
      .form-group { margin-bottom: 12px; }
      .form-group label { display: inline-block; font-size: 13px; margin-bottom: 4px; color: #222; }
      .form-group img { height: 100%; width: 100%; object-fit: contain; }
      .form-group input, .form-group select, .form-group textarea {
        width: 100%; padding: 6px; font-size: 13px;
        border: 1px solid #b5b5b5; border-radius: 2px;
        box-sizing: border-box; background: #fff; color: #222;
        font-family: 'Segoe UI', Tahoma, sans-serif;
      }
      textarea { resize: vertical; height: 60px; }
      .modal-footer {
        background: #f0f0f0; padding: 10px; text-align: right;
        border-top: 1px solid #d0d0d0;
      }
      .btn {
        min-width: 75px; padding: 6px 12px; font-size: 13px;
        border: 1px solid #8c8c8c;
        background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
        cursor: pointer; margin-left: 6px; color: #222;
        font-family: 'Segoe UI', Tahoma, sans-serif;
      }
      .btn:hover { background: linear-gradient(to bottom, #e0e0e0, #f0f0f0); }
      .btn-primary {
        border: 1px solid #0b5ed7;
        background: linear-gradient(to bottom, #4da3ff, #0078d7); color: white;
      }
      .btn-primary:hover { background: linear-gradient(to bottom, #66b3ff, #006cc1); }
      .tooltip { position: relative; display: inline-block; border-bottom: 1px dotted black; cursor: pointer; }
      .tooltiptext {
        visibility: hidden; width: 130px; background-color: black; color: #fff;
        text-align: center; font-size: 14px; border-radius: 6px; padding: 5px;
        margin-left: 5px; position: absolute; z-index: 1;
      }
      .tooltip:hover + .tooltiptext { visibility: visible; }
    `;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("div");
    modal.className = "modal";
    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";
    const form = document.createElement("form");
    form.method = "POST";
    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";
    const modalFooter = document.createElement("div");
    modalFooter.className = "modal-footer";
    const closeButton = document.createElement("button");
    closeButton.type = "button"; closeButton.className = "btn"; closeButton.textContent = "Close";
    const backButton = document.createElement("button");
    backButton.type = "button"; backButton.className = "btn"; backButton.textContent = "Back";
    const nextButton = document.createElement("button");
    nextButton.type = "button"; nextButton.className = "btn btn-primary"; nextButton.textContent = "Next";

    modalFooter.append(closeButton, backButton, nextButton);
    form.append(modalBody);
    modal.append(modalHeader, form, modalFooter);
    overlay.append(modal);
    shadow.append(stylesheet, overlay);

    this.#modalOverlay = overlay; this.#modal = modal; this.#modalHeader = modalHeader;
    this.#modalBody = modalBody; this.#backBtn = backButton; this.#nextBtn = nextButton;
    this.#installerForm = form;

    closeButton.addEventListener("click", () => this.closeModalEngine());
    backButton.addEventListener("click", () => this.prevPage());
    nextButton.addEventListener("click", () => this.nextPage());

    modalHeader.addEventListener("mousedown", (e) => {
      const rect = this.#modal.getBoundingClientRect();
      this.#modal.style.left = rect.left + "px";
      this.#modal.style.top = rect.top + "px";
      this.#modal.style.transform = "none";
      this.#isDragging = true;
      this.#offsetX = e.clientX - rect.left;
      this.#offsetY = e.clientY - rect.top;
      document.body.style.userSelect = "none";
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.#isDragging) return;
      let newX = e.clientX - this.#offsetX;
      let newY = e.clientY - this.#offsetY;
      const maxX = window.innerWidth - this.#modal.offsetWidth;
      const maxY = window.innerHeight - this.#modal.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      this.#modal.style.left = newX + "px";
      this.#modal.style.top = newY + "px";
    });
    document.addEventListener("mouseup", () => {
      this.#isDragging = false;
      document.body.style.userSelect = "auto";
    });
  }

  async openModal(config) {
    this.#installerConfig = config;
    this.#modalOverlay.style.display = "flex";
    this.#installerForm.action = config.submitUrl;
    this.#modal.style.top = "50%";
    this.#modal.style.left = "50%";
    this.#modal.style.transform = "translate(-50%, -50%)";
    this.#currentPage = 0;
    this.#formDataStore = {};
    await this.renderPage();
  }

  closeModalEngine() { this.#modalOverlay.style.display = "none"; }

  // Normalise select options to { label: value } regardless of input shape.
  async #resolveOptions(optionsField) {
    const raw = typeof optionsField === "function" ? await optionsField() : optionsField;
    if (Array.isArray(raw)) return Object.fromEntries(raw.map(v => [v, v]));
    return raw; // already { label: value }
  }

  async renderPage() {
    const page = this.#installerConfig.pages[this.#currentPage];
    this.#modalHeader.textContent = `${this.#installerConfig.title} — ${page.title}`;
    this.#modalBody.innerHTML = "";
    for (const field of page.fields) {
      if (field.type === "pane") {
        this.#renderPane(field);
        continue;
      }
      const group = document.createElement("div");
      group.className = "form-group";
      const label = document.createElement("label");
      label.textContent = field.label || "";
      group.appendChild(label);
      if (field.tooltip) {
        const tooltip = document.createElement("span");
        label.classList.add("tooltip");
        tooltip.classList.add("tooltiptext");
        tooltip.textContent = field.tooltip;
        group.appendChild(tooltip);
      }
      let input;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
      } else if (field.type === "select") {
        input = document.createElement("select");
        const opts = await this.#resolveOptions(field.options);
        for (const [lbl, val] of Object.entries(opts)) {
          const option = document.createElement("option");
          option.value = val; option.textContent = lbl;
          input.appendChild(option);
        }
      } else if (field.type === "image") {
        input = document.createElement("img");
        input.src = field.src; input.alt = field.alt || "";
      } else {
        input = document.createElement("input");
        input.type = field.type || "text";
      }
      if (field.name) input.name = field.name;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.value) input.value = field.value;
      if (field.name && this.#formDataStore[field.name] !== undefined) {
        input.value = this.#formDataStore[field.name];
      }
      group.appendChild(input);
      this.#modalBody.appendChild(group);
    }
    this.#backBtn.style.display = this.#currentPage === 0 ? "none" : "inline-block";
    this.#nextBtn.textContent = this.#currentPage === this.#installerConfig.pages.length - 1 ? "Finish" : "Next";
  }

  // ── Pane field ─────────────────────────────────────────────────────────────
  // Renders a two-column picker: left = selectable items, right = checkboxes.
  // State is stored in this.#formDataStore[field.name] as { itemId: [checkedIds] }.
  //
  // options can be: { id, label }[]  — static array
  //                 async (item) => { id, label }[]  — callback, receives the clicked item
  // Both field.options and item.options support either form.
  // Resolved results are cached so a callback is only ever called once per item per open.
  async #renderPane(field) {
    // Seed state: start from saved formDataStore, fall back to field.checked, fall back to empty.
    const state = this.#formDataStore[field.name]
      ? JSON.parse(this.#formDataStore[field.name])
      : JSON.parse(JSON.stringify(field.checked || {}));

    // Ensure every item has an entry so unchecked items still appear in payload.
    field.items.forEach(item => { if (!state[item.id]) state[item.id] = []; });

    let selectedItemId = field.items[0]?.id ?? null;

    // Cache of resolved options per item id — avoids re-fetching on re-click.
    const optionsCache = {};

    // Resolves the options for a given item, using cache if available.
    const resolveItemOptions = async (item) => {
      if (optionsCache[item.id]) return optionsCache[item.id];
      const raw = item.options ?? field.options ?? [];
      const resolved = typeof raw === "function" ? await raw(item) : raw;
      optionsCache[item.id] = resolved;
      return resolved;
    };

    // ── Outer wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex; flex-direction:column; gap:4px;";

    // Optional label row
    if (field.label) {
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-size:13px; color:#222; margin-bottom:2px;";
      lbl.textContent = field.label;
      wrapper.appendChild(lbl);
    }

    // ── Column headers
    const headers = document.createElement("div");
    headers.style.cssText = "display:flex; gap:0; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.06em;";
    const leftHeader  = document.createElement("div");
    leftHeader.style.cssText  = "flex:0 0 40%; padding:4px 8px; background:#e0e0e0; border:1px solid #b5b5b5; border-bottom:none;";
    leftHeader.textContent = field.leftLabel || "Items";
    const rightHeader = document.createElement("div");
    rightHeader.style.cssText = "flex:1; padding:4px 8px; background:#e0e0e0; border:1px solid #b5b5b5; border-left:none; border-bottom:none;";
    rightHeader.textContent = field.rightLabel || "Options";
    headers.append(leftHeader, rightHeader);
    wrapper.appendChild(headers);

    // ── Two-panel body
    const body = document.createElement("div");
    body.style.cssText = "display:flex; gap:0; border:1px solid #b5b5b5; background:#fff; height:160px;";

    const leftPanel  = document.createElement("div");
    leftPanel.style.cssText = "flex:0 0 40%; overflow-y:auto; border-right:1px solid #d0d0d0;";

    const rightPanel = document.createElement("div");
    rightPanel.style.cssText = "flex:1; overflow-y:auto; padding:6px 8px;";

    // Hidden sentinel that holds serialised state for saveCurrentPageData()
    const sentinel = document.createElement("input");
    sentinel.type = "hidden";
    sentinel.name = field.name;

    const syncSentinel = () => { sentinel.value = JSON.stringify(state); };
    syncSentinel();

    // Renders the right panel for the given item. Awaits callback resolution if needed.
    const renderRight = async (item) => {
      rightPanel.innerHTML = "";

      // Show a loading indicator while an async callback resolves.
      const loading = document.createElement("div");
      loading.style.cssText = "font-size:12px; color:#888; padding:6px 0;";
      loading.textContent = "Loading…";
      rightPanel.appendChild(loading);

      const opts = await resolveItemOptions(item);

      rightPanel.innerHTML = "";
      opts.forEach(opt => {
        const row = document.createElement("label");
        row.style.cssText = "display:flex; align-items:center; gap:6px; font-size:12px; padding:3px 0; cursor:pointer; color:#222;";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = opt.id;
        cb.checked = state[item.id]?.includes(opt.id) ?? false;
        cb.addEventListener("change", () => {
          if (cb.checked) {
            if (!state[item.id].includes(opt.id)) state[item.id].push(opt.id);
          } else {
            state[item.id] = state[item.id].filter(id => id !== opt.id);
          }
          syncSentinel();
        });
        row.append(cb, document.createTextNode(opt.label));
        rightPanel.appendChild(row);
      });
    };

    // Renders all left-panel rows, highlighting the active one.
    // Click handler is async to support awaiting renderRight.
    const renderLeft = () => {
      leftPanel.innerHTML = "";
      field.items.forEach(item => {
        const row = document.createElement("div");
        const isActive = item.id === selectedItemId;
        row.style.cssText = `padding:6px 10px; font-size:12px; cursor:pointer; color:#222;
          background:${isActive ? "#cce4f7" : "transparent"};
          border-left:3px solid ${isActive ? "#0078d7" : "transparent"};`;
        row.textContent = item.label;
        row.addEventListener("click", async () => {
          selectedItemId = item.id;
          renderLeft();
          await renderRight(item);
        });
        leftPanel.appendChild(row);
      });
    };

    renderLeft();
    const firstItem = field.items.find(i => i.id === selectedItemId);
    if (firstItem) await renderRight(firstItem);

    body.append(leftPanel, rightPanel);
    wrapper.append(body, sentinel);
    this.#modalBody.appendChild(wrapper);
  }

  saveCurrentPageData() {
    const inputs = this.#modalBody.querySelectorAll("input, select, textarea");
    inputs.forEach(input => { if (input.name) this.#formDataStore[input.name] = input.value; });
  }

  async nextPage() {
    this.saveCurrentPageData();
    if (this.#currentPage < this.#installerConfig.pages.length - 1) {
      this.#currentPage++; await this.renderPage();
    } else { this.submitForm(); }
  }

  async prevPage() {
    this.saveCurrentPageData();
    if (this.#currentPage > 0) { this.#currentPage--; await this.renderPage(); }
  }

  getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      for (const cookie of document.cookie.split(";")) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(trimmed.slice(name.length + 1)); break;
        }
      }
    }
    return cookieValue;
  }

  removeHiddenInputs() {
    this.#installerForm.querySelectorAll('input[type="hidden"]').forEach(el => el.remove());
  }

  async submitForm() {
    this.removeHiddenInputs();
    for (const [key, value] of Object.entries(this.#formDataStore)) {
      const hidden = document.createElement("input");
      hidden.type = "hidden"; hidden.name = key; hidden.value = value;
      this.#installerForm.appendChild(hidden);
    }
    const formData = new FormData(this.#installerForm);
    const formDataJson = Object.fromEntries(formData.entries());
    const csrfToken = this.getCookie("csrftoken");
    let response = null;
    if (this.#installerConfig.onSubmit) {
      response = await this.#installerConfig.onSubmit(this.#installerConfig, formDataJson);
    } else {
      response = await fetch(this.#installerConfig.submitUrl, {
        method: this.#installerConfig.method || "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json; charset=UTF-8", ...(csrfToken && { "X-CSRFToken": csrfToken }) },
        body: JSON.stringify(formDataJson),
      });
    }
    if (response.ok) {
      this.closeModalEngine();
      if (this.#installerConfig.onSuccess) this.#installerConfig.onSuccess(this.#installerConfig, formDataJson);
    } else {
      if (this.#installerConfig.onFailure) this.#installerConfig.onFailure(this.#installerConfig, formDataJson);
      else alert("Failed to submit form.");
    }
  }
}
customElements.define("procedural-modal", ModalEngine);

class RuntimeModal {
  #privateModals = [];
  #component;
  constructor() {
    this.#component = document.createElement("procedural-modal");
    document.body.appendChild(this.#component);
  }
  registerModals(modals) { this.#privateModals.push(...modals); }
  openModal(modalName) {
    const config = this.#privateModals.find(m => m.modalName === modalName);
    if (!config) { console.error("Modal not found:", modalName); return; }
    this.#component.openModal(config);
  }
}
