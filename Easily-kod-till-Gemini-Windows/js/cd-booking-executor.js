/**
 * CD Booking Executor — ren renderer av brief.booking (CD Create).
 * Läser endast låst creativeBrief via CdExecutorGuard.
 * Skriver endast sections.booking.content (Booking-copy).
 */
(function (global) {
  "use strict";

  const CD_BOOKING_INCOMPLETE = "cd_booking_incomplete";
  const CD_BOOKING_NOT_IN_SCOPE = "cd_booking_not_in_scope";
  const CD_BOOKING_SECTION_MISSING = "cd_booking_section_missing";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function scopeIncludesBooking(brief) {
    const CBC = global.CreativeBriefContract;
    if (CBC && typeof CBC.scopeIncludesSection === "function") {
      return CBC.scopeIncludesSection(brief, "booking");
    }
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    return sections.some(function (id) {
      return String(id).trim() === "booking";
    });
  }

  function requireBookingDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateBookingDecision === "function") {
      CBC.validateBookingDecision(brief && brief.booking, errors, brief);
    } else if (!brief || !brief.booking) {
      errors.push("booking");
    }
    if (errors.length) {
      throw createError(CD_BOOKING_INCOMPLETE, "brief.booking incomplete: " + errors.join(", "), {
        bookingErrors: errors,
      });
    }
    return brief.booking;
  }

  function applyBookingContent(sec, booking) {
    const title = String(booking.title).trim();
    const lead = String(booking.lead).trim();

    if (!title || !lead) {
      throw createError(CD_BOOKING_INCOMPLETE, "booking title or lead empty after render");
    }

    const content = {
      "booking-title": title,
      "booking-lead": lead,
    };

    if (booking.intro != null && String(booking.intro).trim()) {
      content["booking-intro"] = String(booking.intro).trim();
    }
    if (booking.description != null && String(booking.description).trim()) {
      content["booking-description"] = String(booking.description).trim();
    }

    sec.content = content;
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, booking?: object, skipped?: boolean, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let booking = null;
    let skipped = false;
    try {
      Guard.guardExecutor("booking-copy", doc, function (brief) {
        if (!scopeIncludesBooking(brief)) {
          skipped = true;
          return;
        }

        const sec = doc.sections && doc.sections.booking;
        if (!sec || typeof sec !== "object") {
          throw createError(
            CD_BOOKING_SECTION_MISSING,
            "sections.booking missing — composition must own structure",
          );
        }

        booking = requireBookingDecision(brief);
        applyBookingContent(sec, booking);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (skipped) {
      return { ok: true, skipped: true, reason: CD_BOOKING_NOT_IN_SCOPE };
    }

    if (!booking) {
      return { ok: false, reason: "booking_render_failed" };
    }

    return { ok: true, booking: booking };
  }

  global.CdBookingExecutor = {
    CD_BOOKING_INCOMPLETE: CD_BOOKING_INCOMPLETE,
    CD_BOOKING_NOT_IN_SCOPE: CD_BOOKING_NOT_IN_SCOPE,
    CD_BOOKING_SECTION_MISSING: CD_BOOKING_SECTION_MISSING,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
