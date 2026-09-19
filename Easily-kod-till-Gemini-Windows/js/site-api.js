/**
 * HTTP-klient mot AI Site Studio-server (projekt + publicering).
 * API-bas: localStorage "studioApiBase" eller ?api= i URL.
 */
(function (global) {
  "use strict";

  function normalizeBase(url) {
    if (!url || typeof url !== "string") return "";
    return url.replace(/\/+$/, "");
  }

  function getApiBase() {
    try {
      var q = new URLSearchParams(window.location.search);
      var fromQuery = q.get("api");
      if (fromQuery) return normalizeBase(fromQuery);
    } catch (e) {
      /* ignore */
    }
    try {
      var fromStorage = normalizeBase(global.localStorage.getItem("studioApiBase") || "");
      if (fromStorage) return fromStorage;
    } catch (e2) {
      /* ignore */
    }
    try {
      if (global.location && String(global.location.protocol).indexOf("http") === 0) {
        return normalizeBase(global.location.origin);
      }
    } catch (e3) {
      /* ignore */
    }
    return "";
  }

  function setApiBase(url) {
    var b = normalizeBase(url);
    try {
      if (b) global.localStorage.setItem("studioApiBase", b);
      else global.localStorage.removeItem("studioApiBase");
    } catch (e) {
      /* ignore */
    }
    return b;
  }

  function getApiKey() {
    try {
      return global.localStorage.getItem("studioApiKey") || "";
    } catch (e) {
      return "";
    }
  }

  function setApiKey(key) {
    try {
      if (key) global.localStorage.setItem("studioApiKey", String(key).trim());
      else global.localStorage.removeItem("studioApiKey");
    } catch (e) {
      /* ignore */
    }
  }

  async function request(path, opts) {
    var base = getApiBase();
    if (!base) throw new Error("Kunde inte nå servern. Försök igen om en stund.");
    var headers = Object.assign({ Accept: "application/json" }, (opts && opts.headers) || {});
    var body = opts && opts.body;
    if (body !== undefined && body !== null && typeof body !== "string") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    var key = getApiKey();
    if (key) headers["x-api-key"] = key;
    var timeoutMs = (opts && opts.timeoutMs) != null ? opts.timeoutMs : 12000;
    var ctrl = new AbortController();
    var tid = setTimeout(function () {
      try {
        ctrl.abort();
      } catch (e) {
        /* ignore */
      }
    }, timeoutMs);
    var res;
    try {
      res = await fetch(base + path, {
        method: (opts && opts.method) || "GET",
        headers: headers,
        body: body,
        signal: ctrl.signal,
      });
    } catch (e) {
      if (e && e.name === "AbortError") {
        var tErr = new Error("Servern svarade inte i tid. Försök igen.");
        tErr.cause = e;
        throw tErr;
      }
      throw e;
    } finally {
      clearTimeout(tid);
    }
    var text = await res.text();
    var data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text };
    }
    if (!res.ok) {
      var msg = (data && (data.error || data.message)) || res.statusText || "HTTP " + res.status;
      var err = new Error(msg);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  function fetchPublicDocument(slug) {
    var base = getApiBase();
    if (!base) throw new Error("Kunde inte nå servern. Försök igen om en stund.");
    return request("/api/public/" + encodeURIComponent(slug), { method: "GET" });
  }

  function listProjects() {
    return request("/api/projects", { method: "GET" });
  }

  function getProject(id) {
    return request("/api/projects/" + encodeURIComponent(id), { method: "GET" });
  }

  function createProject(payload) {
    return request("/api/projects", { method: "POST", body: payload || {} });
  }

  function saveProject(id, documentOrEnvelope) {
    var x = documentOrEnvelope;
    var isEnvelope =
      x && typeof x === "object" && x.document != null && x.apiVersion != null;
    var body;
    if (isEnvelope) {
      body = {
        apiVersion: x.apiVersion,
        client: x.client,
        sentAt: x.sentAt,
        document: x.document,
      };
      if (x.thumbnailSvg != null) body.thumbnailSvg = x.thumbnailSvg;
    } else {
      body = { document: x };
    }
    return request("/api/projects/" + encodeURIComponent(id) + "/save", { method: "POST", body: body });
  }

  function patchProject(id, fields) {
    return request("/api/projects/" + encodeURIComponent(id), { method: "PATCH", body: fields || {} });
  }

  function duplicateProject(id) {
    return request("/api/projects/" + encodeURIComponent(id) + "/duplicate", { method: "POST", body: {} });
  }

  function publishProject(id) {
    return request("/api/projects/" + encodeURIComponent(id) + "/publish", { method: "POST", body: {} });
  }

  global.SiteApi = {
    getApiBase,
    setApiBase,
    getApiKey,
    setApiKey,
    request,
    fetchPublicDocument,
    listProjects,
    getProject,
    createProject,
    saveProject,
    patchProject,
    duplicateProject,
    publishProject,
  };
})(typeof window !== "undefined" ? window : globalThis);
