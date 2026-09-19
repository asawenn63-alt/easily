/**
 * EditableBindings — synkar [data-editable] ↔ SiteState, bilder, dnd-ordning.
 */
(function (global) {
  "use strict";

  function syncOrderFromDom(mainEl, doc) {
    if (!mainEl || !doc.page) return;
    const ids = [];
    mainEl.querySelectorAll(".site-section[data-section]").forEach((el) => {
      const id = el.getAttribute("data-section");
      if (id && id !== "footer") ids.push(id);
    });
    if (ids.length) doc.page.sectionOrder = [...ids, "footer"];
  }

  function syncHiddenFromDom(mainEl, footerEl, doc) {
    if (!doc.sections) return;
    mainEl?.querySelectorAll(".site-section[data-section]").forEach((el) => {
      const id = el.getAttribute("data-section");
      if (id && doc.sections[id]) doc.sections[id].hidden = el.getAttribute("data-hidden") === "true";
    });
    if (footerEl && doc.sections.footer) {
      doc.sections.footer.hidden = footerEl.getAttribute("data-hidden") === "true";
    }
  }

  function syncGalleryImages(mainEl, doc) {
    const gsec = mainEl?.querySelector('[data-section="gallery"]');
    if (!gsec || !doc.sections.gallery) return;
    const imgs = [...gsec.querySelectorAll(".gallery__item img")].map((img) => img.src);
    if (imgs.length) doc.sections.gallery.images = imgs;
  }

  function syncFooterEdits(footerEl, doc) {
    if (!footerEl || !doc.sections.footer) return;
    const c = (doc.sections.footer.content = doc.sections.footer.content || {});
    footerEl.querySelectorAll("[data-editable]").forEach((el) => {
      const key = el.getAttribute("data-editable");
      if (!key) return;
      c[key] = el.textContent.trim();
      const link = el.closest("a[href]");
      if (link) {
        const hk = link.getAttribute("data-href-key");
        if (hk) {
          c[hk] = link.getAttribute("href") || "#";
        } else if (key.startsWith("footer-link-")) {
          c[key + "-href"] = link.getAttribute("href") || "#";
        } else if (key.startsWith("footer-social-")) {
          c[key + "-href"] = link.getAttribute("href") || "#";
        }
      }
    });
  }

  function syncFooterBrandTopAndBottom(mainEl, footerEl, doc) {
    if (!doc.sections || !doc.sections.footer) return;
    const nameEl =
      mainEl?.querySelector(".site-industry-logo__name") ||
      mainEl?.querySelector(".site-public-header__text-logo-name");
    const cityEl =
      mainEl?.querySelector(".site-industry-logo__sub") ||
      mainEl?.querySelector(".site-public-header__text-logo-city");
    const legacy = mainEl?.querySelector(".site-public-header__brand");
    const c = (doc.sections.footer.content = doc.sections.footer.content || {});
    if (nameEl) {
      c["footer-brand"] = (nameEl.textContent || "").trim();
    } else if (legacy) {
      c["footer-brand"] = (legacy.textContent || "").trim();
    }
    if (cityEl) {
      if (!doc.page) doc.page = {};
      const sub = (cityEl.textContent || "").trim();
      doc.page.textLogoSubline = sub;
      if (!doc.page.textLogoTagline) {
        doc.page.location = sub;
      }
    }
  }

  function syncDocumentFromDom(mainEl, footerEl) {
    const doc = global.SiteState.get();
    if (!doc || !mainEl) return;

    syncHiddenFromDom(mainEl, footerEl, doc);
    syncOrderFromDom(mainEl, doc);

    const heroBg = document.getElementById("heroBg");
    if (heroBg) {
      const HIU = global.HeroImageUrl;
      const canon = function (u) {
        return HIU && typeof HIU.canonical === "function" ? HIU.canonical(u) || u : u;
      };
      const img = heroBg.querySelector(".hero__photo");
      if (img && img.getAttribute("src")) {
        doc.page.heroBgUrl = canon(img.getAttribute("src"));
      } else {
        const st = heroBg.style.getPropertyValue("--hero-bg-image") || "";
        const m = st.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (m) doc.page.heroBgUrl = canon(m[1]);
      }
    }
    const heroSec = mainEl.querySelector(".site-section--hero");
    if (heroSec) {
      const lay = heroSec.className.match(/hero-layout--(\w+)/);
      if (lay) doc.page.heroLayout = lay[1];
    }

    mainEl.querySelectorAll(".site-section[data-section]").forEach((secEl) => {
      const sid = secEl.getAttribute("data-section");
      if (!sid || !doc.sections[sid] || sid === "footer") return;

      secEl.querySelectorAll("[data-editable]").forEach((el) => {
        const key = el.getAttribute("data-editable");
        if (!key) return;

        if (sid === "hero") {
          const c = (doc.sections.hero.content = doc.sections.hero.content || {});
          if (key === "hero-title") c["hero-title"] = el.textContent.trim();
          else if (key === "hero-lead") c["hero-lead"] = el.textContent.trim();
          else if (key === "hero-cta-1-text" || key === "hero-cta-2-text") {
            c[key] = el.textContent.trim();
            const num = key.includes("1") ? "1" : "2";
            const a = el.closest("a");
            c[`hero-cta-${num}-href`] = (a && a.getAttribute("href")) || "#";
          }
          return;
        }

        if (sid === "about") {
          const c = (doc.sections.about.content = doc.sections.about.content || {});
          c[key] = el.textContent.trim();
          return;
        }

        if (sid === "services") {
          const m = key.match(/^card-(\d+)-(icon|title|body|detail|cta-text)$/);
          if (m) {
            const i = Number(m[1]);
            const field = m[2];
            doc.sections.services.cards = doc.sections.services.cards || [];
            while (doc.sections.services.cards.length <= i) {
              doc.sections.services.cards.push({ icon: "", title: "", body: "", detail: "", img: "", intent: "services", ctaText: "", ctaHref: "" });
            }
            const row = doc.sections.services.cards[i];
            if (field === "icon") row.icon = el.textContent.trim();
            else if (field === "title") row.title = el.textContent.trim();
            else if (field === "body") row.body = el.textContent.trim();
            else if (field === "detail") row.detail = el.textContent.trim();
            else if (field === "cta-text") {
              row.ctaText = el.textContent.trim();
              const a = el.closest("a");
              row.ctaHref = (a && a.getAttribute("href")) || "#";
            }
            return;
          }
          const c = (doc.sections.services.content = doc.sections.services.content || {});
          c[key] = el.textContent.trim();
          return;
        }

        if (sid === "gallery") {
          const c = (doc.sections.gallery.content = doc.sections.gallery.content || {});
          c[key] = el.textContent.trim();
          return;
        }

        if (sid === "faq") {
          const fm = key.match(/^faq-(\d+)-(q|a)$/);
          if (fm) {
            const i = Number(fm[1]);
            const field = fm[2];
            doc.sections.faq.items = doc.sections.faq.items || [];
            while (doc.sections.faq.items.length <= i) doc.sections.faq.items.push({ q: "", a: "" });
            doc.sections.faq.items[i][field] = field === "a" ? el.innerHTML : el.textContent.trim();
            return;
          }
          const c = (doc.sections.faq.content = doc.sections.faq.content || {});
          c[key] = el.textContent.trim();
          return;
        }

        if (sid === "contact") {
          const c = (doc.sections.contact.content = doc.sections.contact.content || {});
          c[key] = el.textContent.trim();
        }
      });

      if (sid === "about") {
        const img = secEl.querySelector(".about__img");
        if (img?.src) doc.sections.about.imageUrl = img.src;
      }

      if (sid === "services") {
        secEl.querySelectorAll(".card").forEach((card, i) => {
          const im = card.querySelector(".card__thumb");
          if (im?.src && doc.sections.services.cards[i]) doc.sections.services.cards[i].img = im.src;
          const sel = card.querySelector("[data-card-intent-select]");
          if (sel && doc.sections.services.cards[i]) doc.sections.services.cards[i].intent = sel.value || "services";
        });
      }
    });

    syncGalleryImages(mainEl, doc);
    syncFooterEdits(footerEl, doc);
    syncFooterBrandTopAndBottom(mainEl, footerEl, doc);

    global.SiteState.replace(doc);
  }

  function findImageForFileInput(input) {
    const hit = input.closest(".editable-image__hit");
    if (hit) return hit.querySelector("img[data-upload-target], img");
    const leg = input.closest("label")?.parentElement?.querySelector("img");
    return leg || null;
  }

  function readFileAsDataUrl(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const u = reader.result;
      if (typeof u === "string" && u.startsWith("data:")) cb(u);
    };
    reader.readAsDataURL(file);
  }

  function applyHeroBgDataUrl(dataUrl, mainEl, footerEl, hooks) {
    const bg = document.getElementById("heroBg");
    const hero = mainEl && mainEl.querySelector(".site-section--hero");
    if (global.EditorEngine && typeof global.EditorEngine.applyHeroPhotoToDom === "function") {
      global.EditorEngine.applyHeroPhotoToDom(bg, hero, dataUrl);
    } else if (bg && dataUrl) {
      const safe = String(dataUrl).replace(/'/g, "\\'");
      bg.style.setProperty("--hero-bg-image", `url('${safe}')`);
    }
    syncDocumentFromDom(mainEl, footerEl);
    try {
      global.EditorEngine?.syncHeroFromState?.();
    } catch (e) {
      /* ignore */
    }
    hooks?.onCommitHistory?.();
    hooks?.onPersist?.();
  }

  function bindImageUploads(root, mainEl, footerEl, hooks) {
    root.querySelectorAll("[data-replace-img]").forEach((input) => {
      if (input.dataset.bound) return;
      input.dataset.bound = "1";
      input.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        const img = findImageForFileInput(input);
        if (!img) return;
        readFileAsDataUrl(file, (dataUrl) => {
          img.src = dataUrl;
          img.removeAttribute("srcset");
          syncDocumentFromDom(mainEl, footerEl);
          hooks?.onCommitHistory?.();
          hooks?.onPersist?.();
        });
        e.target.value = "";
      });
    });
  }

  function bindHeroBgInputs(mainEl, footerEl, hooks) {
    (mainEl || document).querySelectorAll("[data-hero-bg-input]").forEach((input) => {
      if (input.dataset.bound) return;
      input.dataset.bound = "1";
      input.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        readFileAsDataUrl(file, (dataUrl) => {
          applyHeroBgDataUrl(dataUrl, mainEl, footerEl, hooks);
        });
        e.target.value = "";
      });
    });
  }

  function bindHeroBgDrop(mainEl, footerEl, hooks) {
    if (!mainEl) return;
    const hero = mainEl.querySelector(".site-section--hero");
    const bg = document.getElementById("heroBg");
    if (!hero || !bg || !bg.hasAttribute("data-hero-bg-drop")) return;
    if (hero.dataset.heroDropBound) return;
    hero.dataset.heroDropBound = "1";

    const isFileDt = (dt) => dt?.types?.includes("Files");

    hero.addEventListener("click", (e) => {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      if (
        t.closest(".hero__inner") ||
        t.closest(".section-edit") ||
        t.closest(".section-ai-ribbon") ||
        t.closest(".section-drag") ||
        t.closest(".hero-image-tools")
      ) {
        return;
      }
      if (t === hero || t.classList.contains("hero__bg") || t.classList.contains("hero__overlay")) {
        const input = hero.querySelector("[data-hero-bg-input]");
        if (input) {
          e.preventDefault();
          input.click();
        }
      }
    });

    hero.addEventListener("dragenter", (e) => {
      if (!isFileDt(e.dataTransfer)) return;
      e.preventDefault();
    });
    hero.addEventListener("dragover", (e) => {
      if (!isFileDt(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      hero.classList.add("hero--image-drop");
    });
    hero.addEventListener("dragleave", (e) => {
      if (!hero.contains(e.relatedTarget)) hero.classList.remove("hero--image-drop");
    });
    hero.addEventListener("drop", (e) => {
      hero.classList.remove("hero--image-drop");
      if (!isFileDt(e.dataTransfer)) return;
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      e.preventDefault();
      readFileAsDataUrl(file, (dataUrl) => {
        applyHeroBgDataUrl(dataUrl, mainEl, footerEl, hooks);
      });
    });
  }

  function bindEditableImageDrop(mainEl, footerEl, hooks) {
    if (!mainEl) return;
    mainEl.querySelectorAll("[data-editable-image]").forEach((zone) => {
      if (zone.dataset.dropBound) return;
      zone.dataset.dropBound = "1";

      const isFileDt = (dt) => dt?.types?.includes("Files");

      zone.addEventListener("dragenter", (e) => {
        if (!isFileDt(e.dataTransfer)) return;
        e.preventDefault();
      });
      zone.addEventListener("dragover", (e) => {
        if (!isFileDt(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        zone.classList.add("editable-image--drop-hover");
      });
      zone.addEventListener("dragleave", (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove("editable-image--drop-hover");
      });
      zone.addEventListener("drop", (e) => {
        zone.classList.remove("editable-image--drop-hover");
        if (!isFileDt(e.dataTransfer)) return;
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        e.preventDefault();
        e.stopPropagation();
        const img = zone.querySelector("img[data-upload-target], .editable-image__hit img");
        if (!img) return;
        readFileAsDataUrl(file, (dataUrl) => {
          img.src = dataUrl;
          img.removeAttribute("srcset");
          syncDocumentFromDom(mainEl, footerEl);
          hooks?.onCommitHistory?.();
          hooks?.onPersist?.();
        });
      });
    });
  }

  function bindUploadTriggers(mainEl) {
    if (!mainEl) return;
    mainEl.querySelectorAll("[data-trigger-upload]").forEach((btn) => {
      if (btn.dataset.triggerBound) return;
      btn.dataset.triggerBound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wrap = btn.closest("[data-editable-image]");
        if (!wrap) return;
        const input = wrap.querySelector("[data-replace-img]");
        if (input) input.click();
      });
    });
  }

  function bindImageSuggest(mainEl, footerEl, hooks) {
    if (!mainEl) return;
    mainEl.querySelectorAll("[data-ai-image-suggest]").forEach((btn) => {
      if (btn.dataset.suggestBound) return;
      btn.dataset.suggestBound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const kind = btn.getAttribute("data-ai-image-suggest");
        const genUrl =
          global.AISiteBuilder && typeof global.AISiteBuilder.suggestStockImageUrl === "function"
            ? global.AISiteBuilder.suggestStockImageUrl(kind, btn)
            : "";
        if (!genUrl) return;
        if (kind === "hero") {
          applyHeroBgDataUrl(genUrl, mainEl, footerEl, hooks);
          return;
        }
        const wrap = btn.closest("[data-editable-image]");
        const img = wrap?.querySelector("img[data-upload-target], .editable-image__hit img");
        if (!img) return;
        img.src = genUrl;
        img.removeAttribute("srcset");
        syncDocumentFromDom(mainEl, footerEl);
        hooks?.onCommitHistory?.();
        hooks?.onPersist?.();
      });
    });
  }

  function bindCardIntentSelects(mainEl, footerEl, hooks) {
    if (!mainEl) return;
    const valid = new Set(["pricing", "faq", "packages", "process", "testimonials", "services"]);
    mainEl.querySelectorAll("[data-card-intent-select]").forEach((sel) => {
      if (sel.dataset.intentBound) return;
      sel.dataset.intentBound = "1";
      sel.addEventListener("change", () => {
        const v = sel.value;
        if (!valid.has(v)) return;
        const idx = Number(sel.getAttribute("data-card-index"));
        if (Number.isNaN(idx)) return;
        global.SiteState.patch((d) => {
          const cards = d.sections?.services?.cards;
          if (!cards || !cards[idx]) return;
          cards[idx].intent = v;
        });
        hooks?.onCommitHistory?.();
        hooks?.onPersist?.();
      });
    });
  }

  function dragStartedFromHandle(e) {
    let t = e.target;
    if (t && t.nodeType === Node.TEXT_NODE) t = t.parentElement;
    if (t && typeof t.closest === "function" && t.closest(".section-drag")) return true;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    for (let i = 0; i < path.length; i++) {
      const n = path[i];
      if (n && n.classList && n.classList.contains("section-drag")) return true;
    }
    return false;
  }

  function bindSectionDragDrop(mainEl, footerEl, hooks) {
    if (!mainEl) return;
    let dragged = null;
    mainEl.querySelectorAll(".site-section[data-section]").forEach((sec) => {
      if (sec.dataset.dragBound) return;
      sec.dataset.dragBound = "1";
      sec.setAttribute("draggable", "true");
      sec.addEventListener("dragstart", (e) => {
        if (!dragStartedFromHandle(e)) {
          e.preventDefault();
          return;
        }
        dragged = sec;
        sec.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", sec.getAttribute("data-section") || "section");
        } catch (err) {
          /* ignore */
        }
      });
      sec.addEventListener("dragend", () => {
        sec.classList.remove("is-dragging");
        mainEl.querySelectorAll(".site-section.is-drop-target").forEach((x) => x.classList.remove("is-drop-target"));
        dragged = null;
      });
      sec.addEventListener("dragover", (e) => {
        if (!dragged || dragged === sec) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        sec.classList.add("is-drop-target");
      });
      sec.addEventListener("dragleave", () => sec.classList.remove("is-drop-target"));
      sec.addEventListener("drop", (e) => {
        e.preventDefault();
        sec.classList.remove("is-drop-target");
        if (!dragged || dragged === sec) return;
        const rect = sec.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        if (before) mainEl.insertBefore(dragged, sec);
        else mainEl.insertBefore(dragged, sec.nextSibling);
        syncDocumentFromDom(mainEl, footerEl);
        hooks?.onCommitHistory?.();
        hooks?.onPersist?.();
      });
    });
  }

  const ceBefore = new WeakMap();

  function wireContentEditable(mainEl, footerEl, hooks) {
    [mainEl, footerEl].filter(Boolean).forEach((root) => {
      root.querySelectorAll("[contenteditable='true']").forEach((el) => {
        if (el.dataset.snapshotBound) return;
        el.dataset.snapshotBound = "1";
        el.addEventListener("focusin", () => {
          ceBefore.set(el, el.innerHTML);
          try {
            if (global.matchMedia && global.matchMedia("(max-width: 640px)").matches) {
              el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
            }
          } catch (e) {
            /* ignore */
          }
        });
        el.addEventListener("blur", () => {
          const prev = ceBefore.get(el);
          if (prev !== undefined && prev !== el.innerHTML) {
            syncDocumentFromDom(mainEl, footerEl);
            hooks?.onCommitHistory?.();
          }
          ceBefore.delete(el);
          hooks?.onPersist?.();
        });
        /* Ctrl/Cmd+Z lämnas till webbläsaren i fältet (naturlig ångra text).
           Hela sidans historik: Redigera · Historik, eller kortkommando när fokus inte är i textfält. */
      });
    });
  }

  function rebindAll(mainEl, footerEl, hooks, opts) {
    if (!mainEl) return;
    const readOnly = !!(opts && opts.readOnly);
    mainEl.querySelectorAll("[data-replace-img], [data-hero-bg-input]").forEach((i) => delete i.dataset.bound);
    mainEl.querySelectorAll("[data-editable-image]").forEach((z) => delete z.dataset.dropBound);
    mainEl.querySelectorAll("[data-ai-image-suggest]").forEach((b) => delete b.dataset.suggestBound);
    mainEl.querySelectorAll("[data-trigger-upload]").forEach((b) => delete b.dataset.triggerBound);
    const heroSec = mainEl.querySelector(".site-section--hero");
    if (heroSec) delete heroSec.dataset.heroDropBound;
    mainEl.querySelectorAll(".site-section[data-section]").forEach((s) => delete s.dataset.dragBound);
    mainEl.querySelectorAll("[data-card-intent-select]").forEach((s) => delete s.dataset.intentBound);
    mainEl.querySelectorAll("[contenteditable='true']").forEach((e) => delete e.dataset.snapshotBound);
    if (global.SectionEditPanels?.clearBindFlags) global.SectionEditPanels.clearBindFlags(mainEl, footerEl);
    if (footerEl) {
      footerEl.querySelectorAll("[data-replace-img], [data-hero-bg-input]").forEach((i) => delete i.dataset.bound);
      footerEl.querySelectorAll("[contenteditable='true']").forEach((e) => delete e.dataset.snapshotBound);
    }
    if (!readOnly) {
      bindImageUploads(mainEl, mainEl, footerEl, hooks);
      if (footerEl) bindImageUploads(footerEl, mainEl, footerEl, hooks);
      bindHeroBgInputs(mainEl, footerEl, hooks);
      bindHeroBgDrop(mainEl, footerEl, hooks);
      bindEditableImageDrop(mainEl, footerEl, hooks);
      bindUploadTriggers(mainEl);
      bindImageSuggest(mainEl, footerEl, hooks);
      bindCardIntentSelects(mainEl, footerEl, hooks);
      bindSectionDragDrop(mainEl, footerEl, hooks);
      wireContentEditable(mainEl, footerEl, hooks);
      if (
        global.SectionEditPanels?.bindSectionEditPanels &&
        !document.body.classList.contains("studio-shell--create-active")
      ) {
        global.SectionEditPanels.bindSectionEditPanels(mainEl, footerEl, hooks);
      }
    }
  }

  global.EditableBindings = {
    syncDocumentFromDom,
    rebindAll,
  };
})(typeof window !== "undefined" ? window : globalThis);
