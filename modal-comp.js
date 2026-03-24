class ProceduralModal extends HTMLElement {

  #installerConfig = null;
  #isDragging = false;
  #offsetX = 0;
  #offsetY = 0;
  #currentPage = 0;
  #formDataStore = {};

  // Assigned in connectedCallback after elements are created
  #modalOverlay = null;
  #modal = null;
  #modalHeader = null;
  #modalBody = null;
  #backBtn = null;
  #nextBtn = null;
  #installerForm = null;

  constructor() {
    super();
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    // ── Stylesheet ──────────────────────────────────────────────────────────
    const stylesheet = document.createElement("style");
    stylesheet.textContent = `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        width: 500px;
        background: #f0f0f0;
        border: 1px solid #a0a0a0;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        position: fixed;
      }

      .modal-header {
        background: linear-gradient(to bottom, #0078d7, #005a9e);
        color: white;
        padding: 10px;
        font-weight: 600;
        cursor: move;
        user-select: none;
      }

      .modal-body {
        padding: 20px;
        background: var(--modal-primary);
      }

      .form-group {
        margin-bottom: 12px;
      }

      .form-group label {
        display: inline-block;
        font-size: 13px;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .form-group img {
        height: 100%;
        width: 100%;
        object-fit: contain;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 6px;
        font-size: 13px;
        border: 1px solid #b5b5b5;
        border-radius: 2px;
        box-sizing: border-box;
        background: var(--modal-secondary);
        color: var(--text-secondary);
      }

      textarea {
        resize: vertical;
        height: 60px;
      }

      .modal-footer {
        background: var(--modal-primary);
        padding: 10px;
        text-align: right;
        border-top: 1px solid #d0d0d0;
      }

      .btn {
        min-width: 75px;
        padding: 6px 12px;
        font-size: 13px;
        border: 1px solid #8c8c8c;
        background: linear-gradient(to bottom, var(--modal-primary), var(--modal-secondary));
        cursor: pointer;
        margin-left: 6px;
        color: var(--text-primary);
      }

      .btn:hover {
        background: linear-gradient(to bottom, var(--modal-secondary), var(--modal-primary));
      }

      .btn-primary {
        border: 1px solid #0b5ed7;
        background: linear-gradient(to bottom, #4da3ff, #0078d7);
        color: white;
      }

      .btn-primary:hover {
        background: linear-gradient(to bottom, #66b3ff, #006cc1);
      }

      .tooltip {
        position: relative;
        display: inline-block;
        border-bottom: 1px dotted black;
        cursor: pointer;
      }

      .tooltiptext {
        visibility: hidden;
        width: 130px;
        background-color: black;
        color: #ffffff;
        text-align: center;
        font-size: 14px;
        border-radius: 6px;
        padding: 5px;
        margin-left: 5px;
        position: absolute;
        z-index: 1;
      }

      .tooltip:hover + .tooltiptext {
        visibility: visible;
      }
    `;

    // ── DOM Structure ───────────────────────────────────────────────────────
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
    closeButton.type = "button";
    closeButton.className = "btn";
    closeButton.textContent = "Close";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "btn";
    backButton.textContent = "Back";

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "btn btn-primary";
    nextButton.textContent = "Next";

    // ── Assemble ────────────────────────────────────────────────────────────
    modalFooter.append(closeButton, backButton, nextButton);
    form.append(modalBody);
    modal.append(modalHeader, form, modalFooter);
    overlay.append(modal);

    shadow.append(stylesheet, overlay);

    // ── Store references (AFTER elements exist) ─────────────────────────────
    this.#modalOverlay = overlay;
    this.#modal = modal;
    this.#modalHeader = modalHeader;
    this.#modalBody = modalBody;
    this.#backBtn = backButton;
    this.#nextBtn = nextButton;
    this.#installerForm = form;

    // ── Button handlers (addEventListener, not onclick attributes) ──────────
    closeButton.addEventListener("click", () => this.closeProceduralModal());
    backButton.addEventListener("click", () => this.prevPage());
    nextButton.addEventListener("click", () => this.nextPage());

    // ── Dragging ────────────────────────────────────────────────────────────
    modalHeader.addEventListener("mousedown", (e) => {
      const rect = this.#modal.getBoundingClientRect();

      this.#modal.style.left = rect.left + "px";
      this.#modal.style.top = rect.top + "px";
      this.#modal.style.transform = "none";

      this.#isDragging = true;
      this.#offsetX = e.clientX - rect.left;  // this.#offsetX, not bare offsetX
      this.#offsetY = e.clientY - rect.top;

      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.#isDragging) return;

      let newX = e.clientX - this.#offsetX;   // fixed: was bare offsetX
      let newY = e.clientY - this.#offsetY;   // fixed: was bare offsetY

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

  // ── Modal Control ─────────────────────────────────────────────────────────

  openModal(config) {                          // fixed: must accept config
    this.#installerConfig = config;            // fixed: store it

    this.#modalOverlay.style.display = "flex";
    this.#installerForm.action = config.submitUrl;

    this.#modal.style.top = "50%";
    this.#modal.style.left = "50%";
    this.#modal.style.transform = "translate(-50%, -50%)";

    this.#currentPage = 0;
    this.#formDataStore = {};

    this.renderPage();                         // fixed: this.renderPage()
  }

  closeProceduralModal() {
    this.#modalOverlay.style.display = "none";
  }

  // ── Page Rendering ────────────────────────────────────────────────────────

  renderPage() {
    const page = this.#installerConfig.pages[this.#currentPage];
    this.#modalHeader.textContent =
      `${this.#installerConfig.title} - ${page.title}`;
    this.#modalBody.innerHTML = "";

    page.fields.forEach(field => {
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
        field.options.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
      } else if (field.type === "image") {
        input = document.createElement("img");
        input.src = field.src;
        input.alt = field.alt || "";
      } else {
        input = document.createElement("input");
        input.type = field.type || "text";
      }

      if (field.name) input.name = field.name;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.value) input.value = field.value;

      // Restore saved value (takes priority over default)
      if (field.name && this.#formDataStore[field.name] !== undefined) {
        input.value = this.#formDataStore[field.name];
      }

      group.appendChild(input);
      this.#modalBody.appendChild(group);
    });

    this.#backBtn.style.display =
      this.#currentPage === 0 ? "none" : "inline-block";

    this.#nextBtn.textContent =
      this.#currentPage === this.#installerConfig.pages.length - 1
        ? "Finish"
        : "Next";
  }

  // ── Save Current Page ─────────────────────────────────────────────────────

  saveCurrentPageData() {
    const inputs =
      this.#modalBody.querySelectorAll("input, select, textarea");
    inputs.forEach(input => {
      if (input.name) {
        this.#formDataStore[input.name] = input.value;
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  nextPage() {
    this.saveCurrentPageData();              // fixed: this.saveCurrentPageData()

    if (this.#currentPage < this.#installerConfig.pages.length - 1) {
      this.#currentPage++;
      this.renderPage();
    } else {
      this.submitForm();
    }
  }

  prevPage() {
    this.saveCurrentPageData();
    if (this.#currentPage > 0) {
      this.#currentPage--;
      this.renderPage();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      for (const cookie of document.cookie.split(";")) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(trimmed.slice(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  removeHiddenInputs() {
    // fixed: no space in selector; scoped to form not document
    this.#installerForm
      .querySelectorAll('input[type="hidden"]')
      .forEach(el => el.remove());
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async submitForm() {
    this.removeHiddenInputs();

    for (const [key, value] of Object.entries(this.#formDataStore)) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = key;
      hidden.value = value;
      this.#installerForm.appendChild(hidden);
    }

    const formData = new FormData(this.#installerForm);
    const formDataJson = Object.fromEntries(formData.entries());
    const csrfToken = this.getCookie("csrftoken");

    let response = null;

    // Use custom submission handler if defined.
    if (this.#installerConfig.onSubmit) { 
      response = await this.#installerConfig.onSubmit(this.#installerConfig, formDataJson);
    } else {
      response = await fetch(this.#installerConfig.submitUrl, {
        method: this.#installerConfig.method || "POST",
        mode: "same-origin",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          ...(csrfToken && { "X-CSRFToken": csrfToken }),
        },
        body: JSON.stringify(formDataJson),
      });
    }

    if (response.ok) {
      this.closeProceduralModal();
      if (this.#installerConfig.onSuccess) this.#installerConfig.onSuccess(this.#installerConfig, formDataJson);
    } else {
      if (this.#installerConfig.onFailure) this.#installerConfig.onFailure(this.#installerConfig, formDataJson);
      alert("Failed to submit form.");
    }
  }
}

customElements.define("procedural-modal", ProceduralModal);

// ── RuntimeModal ──────────────────────────────────────────────────────────────

class RuntimeModal {
  #privateModals = [];
  #component;                                // fixed: store reference to element

  constructor() {
    this.#component = document.createElement("procedural-modal");
    document.body.appendChild(this.#component);
  }

  registerModals(modals) {
    this.#privateModals.push(...modals);     // cleaner than forEach+push
  }

  openModal(modalName) {
    const config = this.#privateModals.find(m => m.modalName === modalName);

    if (!config) {
      console.error("Modal not found:", modalName);
      return;
    }

    this.#component.openModal(config);       // fixed: call on stored component ref
  }
}
