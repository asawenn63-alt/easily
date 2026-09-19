/**
 * Översikt över sparade sajter (lista, öppna, byt namn, duplicera).
 * Initieras från editor-engine med callbacks.
 */
(function (global) {
  "use strict";

  let deps = null;
  let livePreviewObserver = null;
  const livePreviewQueue = [];
  let livePreviewActive = 0;
  const LIVE_PREVIEW_CONCURRENCY = 2;

  function projectDocumentFromResponse(res) {
    const project = res && res.project;
    if (!project) return null;
    return project.document || project.draftDocument || null;
  }

  function enqueueLivePreview(host, projectId) {
    if (!host || !projectId || host.dataset.liveLoaded === "1" || host.dataset.liveLoading === "1") return;
    livePreviewQueue.push({ host: host, id: projectId });
    pumpLivePreviewQueue();
  }

  function pumpLivePreviewQueue() {
    while (livePreviewActive < LIVE_PREVIEW_CONCURRENCY && livePreviewQueue.length) {
      const job = livePreviewQueue.shift();
      if (!job || !job.host || job.host.dataset.liveLoaded === "1") continue;
      livePreviewActive += 1;
      job.host.dataset.liveLoading = "1";
      loadLivePreview(job.host, job.id).finally(function () {
        livePreviewActive -= 1;
        pumpLivePreviewQueue();
      });
    }
  }

  async function loadLivePreview(host, projectId) {
    if (!host || !projectId || !global.SiteApi || !global.SiteApi.getProject) return;
    try {
      const res = await global.SiteApi.getProject(projectId);
      const doc = projectDocumentFromResponse(res);
      if (!doc) return;
      const normalized = global.AppDocument?.normalize ? global.AppDocument.normalize(doc) : doc;
      if (global.ProjectThumbnail && typeof global.ProjectThumbnail.mountLivePreview === "function") {
        const ok = global.ProjectThumbnail.mountLivePreview(host, normalized);
        if (ok) {
          host.dataset.liveLoaded = "1";
          const wrap = host.closest(".studio-project-card__thumb-wrap");
          const fallback = wrap && wrap.querySelector(".studio-project-card__thumb--fallback");
          if (fallback) fallback.classList.add("is-hidden");
        }
      }
    } catch (e) {
      console.warn("ProjectsHub live preview", e);
    } finally {
      delete host.dataset.liveLoading;
    }
  }

  function observeLivePreviews(root) {
    if (livePreviewObserver) {
      livePreviewObserver.disconnect();
      livePreviewObserver = null;
    }
    if (!root || typeof IntersectionObserver !== "function") {
      root &&
        root.querySelectorAll(".studio-project-card__live[data-project-id]").forEach(function (el) {
          enqueueLivePreview(el, el.getAttribute("data-project-id"));
        });
      return;
    }
    livePreviewObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const host = entry.target;
          const id = host.getAttribute("data-project-id");
          if (id) enqueueLivePreview(host, id);
          livePreviewObserver.unobserve(host);
        });
      },
      { root: root.closest(".studio-projects-dialog__panel") || null, rootMargin: "120px 0px", threshold: 0.01 }
    );
    root.querySelectorAll(".studio-project-card__live[data-project-id]").forEach(function (el) {
      livePreviewObserver.observe(el);
    });
  }

  function createThumbWrap(project) {
    const wrap = document.createElement("div");
    wrap.className = "studio-project-card__thumb-wrap";

    const fallback = document.createElement("img");
    fallback.className = "studio-project-card__thumb studio-project-card__thumb--fallback";
    fallback.alt = "Förhandsbild: " + (project.name || project.slug || "");
    fallback.loading = "lazy";
    fallback.decoding = "async";
    const ts = thumbSrc(project);
    if (ts) fallback.src = ts + "?t=" + encodeURIComponent(String(project.updatedAt || ""));

    const live = document.createElement("div");
    live.className = "studio-project-card__live";
    live.setAttribute("data-project-id", project.id);
    live.setAttribute("aria-hidden", "true");

    wrap.appendChild(fallback);
    wrap.appendChild(live);
    return wrap;
  }

  function base() {
    return (global.SiteApi && global.SiteApi.getApiBase && global.SiteApi.getApiBase()) || "";
  }

  function thumbSrc(project) {
    const b = base();
    if (!b || !project || !project.thumbnailUrl) return "";
    return b.replace(/\/+$/, "") + project.thumbnailUrl;
  }

  function formatUpdated(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just nu";
    if (mins < 60) return mins + " min sedan";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " tim sedan";
    const days = Math.floor(hrs / 24);
    if (days < 14) return days + " dagar sedan";
    try {
      return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch (e) {
      return d.toLocaleString("sv-SE");
    }
  }

  function setHint(msg) {
    const el = document.getElementById("studioProjectsHint");
    if (el) el.textContent = msg || "";
  }

  async function renderGrid() {
    const grid = document.getElementById("studioProjectsGrid");
    if (!grid || !deps) return;
    grid.innerHTML = "";
    if (!base()) {
      setHint("Skapa din första hemsida med Ny hemsida, eller öppna Mina hemsidor uppe till höger.");
      return;
    }
    setHint("Laddar…");
    try {
      const data = await global.SiteApi.listProjects();
      const list = data.projects || [];
      setHint(list.length ? "" : "Ingen hemsida sparad än — skapa en med Ny hemsida. Betalning först när du publicerar.");
      list.forEach(function (p) {
        const card = document.createElement("article");
        card.className = "studio-project-card";
        card.dataset.id = p.id;

        const thumbWrap = createThumbWrap(p);

        const body = document.createElement("div");
        body.className = "studio-project-card__body";

        const h = document.createElement("h3");
        h.className = "studio-project-card__title";
        h.textContent = p.name || p.slug || p.id;

        const meta = document.createElement("div");
        meta.className = "studio-project-card__meta";
        meta.textContent = formatUpdated(p.updatedAt);

        const actions = document.createElement("div");
        actions.className = "studio-project-card__actions";

        function btn(label, action) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "studio-project-card__btn";
          b.textContent = label;
          b.dataset.action = action;
          return b;
        }

        actions.appendChild(btn("Fortsätt redigera", "open"));
        actions.appendChild(btn("Byt namn", "rename"));
        actions.appendChild(btn("Duplicera", "duplicate"));

        body.appendChild(h);
        body.appendChild(meta);
        body.appendChild(actions);
        card.appendChild(thumbWrap);
        card.appendChild(body);
        grid.appendChild(card);
      });
      observeLivePreviews(grid);
    } catch (e) {
      setHint("Kunde inte hämta dina hemsidor. Kontrollera adressen och försök igen.");
    }
  }

  function dialogEl() {
    return document.getElementById("studioProjectsDialog");
  }

  function openDialog() {
    const d = dialogEl();
    if (!d) return;
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "open");
    renderGrid().catch(function (e) {
      console.warn(e);
    });
  }

  function closeDialog() {
    const d = dialogEl();
    if (!d) return;
    if (typeof d.close === "function") d.close();
    else d.removeAttribute("open");
  }

  async function onGridClick(ev) {
    const t = ev.target;
    if (!t || !t.closest) return;
    const btn = t.closest("button[data-action]");
    if (!btn) return;
    const card = btn.closest(".studio-project-card");
    const id = card && card.dataset && card.dataset.id;
    const action = btn.getAttribute("data-action");
    if (!id || !action || !deps) return;

    if (action === "open") {
      try {
        await deps.loadRemoteProjectIntoEditor(id, { quiet: false });
        if (deps.refreshProjectList) await deps.refreshProjectList();
        closeDialog();
      } catch (e) {
        setHint("Kunde inte öppna den hemsidan.");
      }
      return;
    }

    if (action === "rename") {
      const cur = card.querySelector(".studio-project-card__title");
      const nm = global.prompt("Vad ska hemsidan heta? (Du kan ha flera — namnet är bara för dig.)", (cur && cur.textContent) || "");
      if (nm === null || !String(nm).trim()) return;
      try {
        await global.SiteApi.patchProject(id, { name: String(nm).trim() });
        setHint("Sparat.");
        await renderGrid();
        if (deps.refreshProjectList) await deps.refreshProjectList();
      } catch (e) {
        setHint("Byt namn gick inte igenom.");
      }
      return;
    }

    if (action === "duplicate") {
      try {
        const out = await global.SiteApi.duplicateProject(id);
        setHint("Ny kopia skapad.");
        await renderGrid();
        if (deps.refreshProjectList) await deps.refreshProjectList();
        if (out.id && global.confirm("Öppna kopian nu?")) {
          await deps.loadRemoteProjectIntoEditor(out.id, { quiet: false });
          if (deps.refreshProjectList) await deps.refreshProjectList();
          closeDialog();
        }
      } catch (e) {
        setHint("Duplicering gick inte igenom.");
      }
    }
  }

  function bind(nextDeps) {
    deps = nextDeps;
    const openBtn = document.getElementById("studioProjectsOpenBtn");
    const dlg = dialogEl();
    const closeBtn = document.getElementById("studioProjectsDialogClose");
    const refreshBtn = document.getElementById("studioProjectsRefreshBtn");
    const createBtn = document.getElementById("studioProjectsCreateBtn");
    const grid = document.getElementById("studioProjectsGrid");

    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = "1";
      openBtn.addEventListener("click", function () {
        openDialog();
      });
    }
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "1";
      closeBtn.addEventListener("click", closeDialog);
    }
    if (dlg && !dlg.dataset.bound) {
      dlg.dataset.bound = "1";
      dlg.addEventListener("click", function (ev) {
        if (ev.target === dlg) closeDialog();
      });
    }
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = "1";
      refreshBtn.addEventListener("click", function () {
        renderGrid().catch(console.warn);
      });
    }
    if (createBtn && !createBtn.dataset.bound) {
      createBtn.dataset.bound = "1";
      createBtn.addEventListener("click", async function () {
        if (!deps || !deps.createNewProject) return;
        try {
          await deps.createNewProject();
          await renderGrid();
          if (deps.refreshProjectList) await deps.refreshProjectList();
          closeDialog();
        } catch (e) {
          console.error("projects_hub_create_failed", e);
          setHint("Kunde inte skapa sajten.");
        }
      });
    }
    if (grid && !grid.dataset.bound) {
      grid.dataset.bound = "1";
      grid.addEventListener("click", function (ev) {
        onGridClick(ev);
      });
    }
  }

  global.ProjectsHub = {
    bind,
    openDialog,
    closeDialog,
    refreshGrid: renderGrid,
  };
})(typeof window !== "undefined" ? window : globalThis);
