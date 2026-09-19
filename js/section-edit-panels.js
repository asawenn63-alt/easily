/**
 * SectionEditPanels — redigeringspanel per sektion direkt på sidan.
 */
(function (global) {
  "use strict";

  const SECTION_DISPLAY = {
    hero: "HERO",
    about: "OM OSS",
    services: "TJÄNSTER",
    gallery: "BILDER",
    faq: "VANLIGA FRÅGOR",
    booking: "BOKNING",
    contact: "KONTAKT",
    footer: "SIDFOT",
  };

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inStudioEditor() {
    try {
      return document.body && document.body.getAttribute("data-studio-mode") !== "readonly";
    } catch (e) {
      return false;
    }
  }

  function displayLabel(id) {
    return SECTION_DISPLAY[id] || String(id || "").toUpperCase();
  }

  function isFoodIndustry(page) {
    const ind = String((page && page.industry) || "").trim();
    const area = String((page && page.area) || "").trim();
    return ind === "cafe" || ind === "restaurang" || area === "food";
  }

  function normSocialUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "#";
    const lower = u.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
    if (!/^https?:\/\//i.test(u)) {
      if (/^www\./i.test(u)) u = "https://" + u;
      else if (/^[a-z0-9.-]+\.[a-z]{2,}\/?/i.test(u)) u = "https://" + u.replace(/^\/+/, "");
    }
    return u;
  }

  function fieldRow(label, id, value, placeholder) {
    return `<label class="section-edit__field">
      <span class="section-edit__field-label">${esc(label)}</span>
      <input type="url" class="section-edit__input" id="${esc(id)}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" />
    </label>`;
  }

  function actionMenu(items) {
    if (!items.length) return "";
    return `<ul class="section-edit__menu" role="menu">
      ${items
        .map((item) => {
          const parts = [`data-section-action="${esc(item.action)}"`];
          if (item.section) parts.push(`data-section-target="${esc(item.section)}"`);
          if (item.editable) parts.push(`data-editable-key="${esc(item.editable)}"`);
          if (item.linkWhich) parts.push(`data-link-which="${esc(item.linkWhich)}"`);
          return `<li role="none"><button type="button" class="section-edit__menu-item" role="menuitem" ${parts.join(" ")}>${esc(item.label)}</button></li>`;
        })
        .join("")}
    </ul>`;
  }

  function heroPanel(page) {
    const lay = page.heroLayout || "center";
    const layouts = [
      ["center", "Centrerad"],
      ["left", "Vänster"],
      ["split", "Bild + text"],
    ];
    const layoutBtns = layouts
      .map(
        ([id, label]) =>
          `<button type="button" class="section-edit__chip${lay === id ? " is-active" : ""}" data-hero-layout-pick="${id}">${esc(label)}</button>`
      )
      .join("");
    return `${actionMenu([
      { label: "Ändra rubrik", action: "focus", section: "hero", editable: "hero-title" },
      { label: "Ändra underrubrik", action: "focus", section: "hero", editable: "hero-lead" },
      { label: "Byt bild", action: "hero-bg" },
      { label: "Ändra knapptext", action: "focus", section: "hero", editable: "hero-cta-1-text" },
      { label: "Ändra knapplänk", action: "hero-link", linkWhich: "1" },
    ])}
      <div class="section-edit__group">
        <span class="section-edit__group-label">Placering</span>
        <div class="section-edit__chips">${layoutBtns}</div>
      </div>
      <div class="section-edit__actions">
        <button type="button" class="section-edit__btn section-edit__btn--ai" data-ai="section" data-ai-target="hero">✦ Byt upplägg</button>
      </div>`;
  }

  function aboutPanel() {
    return `${actionMenu([
      { label: "Ändra rubrik", action: "focus", section: "about", editable: "about-title" },
      { label: "Ändra text", action: "focus", section: "about", editable: "about-p1" },
      { label: "Byt bild", action: "about-image" },
    ])}
      <div class="section-edit__actions">
        <button type="button" class="section-edit__btn section-edit__btn--ai" data-ai="section" data-ai-target="about">✦ Generera om oss</button>
      </div>`;
  }

  function servicesPanel() {
    return `${actionMenu([
      { label: "Ändra tjänstekort", action: "focus", section: "services", editable: "card-0-title" },
      { label: "Lägg till tjänst", action: "add-service" },
      { label: "Ta bort tjänst", action: "remove-service" },
    ])}
      <div class="section-edit__actions">
        <button type="button" class="section-edit__btn section-edit__btn--ai" data-ai="section" data-ai-target="services">✦ Föreslå innehåll</button>
      </div>`;
  }

  function galleryPanel() {
    return `${actionMenu([
      { label: "Byt bilder", action: "gallery-first" },
      { label: "Lägg till bild", action: "add-gallery" },
      { label: "Ta bort bild", action: "remove-gallery" },
    ])}
      <div class="section-edit__actions">
        <button type="button" class="section-edit__btn section-edit__btn--ai" data-ai="section" data-ai-target="gallery">✦ Generera rubriker</button>
      </div>`;
  }

  function faqPanel() {
    return `${actionMenu([
      { label: "Ändra rubrik", action: "focus", section: "faq", editable: "faq-title" },
      { label: "Ändra frågor", action: "focus", section: "faq", editable: "faq-0-q" },
    ])}
      <div class="section-edit__actions">
        <button type="button" class="section-edit__btn section-edit__btn--ai" data-ai="section" data-ai-target="faq">✦ Generera frågor</button>
      </div>`;
  }

  function bookingPanel(page) {
    const bookingUrl = page.bookingUrl || "";
    let orderBlock = "";
    if (isFoodIndustry(page)) {
      orderBlock = `<div class="section-edit__group">
        <span class="section-edit__group-label">Beställ &amp; hämta</span>
        ${fieldRow("Foodora", "section-order-foodora", page.foodoraUrl, "foodora.com/sv/restaurant/…")}
        ${fieldRow("Wolt", "section-order-wolt", page.woltUrl, "wolt.com/sv/swe/restaurant/…")}
        ${fieldRow("Beställ & hämta", "section-order-pickup", page.pickupUrl, "Er egen beställningslänk")}
        <button type="button" class="section-edit__btn section-edit__btn--primary" data-section-save="order">Spara beställningslänkar</button>
      </div>`;
    }
    return `${actionMenu([
      { label: "Ändra rubrik", action: "focus", section: "booking", editable: "booking-title" },
      { label: "Ändra text", action: "focus", section: "booking", editable: "booking-lead" },
      { label: "Lägg in bokningslänk", action: "focus-booking-url" },
    ])}
      <div class="section-edit__group">
        <span class="section-edit__group-label">Bokningslänk</span>
        ${fieldRow("Bokningslänk", "section-booking-url", bookingUrl, "Bokadirekt, Calendly, Cal.com…")}
        <button type="button" class="section-edit__btn section-edit__btn--primary" data-section-save="booking">Spara bokning</button>
      </div>
      ${orderBlock}`;
  }

  function contactPanel() {
    return `${actionMenu([
      { label: "Ändra telefon", action: "focus", section: "contact", editable: "contact-phone" },
      { label: "Ändra e-post", action: "focus", section: "contact", editable: "contact-email" },
      { label: "Ändra adress", action: "focus", section: "contact", editable: "contact-address" },
      { label: "Ändra sociala länkar", action: "open-social" },
    ])}`;
  }

  function footerPanel(sec) {
    const c = sec.content || {};
    return `<p class="section-edit__tip">Företagsnamnet redigeras i raden ovanför hero.</p>
      <div class="section-edit__group">
        <span class="section-edit__group-label">Sociala medier</span>
        ${fieldRow("Facebook", "section-social-1", c["footer-social-1-href"], "facebook.com/…")}
        ${fieldRow("Instagram", "section-social-2", c["footer-social-2-href"], "instagram.com/…")}
        ${fieldRow("LinkedIn", "section-social-3", c["footer-social-3-href"], "linkedin.com/…")}
        <button type="button" class="section-edit__btn section-edit__btn--primary" data-section-save="social">Spara länkar</button>
      </div>`;
  }

  function panelBody(id, page, sec) {
    switch (id) {
      case "hero":
        return heroPanel(page);
      case "about":
        return aboutPanel();
      case "services":
        return servicesPanel();
      case "gallery":
        return galleryPanel();
      case "faq":
        return faqPanel();
      case "booking":
        return bookingPanel(page);
      case "contact":
        return contactPanel();
      case "footer":
        return footerPanel(sec);
      default:
        return `<p class="section-edit__tip">Klicka på text i sektionen.</p>`;
    }
  }

  function render(id, page, sec) {
    if (!inStudioEditor()) return "";
    const label = displayLabel(id);
    const body = panelBody(id, page || {}, sec || {});
    return `<aside class="section-edit" data-section-edit="${esc(id)}" aria-label="${esc(label)} — Redigera">
  <button type="button" class="section-edit__bar" data-section-edit-toggle aria-expanded="false" aria-controls="section-edit-panel-${esc(id)}">
    <span class="section-edit__label">${esc(label)} — Redigera</span>
    <span class="section-edit__chev" aria-hidden="true">▾</span>
  </button>
  <div class="section-edit__panel" id="section-edit-panel-${esc(id)}" hidden>
    ${body}
    <div class="section-edit__footer">
      <button type="button" class="section-edit__btn section-edit__btn--ghost" data-section-hide-toggle>Dölj sektion</button>
    </div>
  </div>
</aside>`;
  }

  function closeAllPanels(except) {
    document.querySelectorAll("[data-section-edit-toggle]").forEach((btn) => {
      if (except && btn === except) return;
      btn.setAttribute("aria-expanded", "false");
      const panel = btn.closest("[data-section-edit]")?.querySelector(".section-edit__panel");
      if (panel) panel.hidden = true;
    });
  }

  function syncPanelFields(wrap) {
    if (!wrap) return;
    const id = wrap.getAttribute("data-section-edit");
    const doc = global.SiteState?.get?.();
    if (!doc) return;
    const page = doc.page || {};
    const sec = doc.sections?.[id] || {};
    const c = sec.content || {};

    const bookingIn = wrap.querySelector("#section-booking-url");
    if (bookingIn) bookingIn.value = page.bookingUrl || "";

    const foodoraIn = wrap.querySelector("#section-order-foodora");
    const woltIn = wrap.querySelector("#section-order-wolt");
    const pickupIn = wrap.querySelector("#section-order-pickup");
    if (foodoraIn) foodoraIn.value = page.foodoraUrl || "";
    if (woltIn) woltIn.value = page.woltUrl || "";
    if (pickupIn) pickupIn.value = page.pickupUrl || "";

    const s1 = wrap.querySelector("#section-social-1");
    const s2 = wrap.querySelector("#section-social-2");
    const s3 = wrap.querySelector("#section-social-3");
    if (s1) s1.value = c["footer-social-1-href"] === "#" ? "" : c["footer-social-1-href"] || "";
    if (s2) s2.value = c["footer-social-2-href"] === "#" ? "" : c["footer-social-2-href"] || "";
    if (s3) s3.value = c["footer-social-3-href"] === "#" ? "" : c["footer-social-3-href"] || "";

    if (id === "hero") {
      const lay = page.heroLayout || "center";
      wrap.querySelectorAll("[data-hero-layout-pick]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-hero-layout-pick") === lay);
      });
    }
  }

  function toast(msg, kind, ms) {
    if (typeof global.showStudioToast === "function") global.showStudioToast(msg, kind, ms);
  }

  function sectionRoot(mainEl, footerEl, sectionId) {
    if (sectionId === "footer") return footerEl;
    return mainEl?.querySelector(`[data-section="${sectionId}"]`);
  }

  function focusEditable(mainEl, footerEl, sectionId, key) {
    const root = sectionRoot(mainEl, footerEl, sectionId);
    const el = root?.querySelector(`[data-editable="${key}"]`);
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = global.getSelection?.();
      sel?.removeAllRanges?.();
      sel?.addRange?.(range);
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  function openFooterSocial(mainEl, footerEl) {
    const footBtn = footerEl?.querySelector("[data-section-edit-toggle]");
    if (footBtn) {
      closeAllPanels();
      footBtn.setAttribute("aria-expanded", "true");
      const panel = footBtn.closest("[data-section-edit]")?.querySelector(".section-edit__panel");
      if (panel) panel.hidden = false;
      syncPanelFields(footBtn.closest("[data-section-edit]"));
    }
    footerEl?.scrollIntoView({ block: "start", behavior: "smooth" });
    toast("Sociala länkar finns längst ner på sidan.", "info", 3200);
  }

  function handleSectionAction(btn, mainEl, footerEl, hooks) {
    const action = btn.getAttribute("data-section-action");
    if (!action) return;

    if (action === "focus") {
      const sectionId = btn.getAttribute("data-section-target");
      const key = btn.getAttribute("data-editable-key");
      focusEditable(mainEl, footerEl, sectionId, key);
      return;
    }

    if (action === "hero-bg") {
      const input = mainEl?.querySelector(".site-section--hero [data-hero-bg-input]");
      if (input) input.click();
      else toast("Klicka på bakgrundsbilden i hero-sektionen.", "info", 2800);
      return;
    }

    if (action === "about-image") {
      const input = mainEl?.querySelector('[data-section="about"] [data-replace-img]');
      if (input) input.click();
      else toast("Klicka på bilden i Om oss-sektionen.", "info", 2800);
      return;
    }

    if (action === "hero-link") {
      const which = btn.getAttribute("data-link-which") || "1";
      const key = `hero-cta-${which}-href`;
      const a = mainEl?.querySelector(`a[data-href-key="${key}"]`);
      if (a) {
        a.scrollIntoView({ block: "center", behavior: "smooth" });
        toast("Klicka på knappen (utanför texten) för att ändra länken.", "info", 3600);
      }
      return;
    }

    if (action === "focus-booking-url") {
      const wrap = btn.closest("[data-section-edit]");
      const input = wrap?.querySelector("#section-booking-url");
      if (input) {
        input.focus();
        input.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      return;
    }

    if (action === "add-service") {
      global.SiteState.patch((doc) => {
        doc.sections.services.cards = doc.sections.services.cards || [];
        doc.sections.services.cards.push({
          icon: "",
          title: "Ny tjänst",
          body: "Beskriv tjänsten här.",
          img: "https://picsum.photos/seed/new-card/640/400",
          intent: "services",
          ctaText: "Läs mer",
          ctaHref: "#tjanster",
        });
        doc.sections.services.hidden = false;
      });
      hooks?.onCommitHistory?.();
      global.EditorEngine?.remount?.();
      global.SiteState.save();
      toast("Nytt tjänstekort tillagt — redigera texten på sidan.", "success", 3200);
      return;
    }

    if (action === "remove-service") {
      let removed = false;
      global.SiteState.patch((doc) => {
        const cards = doc.sections?.services?.cards || [];
        if (cards.length <= 1) return;
        cards.pop();
        removed = true;
      });
      if (!removed) {
        toast("Minst ett tjänstekort måste finnas kvar.", "info", 2800);
        return;
      }
      hooks?.onCommitHistory?.();
      global.EditorEngine?.remount?.();
      global.SiteState.save();
      toast("Sista tjänstekortet borttaget.", "success", 2800);
      return;
    }

    if (action === "gallery-first") {
      const input = mainEl?.querySelector('[data-section="gallery"] [data-replace-img]');
      if (input) {
        input.closest(".gallery__item")?.scrollIntoView({ block: "center", behavior: "smooth" });
        input.click();
      }
      return;
    }

    if (action === "add-gallery") {
      const ISE = global.ImageSelectionEngine;
      const doc = global.SiteState.get();
      let newUrl = "";
      if (ISE && typeof ISE.pick === "function") {
        const gi = (doc && doc.sections && doc.sections.gallery && doc.sections.gallery.images
          ? doc.sections.gallery.images.length
          : 0);
        newUrl = ISE.pick(doc || { page: {} }, { section: "gallery", galleryIndex: gi, nonce: Date.now() });
      }
      global.SiteState.patch((doc) => {
        doc.sections.gallery.images = doc.sections.gallery.images || [];
        doc.sections.gallery.images.push(newUrl || "https://picsum.photos/seed/gallery-fallback/800/600");
        doc.sections.gallery.hidden = false;
      });
      hooks?.onCommitHistory?.();
      global.EditorEngine?.remount?.();
      global.SiteState.save();
      toast("Ny bild tillagd — klicka på den för att byta.", "success", 3200);
      return;
    }

    if (action === "remove-gallery") {
      let removed = false;
      global.SiteState.patch((doc) => {
        const imgs = doc.sections?.gallery?.images || [];
        if (imgs.length <= 1) return;
        imgs.pop();
        removed = true;
      });
      if (!removed) {
        toast("Minst en bild måste finnas kvar.", "info", 2800);
        return;
      }
      hooks?.onCommitHistory?.();
      global.EditorEngine?.remount?.();
      global.SiteState.save();
      toast("Sista bilden borttagen.", "success", 2800);
      return;
    }

    if (action === "open-social") {
      openFooterSocial(mainEl, footerEl);
    }
  }

  function saveBooking(wrap, hooks) {
    const raw = wrap.querySelector("#section-booking-url")?.value;
    if (!String(raw || "").trim()) {
      toast("Klistra in en bokningslänk först.", "info", 2800);
      return;
    }
    global.SiteState.patch((doc) => {
      if (global.RenderEngine?.applyBookingLinkToDocument) {
        global.RenderEngine.applyBookingLinkToDocument(doc, raw);
      } else {
        doc.page.bookingUrl = String(raw).trim();
        if (doc.sections?.booking) doc.sections.booking.hidden = false;
      }
    });
    hooks?.onCommitHistory?.();
    global.EditorEngine?.remount?.();
    global.SiteState.save();
    toast("Bokning sparad — knappen på sidan är uppdaterad.", "success", 2800);
  }

  function saveOrder(wrap, hooks) {
    const foodora = wrap.querySelector("#section-order-foodora")?.value;
    const wolt = wrap.querySelector("#section-order-wolt")?.value;
    const pickup = wrap.querySelector("#section-order-pickup")?.value;
    if (!String(foodora || "").trim() && !String(wolt || "").trim() && !String(pickup || "").trim()) {
      toast("Klistra in minst en länk (Foodora, Wolt eller Beställ & hämta).", "info", 3200);
      return;
    }
    global.SiteState.patch((doc) => {
      if (global.RenderEngine?.applyOrderLinksToDocument) {
        global.RenderEngine.applyOrderLinksToDocument(doc, { foodora, wolt, pickup });
      } else {
        doc.page.foodoraUrl = String(foodora || "").trim();
        doc.page.woltUrl = String(wolt || "").trim();
        doc.page.pickupUrl = String(pickup || "").trim();
        if (doc.sections?.booking) doc.sections.booking.hidden = false;
      }
    });
    hooks?.onCommitHistory?.();
    global.EditorEngine?.remount?.();
    global.SiteState.save();
    toast("Beställningslänkar sparade.", "success", 3200);
  }

  function saveSocial(wrap, hooks) {
    const v1 = normSocialUrl(wrap.querySelector("#section-social-1")?.value);
    const v2 = normSocialUrl(wrap.querySelector("#section-social-2")?.value);
    const v3 = normSocialUrl(wrap.querySelector("#section-social-3")?.value);
    global.SiteState.patch((doc) => {
      const c = doc.sections?.footer?.content;
      if (!c) return;
      c["footer-social-1-href"] = v1;
      c["footer-social-2-href"] = v2;
      c["footer-social-3-href"] = v3;
    });
    hooks?.onCommitHistory?.();
    global.EditorEngine?.remount?.();
    global.SiteState.save();
    toast("Sociala länkar sparade.", "success", 2800);
  }

  function bindSectionEditPanels(mainEl, footerEl, hooks) {
    const roots = [mainEl, footerEl].filter(Boolean);
    roots.forEach((root) => {
      root.querySelectorAll("[data-section-edit-toggle]").forEach((btn) => {
        if (btn.dataset.seToggleBound) return;
        btn.dataset.seToggleBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const wrap = btn.closest("[data-section-edit]");
          const panel = wrap?.querySelector(".section-edit__panel");
          const isOpen = btn.getAttribute("aria-expanded") === "true";
          if (isOpen) {
            btn.setAttribute("aria-expanded", "false");
            if (panel) panel.hidden = true;
          } else {
            closeAllPanels(btn);
            btn.setAttribute("aria-expanded", "true");
            if (panel) panel.hidden = false;
            syncPanelFields(wrap);
          }
        });
      });

      root.querySelectorAll("[data-section-action]").forEach((btn) => {
        if (btn.dataset.seActionBound) return;
        btn.dataset.seActionBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSectionAction(btn, mainEl, footerEl, hooks);
        });
      });

      root.querySelectorAll("[data-section-hide-toggle]").forEach((btn) => {
        if (btn.dataset.seHideBound) return;
        btn.dataset.seHideBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const sectionEl = btn.closest("[data-section]");
          const id = sectionEl?.getAttribute("data-section");
          if (!id) return;
          global.SiteState.patch((doc) => {
            if (doc.sections?.[id]) doc.sections[id].hidden = true;
          });
          hooks?.onCommitHistory?.();
          global.EditorEngine?.syncVisibilityFromState?.();
          global.SiteState.save();
          closeAllPanels();
          toast("Sektion dold — visa igen under Redigera → Innehåll.", "info", 3600);
        });
      });

      root.querySelectorAll("[data-hero-layout-pick]").forEach((btn) => {
        if (btn.dataset.seLayoutBound) return;
        btn.dataset.seLayoutBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const lay = btn.getAttribute("data-hero-layout-pick");
          if (!lay) return;
          global.SiteState.patch((doc) => {
            doc.page.heroLayout = lay;
          });
          hooks?.onCommitHistory?.();
          global.EditorEngine?.syncHeroFromState?.();
          const wrap = btn.closest("[data-section-edit]");
          wrap?.querySelectorAll("[data-hero-layout-pick]").forEach((b) => {
            b.classList.toggle("is-active", b === btn);
          });
          global.SiteState.save();
        });
      });

      root.querySelectorAll("[data-hero-bg-pick]").forEach((btn) => {
        if (btn.dataset.seHeroBgBound) return;
        btn.dataset.seHeroBgBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const hero = mainEl?.querySelector(".site-section--hero");
          const input = hero?.querySelector("[data-hero-bg-input]");
          if (input) input.click();
        });
      });

      root.querySelectorAll("[data-section-save]").forEach((btn) => {
        if (btn.dataset.seSaveBound) return;
        btn.dataset.seSaveBound = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const wrap = btn.closest("[data-section-edit]");
          const kind = btn.getAttribute("data-section-save");
          if (kind === "booking") saveBooking(wrap, hooks);
          else if (kind === "order") saveOrder(wrap, hooks);
          else if (kind === "social") saveSocial(wrap, hooks);
        });
      });
    });

    if (!document.documentElement.dataset.sectionEditDocBound) {
      document.documentElement.dataset.sectionEditDocBound = "1";
      document.addEventListener("click", (e) => {
        const t = e.target;
        if (!t || typeof t.closest !== "function") return;
        if (t.closest("[data-section-edit]")) return;
        closeAllPanels();
      });
    }
  }

  function clearBindFlags(mainEl, footerEl) {
    const roots = [mainEl, footerEl].filter(Boolean);
    roots.forEach((root) => {
      root.querySelectorAll("[data-section-edit-toggle]").forEach((el) => delete el.dataset.seToggleBound);
      root.querySelectorAll("[data-section-action]").forEach((el) => delete el.dataset.seActionBound);
      root.querySelectorAll("[data-section-hide-toggle]").forEach((el) => delete el.dataset.seHideBound);
      root.querySelectorAll("[data-hero-layout-pick]").forEach((el) => delete el.dataset.seLayoutBound);
      root.querySelectorAll("[data-hero-bg-pick]").forEach((el) => delete el.dataset.seHeroBgBound);
      root.querySelectorAll("[data-section-save]").forEach((el) => delete el.dataset.seSaveBound);
    });
  }

  global.SectionEditPanels = {
    render,
    bindSectionEditPanels,
    clearBindFlags,
    syncPanelFields,
  };
})(typeof window !== "undefined" ? window : globalThis);
