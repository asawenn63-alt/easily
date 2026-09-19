/* Editor-only bridge. Never persisted into the website's source files. */
(function () {
  'use strict';
  const params = new URL(document.currentScript.src).searchParams;
  const token = params.get('token');
  const revisionId = params.get('revision');
  let active = null;
  let selectedEditable = null;
  let selectedText = null;
  let pending = false;
  let locked = false;
  const style = document.createElement('style');
  style.textContent = '[data-easily-heading],[data-easily-text]{cursor:text}[data-easily-image]{cursor:pointer}[data-easily-heading]:hover,[data-easily-text]:hover,[data-easily-image]:hover{outline:1px dashed #487a61;outline-offset:5px}[data-easily-selected]{outline:2px solid #487a61!important;outline-offset:5px}[data-easily-heading] [contenteditable],[data-easily-text] [contenteditable]{outline:none}[data-easily-storefront-section],[data-easily-content-section]{position:relative}.easily-editor-section-tools{position:absolute;z-index:999;top:10px;right:10px;display:flex;gap:6px}.easily-editor-section-tools button{border:1px solid #315d49!important;border-radius:6px!important;padding:7px 10px!important;background:#fff!important;color:#315d49!important;font:600 13px/1.2 system-ui,sans-serif!important;box-shadow:0 3px 12px rgba(0,0,0,.14)!important;cursor:pointer!important}.easily-editor-section-tools [data-easily-remove-storefront],.easily-editor-section-tools [data-easily-remove-content]{border-color:#9d3b3b!important;color:#8a2929!important}';
  document.head.appendChild(style);
  document.querySelectorAll('[data-easily-storefront-section]').forEach(section => {
    const tools = document.createElement('div'); tools.className = 'easily-editor-section-tools';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Redigera sektion';
    edit.setAttribute('data-easily-edit-section', section.dataset.easilyStorefrontSection || ''); edit.setAttribute('data-easily-section-type', 'storefront');
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Ta bort sektion';
    remove.setAttribute('data-easily-remove-storefront', section.dataset.easilyStorefrontSection || '');
    tools.append(edit, remove); section.appendChild(tools);
  });
  document.querySelectorAll('[data-easily-content-section]').forEach(section => {
    const tools = document.createElement('div'); tools.className = 'easily-editor-section-tools';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Redigera sektion';
    edit.setAttribute('data-easily-edit-section', section.dataset.easilyContentSection || ''); edit.setAttribute('data-easily-section-type', 'content');
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Ta bort sektion';
    remove.setAttribute('data-easily-remove-content', section.dataset.easilyContentSection || '');
    tools.append(edit, remove); section.appendChild(tools);
  });
  document.querySelectorAll('[data-easily-heading],[data-easily-text]').forEach(element => {
    if (!element.hasAttribute('tabindex')) element.tabIndex = 0;
  });
  function send(type, payload) { parent.postMessage({ channel: 'easily-document', token, revisionId, type, ...payload }, '*'); }
  let scrollFrame = 0;
  window.addEventListener('scroll', function () {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(function () {
      scrollFrame = 0;
      send('scroll-position', { y: Math.max(0, window.scrollY || document.documentElement.scrollTop || 0) });
    });
  }, { passive: true });
  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }
  function colorHex(value) {
    const parts = value.match(/\d+(?:\.\d+)?/g);
    if (!parts || parts.length < 3) return '#000000';
    return '#' + parts.slice(0, 3).map(part => Math.max(0, Math.min(255, Math.round(Number(part)))).toString(16).padStart(2, '0')).join('');
  }
  function fontFamilyChoice(value) {
    const family = String(value || '').toLowerCase();
    if (family.includes('segoe print') || family.includes('bradley hand') || family.includes('comic sans')) return 'playful';
    if (family.includes('georgia') || family.includes('times new roman')) return 'serif';
    if (family.includes('inter')) return 'modern';
    if (family.includes('system-ui')) return 'system';
    if (family.includes('arial') || family.includes('helvetica')) return 'sans';
    return '';
  }
  function fontWeightValue(value) {
    if (/^\d+$/.test(value)) return String(Math.max(400, Math.min(900, Math.round(Number(value) / 100) * 100)));
    return value === 'bold' ? '700' : '400';
  }
  function imagePositionChoice(value) {
    const position = String(value || '').toLowerCase().trim();
    if (position === 'top' || position === '50% 0%') return 'top';
    if (position === 'bottom' || position === '50% 100%') return 'bottom';
    if (position === 'left' || position === '0% 50%') return 'left';
    if (position === 'right' || position === '100% 50%') return 'right';
    return 'center';
  }
  function finish(cancel) {
    if (!active) return;
    const { editor, original, kind, key, textIndex } = active;
    const text = cancel ? original : editor.textContent;
    active = null;
    selectedText = document.createTextNode(text);
    editor.replaceWith(selectedText);
    if (text === original) { send('edit-finished'); return; }
    pending = true;
    send('text-change', { kind, key, textIndex, text, scrollY: Math.max(0, window.scrollY || document.documentElement.scrollTop || 0) });
  }
  function beginEdit() {
    const element = selectedEditable;
    if (!element || active || pending) return;
    const nodes = textNodes(element);
    // Generated scripts may replace text at runtime. Never map changed DOM positions
    // back into unrelated source text: only source-identical headings are editable.
    const sourceTexts = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(element.dataset.easilyTexts), c => c.charCodeAt(0))));
    const decoder = document.createElement('textarea');
    const matchesSource = sourceTexts.length === nodes.length && sourceTexts.every((raw, index) => {
      decoder.innerHTML = raw;
      return decoder.value.replace(/\r\n?/g, '\n') === nodes[index].textContent;
    });
    if (!matchesSource) { send('unsupported-text'); return; }
    const selected = nodes.includes(selectedText) ? selectedText : nodes.find(node => node.textContent.trim());
    if (!selected) return;
    const editor = document.createElement('span');
    editor.contentEditable = 'true';
    editor.setAttribute('role', 'textbox');
    const kind = element.hasAttribute('data-easily-heading') ? 'heading' : 'text';
    editor.setAttribute('aria-label', kind === 'heading' ? 'Redigera rubrik' : 'Redigera text');
    editor.textContent = selected.textContent;
    active = { editor, original: selected.textContent, kind, key: kind === 'heading' ? element.dataset.easilyHeading : element.dataset.easilyText, textIndex: nodes.indexOf(selected) };
    send('edit-started');
    selected.replaceWith(editor);
    editor.addEventListener('paste', function (e) {
      e.preventDefault();
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const insert = selection.getRangeAt(0);
      insert.deleteContents();
      const text = document.createTextNode(e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' '));
      insert.insertNode(text);
      insert.setStartAfter(text); insert.collapse(true);
      selection.removeAllRanges(); selection.addRange(insert);
    });
    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finish(e.key === 'Escape'); }
    });
    editor.focus();
    const selection = window.getSelection();
    const all = document.createRange(); all.selectNodeContents(editor);
    selection.removeAllRanges(); selection.addRange(all);
  }
  function selectEditable(element, textNode) {
    selectedEditable?.removeAttribute('data-easily-selected');
    selectedEditable = element;
    selectedText = textNode;
    element.setAttribute('data-easily-selected', 'true');
    const kind = element.hasAttribute('data-easily-heading') ? 'heading' : element.dataset.easilyKind || 'text';
    const nodes = textNodes(element);
    const selected = nodes.includes(textNode) ? textNode : nodes.find(node => node.textContent.trim()) || nodes[0];
    const computed = getComputedStyle(element);
    send('text-selected', {
      kind,
      key: kind === 'heading' ? element.dataset.easilyHeading : element.dataset.easilyText,
      href: kind === 'a' ? element.getAttribute('href') || '' : kind === 'button' ? element.getAttribute('data-easily-href') || '' : '',
      textIndex: selected ? nodes.indexOf(selected) : -1,
      text: selected?.textContent || '',
      fontFamily: fontFamilyChoice(computed.fontFamily),
      fontSize: Math.round(parseFloat(computed.fontSize) || 16),
      color: colorHex(computed.color),
      fontWeight: fontWeightValue(computed.fontWeight),
      fontStyle: computed.fontStyle === 'italic' || computed.fontStyle === 'oblique' ? 'italic' : 'normal',
      scrollY: Math.max(0, window.scrollY || document.documentElement.scrollTop || 0)
    });
  }
  document.addEventListener('click', function (event) {
    if (locked) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const editSection = event.target.closest?.('[data-easily-edit-section]');
    if (editSection) {
      event.preventDefault(); event.stopImmediatePropagation();
      send('section-selected', { kind: editSection.getAttribute('data-easily-edit-section') || '', sectionType: editSection.getAttribute('data-easily-section-type') || '' });
      return;
    }
    const removeSection = event.target.closest?.('[data-easily-remove-storefront]');
    if (removeSection) {
      event.preventDefault(); event.stopImmediatePropagation();
      send('remove-storefront', { kind: removeSection.getAttribute('data-easily-remove-storefront') || '' });
      return;
    }
    const removeContent = event.target.closest?.('[data-easily-remove-content]');
    if (removeContent) {
      event.preventDefault(); event.stopImmediatePropagation();
      send('remove-content', { kind: removeContent.getAttribute('data-easily-remove-content') || '' });
      return;
    }
    const image = event.target.closest?.('[data-easily-image]');
    if (image && !active && !pending) {
      event.preventDefault(); event.stopImmediatePropagation();
      document.querySelector('[data-easily-selected]')?.removeAttribute('data-easily-selected');
      selectedEditable = null; selectedText = null; image.setAttribute('data-easily-selected', 'true');
      const box = image.getBoundingClientRect();
      const computed = getComputedStyle(image);
      send('image-selected', {
        image: image.dataset.easilyImage,
        src: image.getAttribute('src') || '',
        alt: image.getAttribute('alt') || '',
        aspectRatio: box.height > 0 ? box.width / box.height : image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1,
        fit: computed.objectFit === 'contain' ? 'contain' : 'cover',
        position: imagePositionChoice(computed.objectPosition)
      });
      return;
    }
    const element = event.target.closest?.('[data-easily-heading],[data-easily-text]');
    if (!element) return;
    if (active) {
      if (!event.target.closest?.('[contenteditable]')) { event.preventDefault(); event.stopImmediatePropagation(); }
      return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    if (pending) return;
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    selectEditable(element, range?.startContainer);
    beginEdit();
  }, true);
  document.addEventListener('keydown', function (event) {
    if (locked || active || pending || !['Enter', ' '].includes(event.key)) return;
    const element = event.target.closest?.('[data-easily-heading],[data-easily-text]');
    if (!element) return;
    event.preventDefault(); event.stopImmediatePropagation();
    selectEditable(element, null);
    beginEdit();
  }, true);
  window.addEventListener('message', function (event) {
    if (event.source !== parent || event.data?.channel !== 'easily-document' || event.data.token !== token || event.data.revisionId !== revisionId) return;
    if (event.data.type === 'finish-edit') finish(false);
    if (event.data.type === 'lock-editing') locked = true;
    if (event.data.type === 'unlock-editing') locked = false;
    if (event.data.type === 'start-edit' && !locked) beginEdit();
    if (event.data.type === 'cancel-edit') finish(true);
    if (event.data.type === 'restore-scroll' && Number.isFinite(Number(event.data.y))) {
      const y = Math.max(0, Number(event.data.y));
      const restore = () => window.scrollTo({ top: y, left: 0, behavior: 'auto' });
      restore();
      requestAnimationFrame(() => requestAnimationFrame(restore));
      setTimeout(restore, 120);
    }
    if (event.data.type === 'scroll-storefront' && /^[a-z-]+$/.test(event.data.kind || '')) {
      document.querySelector(`[data-easily-storefront-section="${event.data.kind}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (event.data.type === 'scroll-content' && /^[a-z-]+$/.test(event.data.kind || '')) {
      document.querySelector(`[data-easily-content-section="${event.data.kind}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  send('ready', {
    pageText: String(document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 12000),
    storefrontKinds: Array.from(document.querySelectorAll('[data-easily-storefront-section]'), section => section.dataset.easilyStorefrontSection).filter(Boolean),
    contentKinds: Array.from(document.querySelectorAll('[data-easily-content-section]'), section => section.dataset.easilyContentSection).filter(Boolean)
  });
})();
