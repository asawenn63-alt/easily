/**
 * Lättviktig orientering vid första redigering: försvinner av sig själv, sparas i localStorage.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "studioOrientationDismissedV1";
  /** Tillräckligt lång tid att läsa; stängs även med × */
  var SHOW_MS = 28000;
  var el;
  var closeBtn;
  var done = false;
  var timer;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function finishSave() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function hide() {
    if (!el || done) return;
    done = true;
    clearTimer();
    el.classList.remove("studio-orientation--visible");
    el.classList.add("studio-orientation--leaving");
    var onEnd = function (ev) {
      if (ev.propertyName !== "opacity") return;
      el.removeEventListener("transitionend", onEnd);
      el.setAttribute("hidden", "hidden");
      el.classList.remove("studio-orientation--leaving");
      finishSave();
    };
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(function () {
      if (el && !el.hasAttribute("hidden")) {
        el.setAttribute("hidden", "hidden");
        el.classList.remove("studio-orientation--leaving");
        finishSave();
      }
    }, 700);
  }

  function show() {
    el = document.getElementById("studioOrientation");
    if (!el) return;
    closeBtn = document.getElementById("studioOrientationClose");

    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch (e1) {
      /* ignore */
    }

    if (document.body.getAttribute("data-studio-mode") === "readonly") return;

    el.removeAttribute("hidden");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("studio-orientation--visible");
      });
    });

    timer = window.setTimeout(hide, SHOW_MS);

    if (closeBtn) {
      closeBtn.addEventListener("click", hide, { once: true });
    }
  }

  document.addEventListener(
    "studio:ready",
    function (ev) {
      if (ev && ev.detail && ev.detail.readOnly) return;
      show();
    },
    { once: true }
  );
})();
