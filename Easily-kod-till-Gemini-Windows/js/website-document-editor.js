(function (global) {
  'use strict';
  let context = null;
  let toolbar, status, desktopButton, mobileButton, editButton, linkButton, linkInput, linkSaveButton, linkCancelButton, imageButton, imageInput, saveButton, cancelButton, reloadButton, undoButton, redoButton, versionsButton, publishButton, versionsPanel, chatLog;
  let contextPanel, contextTitle, contextHint, contextText, contextTextSave, contextTextCancel, contextStyleGroup, contextFontFamily, contextFontSize, contextColor, contextFontWeight, contextFontStyle, contextStyleSave, contextLinkGroup, contextLinkCaption, contextImageGroup, contextImageFit, contextImagePosition, contextImageStyleSave, contextImagePrompt, contextImageGenerateButton, contextSectionGroup;
  const messages = {
    'revision-conflict': 'En nyare version finns. Din text är kvar här men har inte sparats. Kopiera den innan du laddar den sparade versionen.',
    'conversation-conflict': 'Samtalet har uppdaterats i en annan flik. Din instruktion är kvar. Ladda den sparade versionen och skicka igen.',
    'generation-source-mismatch': 'Genereringsfilerna matchar inte projektet. Ingen annan sida har öppnats.',
    'ai-not-configured': 'AI-anslutningen är inte tillgänglig. Sidan är oförändrad.',
    'ai-unavailable': 'AI kunde inte slutföra ändringen. Din instruktion är kvar; försök igen.',
    'unsupported-ai-edit': 'Ändringen kunde inte genomföras säkert. Sidan är oförändrad. Prova en avgränsad text- eller sektionsändring.',
    'storefront-section-exists': 'Den här butiksektionen finns redan på sidan.',
    'storefront-section-not-found': 'Sektionen finns inte längre på sidan.',
    'content-section-exists': 'Den här sektionen finns redan på sidan.',
    'content-section-not-found': 'Sektionen finns inte längre på sidan.',
  };
  const contentCatalog = [
    { label: 'Om oss', description: 'En färdig sektion med rubrik, text och bild om verksamheten.', kind: 'about', type: 'content' }
  ];
  const storefrontCatalog = [
    { label: 'Nyheter', description: 'Visar butikens senaste produkter i ett tydligt produktgalleri.', kind: 'new-arrivals', type: 'storefront' },
    { label: 'Rea', description: 'Lyfter fram prissänkta produkter med tydlig rea-markering.', kind: 'sale', type: 'storefront' },
    { label: 'Utvalda produkter', description: 'Visar ett handplockat urval av produkter på startsidan.', kind: 'featured', type: 'storefront' },
    { label: 'Våra favoriter', description: 'Samlar butikens egna favoriter i en varm, redaktionell sektion.', kind: 'favorites', type: 'storefront' },
    { label: 'Kampanj', description: 'En större kampanjyta med bild, rubrik, text och uppmaning.', kind: 'campaign', type: 'storefront' },
    { label: 'Kategorier', description: 'Ger besökaren tydliga ingångar till butikens olika kategorier.', kind: 'categories', type: 'storefront' }
  ];
  function show(text) { if (status) status.textContent = text; }
  function command(type, payload) {
    const ctx = context;
    ctx?.frame?.contentWindow?.postMessage({ channel: 'easily-document', token: ctx.token, revisionId: ctx.revisionId, type, ...(payload || {}) }, '*');
  }
  function controls() {
    if (!toolbar) return;
    const ctx = context;
    editButton.hidden = !ctx?.selected || !!ctx?.editing || !!ctx?.pending || !!ctx?.linkEditing;
    if (linkButton) linkButton.hidden = !ctx?.selectedLink || !!ctx?.editing || !!ctx?.pending || !!ctx?.linkEditing;
    if (linkInput) linkInput.hidden = !ctx?.linkEditing;
    if (linkSaveButton) linkSaveButton.hidden = !ctx?.linkEditing;
    if (linkCancelButton) linkCancelButton.hidden = !ctx?.linkEditing;
    if (imageButton) imageButton.hidden = !ctx?.selectedImage || !!ctx?.editing || !!ctx?.pending || !!ctx?.linkEditing;
    saveButton.hidden = !ctx?.editing && !ctx?.pending;
    cancelButton.hidden = !ctx?.editing;
    reloadButton.hidden = !ctx?.loadError && !ctx?.pending;
    for (const button of [editButton, linkButton, linkSaveButton, linkCancelButton, imageButton, saveButton, cancelButton, reloadButton]) button.disabled = !!ctx?.saving;
    if (contextText) contextText.disabled = !!ctx?.saving;
    if (contextTextSave) contextTextSave.disabled = !!ctx?.saving;
    if (contextTextCancel) contextTextCancel.disabled = !!ctx?.saving;
    for (const field of [contextFontFamily, contextFontSize, contextColor, contextFontWeight, contextFontStyle, contextStyleSave]) if (field) field.disabled = !!ctx?.saving;
    for (const field of [contextImageFit, contextImagePosition, contextImageStyleSave, contextImagePrompt, contextImageGenerateButton]) if (field) field.disabled = !!ctx?.saving;
    contextSectionGroup?.querySelectorAll('button').forEach(button => { button.disabled = !!ctx?.saving; });
    if (undoButton) undoButton.disabled = !!ctx?.saving || !ctx?.canUndo;
    if (redoButton) redoButton.disabled = !!ctx?.saving || !ctx?.redoRevision;
    if (versionsButton) versionsButton.disabled = !!ctx?.saving || !ctx?.versions?.length;
    if (publishButton) publishButton.disabled = !!ctx?.saving || !ctx?.revisionId;
    if (desktopButton) desktopButton.disabled = !!ctx?.saving;
    if (mobileButton) mobileButton.disabled = !!ctx?.saving;
    if (ctx) {
      ctx.frame.inert = !!ctx.saving;
      const send = document.getElementById('welcomeGenerateBtn');
      if (send) { send.textContent = ctx.saving ? 'Arbetar…' : 'Skicka till AI'; send.disabled = !!ctx.saving; }
    }
  }
  function chatMessage(text) {
    if (!chatLog) return;
    const message = document.createElement('p'); message.textContent = text; chatLog.appendChild(message);
    chatLog.scrollTop = chatLog.scrollHeight;
    return message;
  }
  function resetAddPanelScroll(root) {
    const scroller = root?.closest('.studio-panel__scroll');
    if (!scroller) return;
    scroller.scrollTop = 0;
    global.requestAnimationFrame?.(() => { scroller.scrollTop = 0; });
  }
  function renderAddCatalog() {
    const root = document.getElementById('websiteDocumentAddChoices');
    if (!root) return;
    root.replaceChildren(); root.hidden = false;
    resetAddPanelScroll(root);
    setAddHeading('Vad vill du lägga till?', 'Välj en färdig butiksektion. Den läggs längst ned på startsidan och visas direkt.');
    const placement = document.createElement('p');
    placement.className = 'website-document-add__placement';
    placement.textContent = 'Placering: längst ned på startsidan';
    const addGroup = (title, items, existing) => {
      const heading = document.createElement('h3'); heading.className = 'website-document-add__section-title'; heading.textContent = title;
      const list = document.createElement('div'); list.className = 'website-document-add__list';
      items.forEach(({ label, description, kind, type }) => {
      const isAdded = existing.has(kind);
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-storefront-kind', kind);
      button.setAttribute('data-section-type', type);
      button.setAttribute('data-document-add-label', label);
      if (isAdded) { button.classList.add('is-added'); button.setAttribute('data-section-existing', 'true'); }
      const copy = document.createElement('span'); copy.className = 'website-document-add__copy';
      const name = document.createElement('strong'); name.textContent = label;
      const help = document.createElement('span'); help.textContent = description;
      const action = document.createElement('span'); action.className = 'website-document-add__action'; action.textContent = isAdded ? 'Visa och redigera →' : 'Lägg till direkt →';
      copy.append(name, help); button.append(copy, action); list.appendChild(button);
      });
      root.append(heading, list);
    };
    root.appendChild(placement);
    addGroup('Webbsida', contentCatalog, context?.contentKinds || new Set());
    addGroup('Butik', storefrontCatalog, context?.storefrontKinds || new Set());
    show('Välj en sektion. Easily lägger in den längst ned och visar den för dig.');
  }
  function setAddHeading(title, lead) {
    const heading = document.getElementById('websiteDocumentAddTitle');
    const copy = document.getElementById('websiteDocumentAddLead');
    if (heading) heading.textContent = title;
    if (copy) copy.textContent = lead;
  }
  function setAiScope(target) {
    if (!context) return;
    context.aiTarget = target || null;
    const scope = document.getElementById('websiteDocumentAiScope');
    const label = document.getElementById('websiteDocumentAiScopeLabel');
    const input = document.getElementById('welcomeBusinessDescription');
    if (scope) scope.hidden = !target;
    if (label) label.textContent = target ? `${target.label}-sektionen` : '';
    if (input) input.placeholder = target ? `Vad vill du ändra i ${target.label}-sektionen?` : 'Skriv här…';
  }
  function showAddedStorefrontChoices(target) {
    const root = document.getElementById('websiteDocumentAddChoices');
    if (!root || !target) return;
    root.hidden = false; root.replaceChildren();
    resetAddPanelScroll(root);
    setAddHeading(`${target.label} finns nu på sidan`, 'Vi har visat sektionen på startsidan. Den följer webbplatsens färger och typsnitt.');
    const back = document.createElement('button'); back.type = 'button'; back.className = 'website-document-add__back'; back.textContent = '← Tillbaka till alla sektioner'; back.addEventListener('click', renderAddCatalog); root.appendChild(back);
    const done = document.createElement('p'); done.className = 'website-document-add__done'; done.textContent = 'Klart ✓'; root.appendChild(done);
    const actions = document.createElement('div'); actions.className = 'website-document-add__next';
    const ai = document.createElement('button'); ai.type = 'button'; ai.className = 'website-document-primary'; ai.textContent = 'Anpassa med AI';
    ai.addEventListener('click', () => {
      setAiScope(target);
      global.StudioPanelModes?.switchTab?.('ai');
      chatMessage(`AI arbetar nu med ${target.label}-sektionen. Beskriv vad du vill ändra.`);
      document.getElementById('welcomeBusinessDescription')?.focus();
    });
    const manual = document.createElement('button'); manual.type = 'button'; manual.textContent = 'Ändra själv';
    manual.addEventListener('click', () => {
      global.StudioPanelModes?.switchTab?.('manual');
      if (contextTitle) contextTitle.textContent = `${target.label}-sektionen`;
      if (contextHint) contextHint.textContent = 'Klicka på en text eller bild i sektionen för att ändra den här.';
      show(`Ändra själv: klicka på en text eller bild i ${target.label}-sektionen.`);
      command(target.type === 'content' ? 'scroll-content' : 'scroll-storefront', { kind: target.kind });
    });
    const more = document.createElement('button'); more.type = 'button'; more.className = 'website-document-add__again'; more.textContent = 'Lägg till en sektion till'; more.addEventListener('click', renderAddCatalog);
    actions.append(ai, manual, more); root.appendChild(actions);
  }
  async function recoverSectionAdd(ctx, target) {
    try {
      const latest = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/open`, { method: 'POST', body: {} });
      if (!latest?.ok) throw new Error(latest?.error || 'document-open-failed');
      if (context !== ctx) return true;
      ctx.retrySectionAdd = target;
      ctx.savedMessage = 'Easily hämtade den senaste sparade versionen och fortsätter lägga till sektionen.';
      mount(ctx, latest);
      return true;
    } catch {
      return false;
    }
  }
  async function addStorefrontSection(kind, label) {
    const ctx = context;
    if (!ctx || ctx.saving) return;
    ctx.saving = true; controls(); show(`Lägger till ${label}…`);
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/storefront-section`, { method: 'POST', body: { baseRevision: ctx.revisionId, kind } });
      ctx.saving = false;
      ctx.scrollToStorefront = kind;
      ctx.addedStorefront = { kind, label, type: 'storefront', selector: 'data-easily-storefront-section' };
      ctx.savedMessage = `${label} har lagts till med platshållare.`;
      mount(ctx, result);
    } catch (error) {
      if (error.message === 'revision-conflict') {
        ctx.saving = false;
        if (await recoverSectionAdd(ctx, { type: 'storefront', kind, label })) return;
      }
      show(messages[error.message] || 'Sektionen kunde inte läggas till. Webbplatsen är oförändrad.');
      ctx.saving = false; controls();
    }
  }
  async function addContentSection(kind, label) {
    const ctx = context;
    if (!ctx || ctx.saving) return;
    ctx.saving = true; controls(); show(`Lägger till ${label}…`);
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/content-section`, { method: 'POST', body: { baseRevision: ctx.revisionId, kind } });
      ctx.saving = false;
      ctx.scrollToContent = kind;
      ctx.addedStorefront = { kind, label, type: 'content', selector: 'data-easily-content-section' };
      ctx.savedMessage = `${label} har lagts till på sidan.`;
      mount(ctx, result);
    } catch (error) {
      if (error.message === 'revision-conflict') {
        ctx.saving = false;
        if (await recoverSectionAdd(ctx, { type: 'content', kind, label })) return;
      }
      show(messages[error.message] || 'Sektionen kunde inte läggas till. Webbplatsen är oförändrad.');
      ctx.saving = false; controls();
    }
  }
  async function removeStorefrontSection(kind) {
    const ctx = context;
    if (!ctx || ctx.saving || !/^[a-z-]+$/.test(kind || '')) return;
    ctx.saving = true; controls(); show('Tar bort sektionen…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/storefront-remove`, { method: 'POST', body: { baseRevision: ctx.revisionId, kind } });
      ctx.saving = false;
      if (ctx.aiTarget?.kind === kind) setAiScope(null);
      ctx.savedMessage = 'Sektionen är borttagen. Alla andra ändringar finns kvar.';
      mount(ctx, result);
    } catch (error) {
      show(messages[error.message] || 'Sektionen kunde inte tas bort. Webbplatsen är oförändrad.');
      ctx.saving = false; controls();
    }
  }
  async function removeContentSection(kind) {
    const ctx = context;
    if (!ctx || ctx.saving || !/^[a-z-]+$/.test(kind || '')) return;
    ctx.saving = true; controls(); show('Tar bort sektionen…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/content-remove`, { method: 'POST', body: { baseRevision: ctx.revisionId, kind } });
      ctx.saving = false;
      if (ctx.aiTarget?.type === 'content' && ctx.aiTarget.kind === kind) setAiScope(null);
      ctx.savedMessage = 'Sektionen är borttagen. Alla andra ändringar finns kvar.';
      mount(ctx, result);
    } catch (error) {
      show(messages[error.message] || 'Sektionen kunde inte tas bort. Webbplatsen är oförändrad.');
      ctx.saving = false; controls();
    }
  }
  function renderAddRecommendations(pageText) {
    // Inga automatiska genvägar till AI här. Användaren väljer själv
    // innehåll under Lägg till och hanterar produkter under Butik.
  }
  function renderProductManager(products) {
    const root = document.getElementById('websiteDocumentProductList');
    if (!root) return;
    root.replaceChildren();
    if (!Array.isArray(products) || !products.length) {
      const empty = document.createElement('p'); empty.className = 'website-document-products__empty'; empty.textContent = 'Inga produkter ännu.'; root.appendChild(empty); return;
    }
    const block = document.createElement('section'); block.className = 'website-document-products';
    const title = document.createElement('h3'); title.textContent = 'Dina produkter'; block.appendChild(title);
    products.forEach(product => {
      const row = document.createElement('article');
      const copy = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = product.name;
      const price = document.createElement('span'); price.textContent = product.price;
      copy.append(name, price);
      const actions = document.createElement('div');
      if (!product.placed) {
        const place = document.createElement('button'); place.type = 'button'; place.textContent = 'Visa på sidan'; place.setAttribute('data-product-action', 'place'); place.setAttribute('data-product-id', product.id); actions.appendChild(place);
      } else {
        const placed = document.createElement('span'); placed.className = 'website-document-products__placed'; placed.textContent = 'Visas på sidan'; actions.appendChild(placed);
      }
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Ändra'; edit.setAttribute('data-product-action', 'edit'); edit.setAttribute('data-product-id', product.id);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Ta bort'; remove.setAttribute('data-product-action', 'remove'); remove.setAttribute('data-product-id', product.id);
      actions.append(edit, remove); row.append(copy, actions); block.appendChild(row);
    });
    root.prepend(block);
  }
  async function refreshProducts(ctx) {
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/products`, { method: 'POST', body: {} });
      if (context !== ctx || !result?.ok) return;
      ctx.products = result.products || [];
      renderProductManager(ctx.products);
    } catch { /* Produktlistan får aldrig blockera resten av editorn. */ }
  }
  function simplifyWorkspaceTabs(active) {
    const addTab = document.getElementById('studioTabAdd');
    if (addTab) addTab.hidden = !active;
    const shopTab = document.getElementById('studioTabShop');
    if (shopTab) shopTab.hidden = true;
    for (const id of ['studioTabDesign', 'studioTabMaterial']) {
      const tab = document.getElementById(id);
      if (tab) tab.hidden = !!active;
    }
    if (active) {
      for (const id of ['studioPanelDesign', 'studioPanelMaterial']) {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = true;
      }
    } else {
      const addPanel = document.getElementById('studioPanelAdd');
      if (addPanel) addPanel.hidden = true;
    }
  }
  function setProductFormOpen(open, product) {
    const home = document.getElementById('websiteDocumentShopHome');
    const form = document.getElementById('websiteDocumentProductForm');
    if (!home || !form) return;
    global.StudioPanelModes?.switchTab?.('shop');
    home.hidden = !!open; form.hidden = !open;
    if (!open) { form.reset(); delete form.dataset.productId; }
    if (open) {
      const editing = !!product;
      form.dataset.productId = product?.id || '';
      form.querySelector('h3').textContent = editing ? 'Ändra produkt' : 'Lägg till en produkt';
      document.getElementById('websiteDocumentProductName').value = product?.name || '';
      document.getElementById('websiteDocumentProductDescription').value = product?.description || '';
      document.getElementById('websiteDocumentProductPrice').value = product?.price || '';
      document.getElementById('websiteDocumentProductCategory').value = product?.category || '';
      const image = document.getElementById('websiteDocumentProductImage'); image.required = !editing;
      const fileLabel = document.getElementById('websiteDocumentProductFile'); if (fileLabel) fileLabel.textContent = editing ? 'Nuvarande bild behålls om du inte väljer en ny.' : 'Ingen bild vald';
      const save = document.getElementById('websiteDocumentProductSave'); if (save) save.textContent = editing ? 'Spara produkt' : 'Lägg till produkten';
      document.getElementById('websiteDocumentProductName')?.focus();
    }
  }
  function setProductPlacementOpen(open) {
    const choices = document.getElementById('websiteDocumentAddChoices');
    const form = document.getElementById('websiteDocumentProductPlacementForm');
    const select = document.getElementById('websiteDocumentProductPlacement');
    if (!choices || !form || !select) return false;
    if (open) {
      const available = (context?.products || []).filter(product => !product.placed);
      if (!available.length) {
        if (!(context?.products || []).length) { setProductFormOpen(true); show('Lägg först till en produkt i Butik. Den placeras inte automatiskt på sidan.'); }
        else show('Alla sparade produkter finns redan på sidan.');
        return false;
      }
      select.replaceChildren();
      for (const product of available) { const option = document.createElement('option'); option.value = product.id; option.textContent = `${product.name} – ${product.price}`; select.appendChild(option); }
    }
    choices.hidden = !!open; form.hidden = !open;
    return true;
  }
  async function placeProductById(productId) {
    const ctx = context;
    if (!ctx || ctx.saving || !productId) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Lägger till den valda produkten på sidan…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/product-section`, { method: 'POST', body: { baseRevision: ctx.revisionId, conversationVersion: ctx.conversationVersion, requestId: crypto.randomUUID(), productId }, timeoutMs: 110000 });
      if (!result?.ok) throw new Error(result?.error || 'product-place-failed');
      if (context !== ctx) return;
      ctx.savedMessage = 'Produkten visas nu på sidan och är sparad som en ny version.'; mount(ctx, result);
    } catch (error) {
      if (context === ctx) show(error.message === 'product-already-placed' ? 'Produkten finns redan på sidan.' : 'Produkten kunde inte placeras. Webbplatsen är oförändrad.');
    } finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  async function saveProduct(event) {
    event.preventDefault();
    const ctx = context;
    const form = document.getElementById('websiteDocumentProductForm');
    const imageFile = document.getElementById('websiteDocumentProductImage')?.files?.[0];
    if (!ctx || !form || ctx.saving) return;
    if (!form.reportValidity()) return;
    const productId = form.dataset.productId || '';
    if (!imageFile && !productId) { show('Välj en produktbild först.'); return; }
    const saveProductButton = document.getElementById('websiteDocumentProductSave');
    ctx.saving = true; controls(); command('lock-editing');
    if (saveProductButton) { saveProductButton.disabled = true; saveProductButton.textContent = 'Lägger till…'; }
    show(productId ? 'Sparar produktändringen…' : 'Sparar produkten i butiken…');
    try {
      const dataUrl = imageFile ? await fileDataUrl(imageFile) : '';
      const body = {
        baseRevision: ctx.revisionId,
        conversationVersion: ctx.conversationVersion,
        requestId: crypto.randomUUID(),
        name: document.getElementById('websiteDocumentProductName').value.trim(),
        description: document.getElementById('websiteDocumentProductDescription').value.trim(),
        price: document.getElementById('websiteDocumentProductPrice').value.trim(),
        category: document.getElementById('websiteDocumentProductCategory').value.trim(),
        ...(productId ? { productId } : {}),
        ...(dataUrl ? { imageDataUrl: dataUrl, imageAlt: String(imageFile.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 500) } : {})
      };
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/product`, { method: 'POST', body, timeoutMs: 110000 });
      if (!result?.ok) throw new Error(result?.error || 'product-save-failed');
      if (context !== ctx) return;
      form.reset();
      const fileLabel = document.getElementById('websiteDocumentProductFile'); if (fileLabel) fileLabel.textContent = 'Ingen bild vald';
      setProductFormOpen(false);
      ctx.savedMessage = productId ? 'Produkten är ändrad och sparad som en ny version.' : 'Produkten är sparad i butiken. Den har inte placerats på sidan.';
      mount(ctx, result);
    } catch (error) {
      if (context === ctx) show(error.message === 'invalid-image' || error.message === 'invalid-product' ? 'Kontrollera produktens uppgifter och välj PNG, JPG, WebP eller GIF, högst 5 MB.' : 'Produkten kunde inte läggas till. Webbplatsen är oförändrad och uppgifterna finns kvar i formuläret.');
    } finally {
      ctx.saving = false;
      if (saveProductButton) { saveProductButton.disabled = false; saveProductButton.textContent = productId ? 'Spara produkt' : 'Lägg till produkten'; }
      if (context === ctx) { controls(); command('unlock-editing'); }
    }
  }
  async function removeProduct(product) {
    const ctx = context;
    if (!ctx || ctx.saving || !product) return;
    if (!global.confirm(`Ta bort ${product.name} från webbplatsen? Du kan återställa produkten via Ångra.`)) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Tar bort produkten…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/product-remove`, { method: 'POST', body: { baseRevision: ctx.revisionId, productId: product.id } });
      if (!result?.ok) throw new Error(result?.error || 'product-remove-failed');
      if (context !== ctx) return;
      ctx.savedMessage = 'Produkten är borttagen. Du kan återställa den med Ångra.'; mount(ctx, result);
    } catch { if (context === ctx) show('Produkten kunde inte tas bort. Webbplatsen är oförändrad.'); }
    finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  function handleProductAction(event) {
    const control = event.target.closest?.('[data-product-action]');
    if (!control) return;
    const product = context?.products?.find(item => item.id === control.getAttribute('data-product-id'));
    if (control.getAttribute('data-product-action') === 'place') placeProductById(product?.id);
    else if (control.getAttribute('data-product-action') === 'edit') setProductFormOpen(true, product);
    else if (control.getAttribute('data-product-action') === 'remove') removeProduct(product);
  }
  function switchToContextPanel() {
    const manualPanel = document.getElementById('studioPanelManual');
    if (manualPanel) {
      document.querySelectorAll('[data-studio-tab]').forEach(button => {
        const on = button.dataset.studioTab === 'manual'; button.classList.toggle('is-active', on); button.setAttribute('aria-selected', String(on));
      });
      document.querySelectorAll('[data-studio-panel]').forEach(panel => { panel.hidden = panel.dataset.studioPanel !== 'manual'; });
      document.body.dataset.studioLeftTab = 'manual';
    }
    const legacy = document.getElementById('studioManualRoot');
    if (legacy) legacy.hidden = true;
    if (contextPanel) contextPanel.hidden = false;
  }
  function openTextPanel(ctx, message) {
    switchToContextPanel();
    ctx.selectedText = { kind: message.kind === 'heading' ? 'heading' : 'text', key: String(message.key), textIndex: message.textIndex };
    contextTitle.textContent = message.kind === 'heading' ? 'Redigera rubrik' : message.kind === 'button' ? 'Redigera knapp' : message.kind === 'a' ? 'Redigera länk' : 'Redigera text';
    contextHint.textContent = 'Skriv direkt på sidan eller i fältet här. Enter eller Spara text skapar en ny version. Escape avbryter.';
    contextText.value = message.text || '';
    contextText.hidden = false; contextTextSave.hidden = false; contextTextCancel.hidden = false;
    contextStyleGroup.hidden = false;
    contextFontFamily.value = ['', 'sans', 'serif', 'modern', 'system', 'playful'].includes(message.fontFamily)
      ? message.fontFamily
      : '';
    contextFontSize.value = String(Math.max(10, Math.min(200, Number(message.fontSize) || 16)));
    contextColor.value = /^#[0-9a-f]{6}$/i.test(message.color || '') ? message.color : '#000000';
    contextFontWeight.value = ['400', '500', '600', '700', '800', '900'].includes(String(message.fontWeight)) ? String(message.fontWeight) : '400';
    contextFontStyle.value = message.fontStyle === 'italic' ? 'italic' : 'normal';
    contextLinkGroup.hidden = !['a', 'button'].includes(message.kind);
    contextLinkCaption.textContent = message.kind === 'button' ? 'Vart ska knappen leda?' : 'Vart ska länken leda?';
    contextImageGroup.hidden = true; if (contextSectionGroup) contextSectionGroup.hidden = true;
  }
  function openImagePanel() {
    switchToContextPanel();
    contextTitle.textContent = 'Byt bild';
    contextHint.textContent = 'Välj en egen bild eller beskriv en ny. Den gamla bilden ligger kvar i tidigare versioner.';
    contextText.hidden = true; contextTextSave.hidden = true; contextTextCancel.hidden = true; contextStyleGroup.hidden = true;
    contextLinkGroup.hidden = true; contextImageGroup.hidden = false; if (contextSectionGroup) contextSectionGroup.hidden = true;
    contextImageFit.value = context?.selectedImage?.fit === 'contain' ? 'contain' : 'cover';
    contextImagePosition.value = ['center', 'top', 'bottom', 'left', 'right'].includes(context?.selectedImage?.position) ? context.selectedImage.position : 'center';
  }
  function sectionTarget(sectionType, kind) {
    const item = (sectionType === 'content' ? contentCatalog : sectionType === 'storefront' ? storefrontCatalog : []).find(entry => entry.kind === kind);
    return item ? { ...item, selector: sectionType === 'content' ? 'data-easily-content-section' : 'data-easily-storefront-section' } : null;
  }
  function openSectionPanel(target) {
    const ctx = context;
    if (!ctx || !target || !contextSectionGroup) return;
    switchToContextPanel(); ctx.selectedSection = target;
    contextTitle.textContent = `Redigera ${target.label}`;
    contextHint.textContent = 'Ändra innehållet direkt på sidan, flytta sektionen här eller använd AI för just den här sektionen.';
    contextText.hidden = true; contextTextSave.hidden = true; contextTextCancel.hidden = true; contextStyleGroup.hidden = true; contextLinkGroup.hidden = true; contextImageGroup.hidden = true; contextSectionGroup.hidden = false;
    command(target.type === 'content' ? 'scroll-content' : 'scroll-storefront', { kind: target.kind });
  }
  async function moveSelectedSection(direction) {
    const ctx = context, target = ctx?.selectedSection;
    if (!ctx || !target || ctx.saving || !['up', 'down', 'top', 'bottom'].includes(direction)) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Flyttar sektionen…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/section-move`, { method: 'POST', body: { baseRevision: ctx.revisionId, sectionType: target.type, kind: target.kind, direction } });
      if (!result?.ok) throw new Error(result?.error || 'section-move-failed');
      if (context !== ctx) return;
      ctx.reopenSection = target; ctx.savedMessage = `${target.label} har flyttats.`; mount(ctx, result);
    } catch (error) { if (context === ctx) show(messages[error.message] || 'Sektionen kunde inte flyttas. Webbplatsen är oförändrad.'); }
    finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  function saveContextText() {
    const ctx = context;
    if (!ctx?.selectedText || ctx.saving) return;
    ctx.pending = { ...ctx.selectedText, text: contextText.value };
    save(ctx);
  }
  async function saveContextStyle() {
    const ctx = context;
    if (!ctx?.selectedText || ctx.saving) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Sparar textens utseende…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/style`, {
        method: 'POST',
        body: {
          baseRevision: ctx.revisionId,
          kind: ctx.selectedText.kind,
          key: ctx.selectedText.key,
          fontFamily: contextFontFamily.value,
          fontSize: contextFontSize.value,
          color: contextColor.value,
          fontWeight: contextFontWeight.value,
          fontStyle: contextFontStyle.value
        }
      });
      if (!result?.ok) throw new Error(result?.error || 'style-save-failed');
      if (context !== ctx) return;
      ctx.savedMessage = 'Textens utseende är sparat.'; mount(ctx, result);
    } catch (error) {
      if (context === ctx) show('Utseendet kunde inte sparas. Webbplatsen är oförändrad.');
    } finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  function cancelContextText() {
    const ctx = context;
    if (!ctx || ctx.saving) return;
    ctx.selected = false; ctx.selectedText = null; ctx.selectedLink = null; ctx.linkEditing = false;
    contextTitle.textContent = 'Välj något på webbplatsen';
    contextHint.textContent = 'Klicka på en rubrik, text, knapp, länk eller bild för att redigera den här.';
    contextText.hidden = true; contextTextSave.hidden = true; contextTextCancel.hidden = true; contextStyleGroup.hidden = true; contextLinkGroup.hidden = true; contextImageGroup.hidden = true;
    controls(); show('Ingen ändring gjord.');
  }
  function setup(pane) {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.className = 'website-document-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Webbplatsdokument');
    status = document.createElement('span'); status.setAttribute('role', 'status');
    const label = document.createElement('strong'); label.textContent = 'Redigera webbplats';
    desktopButton = document.createElement('button'); desktopButton.type = 'button'; desktopButton.textContent = 'Dator'; desktopButton.setAttribute('aria-pressed', 'true'); desktopButton.addEventListener('click', () => setViewport('desktop'));
    mobileButton = document.createElement('button'); mobileButton.type = 'button'; mobileButton.textContent = 'Mobil'; mobileButton.setAttribute('aria-pressed', 'false'); mobileButton.addEventListener('click', () => setViewport('mobile'));
    editButton = document.createElement('button'); editButton.type = 'button'; editButton.textContent = 'Redigera rubrik';
    editButton.addEventListener('click', () => command('start-edit'));
    linkButton = document.createElement('button'); linkButton.type = 'button'; linkButton.textContent = 'Ändra länkmål';
    linkButton.addEventListener('click', beginLinkEdit);
    linkInput = document.createElement('input'); linkInput.type = 'text'; linkInput.className = 'website-document-link-input'; linkInput.placeholder = 'https://… eller #sektion'; linkInput.setAttribute('aria-label', 'Länkens mål');
    linkInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); saveLink(); } else if (event.key === 'Escape') { event.preventDefault(); cancelLinkEdit(); } });
    linkSaveButton = document.createElement('button'); linkSaveButton.type = 'button'; linkSaveButton.textContent = 'Spara länk'; linkSaveButton.className = 'website-document-primary'; linkSaveButton.addEventListener('click', saveLink);
    linkCancelButton = document.createElement('button'); linkCancelButton.type = 'button'; linkCancelButton.textContent = 'Avbryt'; linkCancelButton.addEventListener('click', cancelLinkEdit);
    imageButton = document.createElement('button'); imageButton.type = 'button'; imageButton.textContent = 'Byt bild';
    imageButton.addEventListener('click', () => imageInput.click());
    imageInput = document.createElement('input'); imageInput.type = 'file'; imageInput.accept = 'image/png,image/jpeg,image/webp,image/gif'; imageInput.hidden = true;
    imageInput.addEventListener('change', () => { const file = imageInput.files?.[0]; imageInput.value = ''; if (file) replaceImage(file); });
    cancelButton = document.createElement('button'); cancelButton.type = 'button'; cancelButton.textContent = 'Avbryt';
    cancelButton.addEventListener('click', () => command('cancel-edit'));
    saveButton = document.createElement('button'); saveButton.type = 'button'; saveButton.textContent = 'Spara';
    saveButton.className = 'website-document-primary';
    saveButton.addEventListener('click', function () {
      const ctx = context;
      if (!ctx) return;
      if (ctx.pending) save(ctx);
      else command('finish-edit');
    });
    reloadButton = document.createElement('button'); reloadButton.type = 'button'; reloadButton.textContent = 'Ladda sparad version';
    reloadButton.addEventListener('click', function () {
      if (context?.saving) return;
      if ((context?.pending || context?.editing) && !global.confirm('Den osparade rubriken tas bort från vyn. Ladda den sparade versionen?')) return;
      const ctx = context;
      if (ctx) { context = null; open(ctx.projectId, ctx.runId); }
    });
    undoButton = document.createElement('button'); undoButton.type = 'button'; undoButton.textContent = '↶';
    undoButton.title = 'Ångra senaste ändringen';
    undoButton.setAttribute('aria-label', 'Ångra senaste ändringen');
    undoButton.addEventListener('click', () => restoreVersion('undo'));
    redoButton = document.createElement('button'); redoButton.type = 'button'; redoButton.textContent = '↷';
    redoButton.title = 'Återställ senaste ångringen';
    redoButton.setAttribute('aria-label', 'Återställ senaste ångringen');
    redoButton.addEventListener('click', () => restoreVersion('redo'));
    versionsButton = document.createElement('button'); versionsButton.type = 'button'; versionsButton.textContent = 'Versioner';
    versionsButton.setAttribute('aria-expanded', 'false');
    versionsButton.addEventListener('click', () => { versionsPanel.hidden = !versionsPanel.hidden; versionsButton.setAttribute('aria-expanded', String(!versionsPanel.hidden)); });
    versionsPanel = document.createElement('div'); versionsPanel.className = 'website-document-versions'; versionsPanel.hidden = true;
    versionsPanel.setAttribute('aria-label', 'Versionshistorik');
    publishButton = document.createElement('button'); publishButton.type = 'button'; publishButton.textContent = 'Publicera'; publishButton.className = 'website-document-primary';
    publishButton.addEventListener('click', () => publishVersion(context?.revisionId));
    toolbar.append(label, status, desktopButton, mobileButton, undoButton, redoButton, versionsButton, publishButton, reloadButton);
    const appBar = document.querySelector('.studio-app-bar');
    const appBarRow = appBar?.querySelector('.studio-app-bar__row');
    if (appBar && appBarRow) {
      appBarRow.appendChild(toolbar);
      appBar.appendChild(versionsPanel);
    } else {
      pane.prepend(versionsPanel);
      pane.prepend(toolbar);
    }
    const manualScroll = document.querySelector('#studioPanelManual .studio-panel__scroll');
    if (manualScroll) {
      contextPanel = document.createElement('section'); contextPanel.className = 'website-document-context';
      contextPanel.setAttribute('aria-label', 'Redigera markerat innehåll');
      contextTitle = document.createElement('h2'); contextTitle.textContent = 'Välj något på webbplatsen';
      contextHint = document.createElement('p'); contextHint.textContent = 'Klicka på en rubrik, text, knapp, länk eller bild för att redigera den här.';
      contextText = document.createElement('textarea'); contextText.rows = 5; contextText.maxLength = 4000; contextText.hidden = true; contextText.setAttribute('aria-label', 'Text');
      const textActions = document.createElement('div'); textActions.className = 'website-document-context__actions';
      contextTextSave = document.createElement('button'); contextTextSave.type = 'button'; contextTextSave.textContent = 'Spara text'; contextTextSave.className = 'website-document-primary'; contextTextSave.hidden = true; contextTextSave.addEventListener('click', saveContextText);
      contextTextCancel = document.createElement('button'); contextTextCancel.type = 'button'; contextTextCancel.textContent = 'Avbryt'; contextTextCancel.hidden = true; contextTextCancel.addEventListener('click', cancelContextText);
      textActions.append(contextTextSave, contextTextCancel);
      contextStyleGroup = document.createElement('fieldset'); contextStyleGroup.className = 'website-document-context__style'; contextStyleGroup.hidden = true;
      const styleLegend = document.createElement('legend'); styleLegend.textContent = 'Utseende';
      const familyLabel = document.createElement('label'); familyLabel.textContent = 'Teckensnitt';
      contextFontFamily = document.createElement('select'); contextFontFamily.setAttribute('aria-label', 'Teckensnitt');
      for (const [value, text] of [['', 'Sidans typsnitt'], ['sans', 'Sans serif'], ['serif', 'Serif'], ['modern', 'Modern sans'], ['system', 'Systemtypsnitt'], ['playful', 'Handskrivet']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; contextFontFamily.appendChild(option); }
      familyLabel.appendChild(contextFontFamily);
      const sizeLabel = document.createElement('label'); sizeLabel.textContent = 'Storlek (px)';
      contextFontSize = document.createElement('input'); contextFontSize.type = 'number'; contextFontSize.min = '10'; contextFontSize.max = '200'; contextFontSize.step = '1'; contextFontSize.setAttribute('aria-label', 'Textstorlek'); sizeLabel.appendChild(contextFontSize);
      const colorLabel = document.createElement('label'); colorLabel.textContent = 'Färg';
      contextColor = document.createElement('input'); contextColor.type = 'color'; contextColor.setAttribute('aria-label', 'Textfärg'); colorLabel.appendChild(contextColor);
      const weightLabel = document.createElement('label'); weightLabel.textContent = 'Tjocklek';
      contextFontWeight = document.createElement('select'); contextFontWeight.setAttribute('aria-label', 'Texttjocklek');
      for (const [value, text] of [['400', 'Normal'], ['500', 'Medium'], ['600', 'Halvfet'], ['700', 'Fet'], ['800', 'Extra fet'], ['900', 'Svart']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; contextFontWeight.appendChild(option); }
      weightLabel.appendChild(contextFontWeight);
      const styleLabel = document.createElement('label'); styleLabel.textContent = 'Stil';
      contextFontStyle = document.createElement('select'); contextFontStyle.setAttribute('aria-label', 'Textstil');
      for (const [value, text] of [['normal', 'Rak'], ['italic', 'Kursiv']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; contextFontStyle.appendChild(option); }
      styleLabel.appendChild(contextFontStyle);
      contextStyleSave = document.createElement('button'); contextStyleSave.type = 'button'; contextStyleSave.textContent = 'Spara utseende'; contextStyleSave.className = 'website-document-primary'; contextStyleSave.addEventListener('click', saveContextStyle);
      contextStyleGroup.append(styleLegend, familyLabel, sizeLabel, colorLabel, weightLabel, styleLabel, contextStyleSave);
      contextLinkGroup = document.createElement('div'); contextLinkGroup.className = 'website-document-context__group'; contextLinkGroup.hidden = true;
      const linkLabel = document.createElement('label'); contextLinkCaption = document.createElement('span'); contextLinkCaption.textContent = 'Länkmål'; linkLabel.append(contextLinkCaption, linkInput);
      contextLinkGroup.append(linkLabel, linkSaveButton, linkCancelButton);
      contextImageGroup = document.createElement('div'); contextImageGroup.className = 'website-document-context__group website-document-context__image'; contextImageGroup.hidden = true;
      const uploadLabel = document.createElement('strong'); uploadLabel.textContent = 'Egen bild';
      const imageAppearance = document.createElement('fieldset'); imageAppearance.className = 'website-document-context__style';
      const imageAppearanceLegend = document.createElement('legend'); imageAppearanceLegend.textContent = 'Bildvisning';
      const fitLabel = document.createElement('label'); fitLabel.textContent = 'Anpassning';
      contextImageFit = document.createElement('select'); contextImageFit.setAttribute('aria-label', 'Bildvisning');
      for (const [value, text] of [['contain', 'Visa hela bilden'], ['cover', 'Fyll ytan']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; contextImageFit.appendChild(option); }
      fitLabel.appendChild(contextImageFit);
      const positionLabel = document.createElement('label'); positionLabel.textContent = 'Placering';
      contextImagePosition = document.createElement('select'); contextImagePosition.setAttribute('aria-label', 'Bildplacering');
      for (const [value, text] of [['center', 'Centrerad'], ['top', 'Överkant'], ['bottom', 'Underkant'], ['left', 'Vänster'], ['right', 'Höger']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; contextImagePosition.appendChild(option); }
      positionLabel.appendChild(contextImagePosition);
      contextImageStyleSave = document.createElement('button'); contextImageStyleSave.type = 'button'; contextImageStyleSave.textContent = 'Spara bildvisning'; contextImageStyleSave.className = 'website-document-primary'; contextImageStyleSave.addEventListener('click', saveImageStyle);
      imageAppearance.append(imageAppearanceLegend, fitLabel, positionLabel, contextImageStyleSave);
      const aiLabel = document.createElement('label'); aiLabel.textContent = 'Beskriv bilden du vill skapa';
      contextImagePrompt = document.createElement('textarea'); contextImagePrompt.rows = 4; contextImagePrompt.maxLength = 2000; contextImagePrompt.placeholder = 'Till exempel: ett ljust hantverksfoto av trädetaljer i en snickarverkstad'; contextImagePrompt.setAttribute('aria-label', 'Beskriv AI-bilden');
      aiLabel.appendChild(contextImagePrompt);
      contextImageGenerateButton = document.createElement('button'); contextImageGenerateButton.type = 'button'; contextImageGenerateButton.textContent = 'Skapa och använd AI-bild'; contextImageGenerateButton.className = 'website-document-primary'; contextImageGenerateButton.addEventListener('click', generateImage);
      contextImageGroup.append(uploadLabel, imageButton, imageInput, imageAppearance, aiLabel, contextImageGenerateButton);
      contextSectionGroup = document.createElement('div'); contextSectionGroup.className = 'website-document-context__section'; contextSectionGroup.hidden = true;
      const sectionPositionTitle = document.createElement('strong'); sectionPositionTitle.textContent = 'Placering på sidan';
      const sectionPositionActions = document.createElement('div'); sectionPositionActions.className = 'website-document-context__section-actions';
      for (const [direction, caption] of [['top', 'Flytta högst upp'], ['up', 'Flytta upp'], ['down', 'Flytta ner'], ['bottom', 'Flytta längst ner']]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = caption; button.setAttribute('data-section-move', direction); button.addEventListener('click', () => moveSelectedSection(direction)); sectionPositionActions.appendChild(button);
      }
      const sectionAi = document.createElement('button'); sectionAi.type = 'button'; sectionAi.className = 'website-document-primary'; sectionAi.textContent = 'Anpassa sektionen med AI'; sectionAi.addEventListener('click', () => {
        const target = context?.selectedSection; if (!target) return; setAiScope(target); global.StudioPanelModes?.switchTab?.('ai'); chatMessage(`AI arbetar nu med ${target.label}-sektionen. Beskriv vad du vill ändra.`); document.getElementById('welcomeBusinessDescription')?.focus();
      });
      const sectionRemove = document.createElement('button'); sectionRemove.type = 'button'; sectionRemove.className = 'website-document-context__danger'; sectionRemove.textContent = 'Ta bort sektion'; sectionRemove.addEventListener('click', () => { const target = context?.selectedSection; if (!target) return; if (target.type === 'content') removeContentSection(target.kind); else removeStorefrontSection(target.kind); });
      contextSectionGroup.append(sectionPositionTitle, sectionPositionActions, sectionAi, sectionRemove);
      contextPanel.append(contextTitle, contextHint, contextText, textActions, contextStyleGroup, contextLinkGroup, contextImageGroup, contextSectionGroup);
      manualScroll.prepend(contextPanel);
    }
    const compose = document.getElementById('studioChatCompose');
    if (compose) {
      chatLog = document.createElement('div'); chatLog.className = 'website-document-chat';
      chatLog.setAttribute('role', 'log'); chatLog.setAttribute('aria-label', 'AI-ändringar i webbplatsen');
      compose.prepend(chatLog);
    }
    renderAddCatalog();
    const productForm = document.getElementById('websiteDocumentProductForm');
    if (productForm && !productForm.dataset.boundProduct) { productForm.dataset.boundProduct = '1'; productForm.addEventListener('submit', saveProduct); }
    const productNew = document.getElementById('websiteDocumentProductNew');
    if (productNew && !productNew.dataset.boundProduct) { productNew.dataset.boundProduct = '1'; productNew.addEventListener('click', () => setProductFormOpen(true)); }
    const productList = document.getElementById('websiteDocumentProductList');
    if (productList && !productList.dataset.boundProduct) { productList.dataset.boundProduct = '1'; productList.addEventListener('click', handleProductAction); }
    const shopBack = document.getElementById('websiteDocumentShopBack');
    if (shopBack && !shopBack.dataset.boundProduct) { shopBack.dataset.boundProduct = '1'; shopBack.addEventListener('click', () => setProductFormOpen(false)); }
    const shopExit = document.getElementById('websiteDocumentShopExit');
    if (shopExit && !shopExit.dataset.boundProduct) { shopExit.dataset.boundProduct = '1'; shopExit.addEventListener('click', () => global.StudioPanelModes?.switchTab?.('add')); }
    const productImage = document.getElementById('websiteDocumentProductImage');
    if (productImage && !productImage.dataset.boundProduct) {
      productImage.dataset.boundProduct = '1';
      productImage.addEventListener('change', () => { const label = document.getElementById('websiteDocumentProductFile'); if (label) label.textContent = productImage.files?.[0]?.name || 'Ingen bild vald'; });
    }
    const addChoices = document.getElementById('websiteDocumentAddChoices');
    if (addChoices && !addChoices.dataset.boundDocumentAdd) {
      addChoices.dataset.boundDocumentAdd = '1';
      addChoices.addEventListener('click', function (event) {
        const button = event.target.closest?.('[data-storefront-kind]');
        if (!button) return;
        if (!context || context.saving || button.disabled) return;
        const sectionKind = button.getAttribute('data-storefront-kind');
        const label = button.getAttribute('data-document-add-label') || 'sektionen';
        const sectionType = button.getAttribute('data-section-type');
        if (button.hasAttribute('data-section-existing')) {
          const target = sectionTarget(sectionType, sectionKind); if (target) openSectionPanel(target); return;
        }
        if (sectionType === 'content') addContentSection(sectionKind, label); else addStorefrontSection(sectionKind, label);
      });
    }
    const aiScopeClear = document.getElementById('websiteDocumentAiScopeClear');
    if (aiScopeClear && !aiScopeClear.dataset.boundDocumentAiScope) { aiScopeClear.dataset.boundDocumentAiScope = '1'; aiScopeClear.addEventListener('click', () => { setAiScope(null); show('AI kan nu arbeta med hela webbplatsen.'); }); }
  }
  function setViewport(mode) {
    const ctx = context;
    if (!ctx?.frame || !['desktop', 'mobile'].includes(mode)) return;
    ctx.viewport = mode;
    ctx.frame.classList.toggle('is-mobile', mode === 'mobile');
    desktopButton?.setAttribute('aria-pressed', String(mode === 'desktop'));
    mobileButton?.setAttribute('aria-pressed', String(mode === 'mobile'));
    show(mode === 'mobile' ? 'Mobilvy. Du arbetar fortfarande i samma webbplats.' : 'Datorvy. Du arbetar fortfarande i samma webbplats.');
  }
  function restoreConversation(ctx, result) {
    if (context !== ctx || !Array.isArray(result.conversation)) return;
    ctx.conversationVersion = result.conversationVersion;
    if (!chatLog) return;
    chatLog.replaceChildren();
    if (!result.conversation.length) chatMessage('Vad vill du ändra på webbplatsen?');
    const visibleTurns = result.conversation.slice(-2);
    const olderTurns = result.conversation.slice(0, -2);
    if (olderTurns.length) {
      const history = document.createElement('details'); history.className = 'website-document-chat__history';
      const summary = document.createElement('summary'); summary.textContent = `Visa tidigare meddelanden (${olderTurns.length})`; history.appendChild(summary);
      for (const turn of olderTurns) {
        const user = document.createElement('p'); user.textContent = 'Du: ' + (turn.displayInstruction || turn.instruction);
        const ai = document.createElement('p'); ai.textContent = 'AI: ' + turn.message;
        history.append(user, ai);
      }
      chatLog.appendChild(history);
    }
    for (const turn of visibleTurns) {
      chatMessage('Du: ' + (turn.displayInstruction || turn.instruction));
      chatMessage('AI: ' + turn.message);
    }
  }
  function operationLabel(item) {
    const op = item.operation?.type;
    if (op === 'generation-import') return 'Första versionen';
    if (op === 'heading-edit') return 'Rubriken ändrades';
    if (op === 'text-edit') return 'Texten ändrades';
    if (op === 'link-edit') return 'Länken ändrades';
    if (op === 'target-edit') return item.operation.kind === 'button' ? 'Knappmålet ändrades' : 'Länken ändrades';
    if (op === 'style-edit') return 'Textens utseende ändrades';
    if (op === 'ai-edit') return 'AI-ändring';
    if (op === 'product-add') return 'Produkt lades till';
    if (op === 'product-edit') return 'Produkt ändrades';
    if (op === 'product-remove') return 'Produkt togs bort';
    if (op === 'product-place') return 'Produkt placerades på sidan';
    if (op === 'storefront-section-add') return 'Butiksektion lades till';
    if (op === 'storefront-section-remove') return 'Butiksektion togs bort';
    if (op === 'content-section-add') return 'Webbsektion lades till';
    if (op === 'content-section-remove') return 'Webbsektion togs bort';
    if (op === 'section-move') return 'Sektion flyttades';
    if (op === 'storefront-frame-update') return 'Produktbilder anpassades';
    if (op === 'image-edit') return 'Bild byttes';
    if (op === 'image-style-edit') return 'Bildvisning ändrades';
    if (op === 'ai-image-edit') return 'AI-bild skapades';
    if (op === 'restore') return item.operation.reason === 'undo' ? 'Ångrad ändring' : item.operation.reason === 'redo' ? 'Återställd ångring' : 'Återställd version';
    return 'Sparad version';
  }
  function renderVersions(ctx, result) {
    ctx.versions = Array.isArray(result.versions) ? result.versions : [];
    ctx.canUndo = !!result.canUndo; ctx.redoRevision = result.redoRevision || null;
    if (!versionsPanel) return;
    versionsPanel.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = 'Versionshistorik'; versionsPanel.appendChild(heading);
    for (const item of ctx.versions.slice().reverse()) {
      const row = document.createElement('div'), text = document.createElement('span');
      const date = new Date(item.createdAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
      text.textContent = `${operationLabel(item)} · ${date}${item.current ? ' · aktuell' : ''}`; row.appendChild(text);
      if (!item.current) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Återställ';
        button.addEventListener('click', () => restoreVersion('history', item.id)); row.appendChild(button);
      }
      const publication = document.createElement('button'); publication.type = 'button';
      publication.textContent = item.published ? 'Publicerad' : 'Publicera'; publication.disabled = !!item.published;
      if (!item.published) publication.addEventListener('click', () => publishVersion(item.id)); row.appendChild(publication);
      versionsPanel.appendChild(row);
    }
  }
  function mount(ctx, result) {
    if (context !== ctx) return;
    // Revisions reload the iframe. Remember the live document's own scroll
    // position so saving a nearby edit never throws the customer to the top.
    if (ctx.revisionId && Number.isFinite(ctx.scrollY)) ctx.restoreScrollY = ctx.scrollY;
    restoreConversation(ctx, result);
    renderVersions(ctx, result);
    ctx.revisionId = result.revisionId;
    ctx.token = crypto.randomUUID();
    ctx.selected = false; ctx.selectedText = null; ctx.selectedImage = null; ctx.selectedLink = null; ctx.selectedSection = null; ctx.linkEditing = false; ctx.editing = false; ctx.loadError = false;
    if (contextPanel) {
      contextTitle.textContent = 'Välj något på webbplatsen';
      contextHint.textContent = 'Klicka på en rubrik, text, knapp, länk eller bild för att redigera den här.';
      contextText.hidden = true; contextTextSave.hidden = true; contextTextCancel.hidden = true; contextStyleGroup.hidden = true; contextLinkGroup.hidden = true; contextImageGroup.hidden = true; if (contextSectionGroup) contextSectionGroup.hidden = true;
    }
    controls();
    ctx.frame.dataset.runId = ctx.runId;
    ctx.frame.dataset.revisionId = result.revisionId;
    ctx.frame.src = result.path + '?edit=' + encodeURIComponent(ctx.token);
    ctx.frame.hidden = false;
  }
  async function restoreVersion(reason, selectedRevision) {
    const ctx = context;
    if (!ctx || ctx.saving || ctx.editing || ctx.pending) return;
    const current = ctx.versions?.find(item => item.current);
    const targetRevision = reason === 'undo' ? current?.parentRevision : reason === 'redo' ? ctx.redoRevision : selectedRevision;
    if (!targetRevision) return;
    ctx.saving = true; controls(); command('lock-editing');
    show(reason === 'undo' ? 'Ångrar senaste ändringen…' : reason === 'redo' ? 'Återställer senaste ångringen…' : 'Återställer vald version…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/restore`, { method: 'POST', body: { baseRevision: ctx.revisionId, targetRevision, reason } });
      if (!result?.ok) throw new Error(result?.error || 'restore-failed');
      if (context !== ctx) return;
      ctx.savedMessage = reason === 'undo' ? 'Ändringen är ångrad.' : reason === 'redo' ? 'Ändringen är återställd.' : 'Den valda versionen är återställd.';
      versionsPanel.hidden = true; versionsButton.setAttribute('aria-expanded', 'false'); mount(ctx, result);
    } catch (error) {
      if (context === ctx) show(messages[error.message] || 'Versionen kunde inte återställas. Webbplatsen är oförändrad.');
    } finally {
      ctx.saving = false;
      if (context === ctx) { controls(); command('unlock-editing'); }
    }
  }
  function fileDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5_000_000) return reject(new Error('invalid-image'));
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('invalid-image')); reader.readAsDataURL(file);
    });
  }
  function beginLinkEdit() {
    const ctx = context;
    if (!ctx?.selectedLink || ctx.saving || ctx.editing || ctx.pending) return;
    ctx.linkEditing = true;
    linkInput.value = ctx.selectedLink.href || '';
    controls(); show('Ange vart länken ska leda. Lämna tomt för att ta bort länkmålet.');
    linkInput.focus(); linkInput.select();
  }
  function cancelLinkEdit() {
    if (!context?.linkEditing || context.saving) return;
    context.linkEditing = false; contextLinkGroup.hidden = true; controls(); show('Länken är oförändrad.');
  }
  async function saveLink() {
    const ctx = context;
    if (!ctx?.selectedLink || !ctx.linkEditing || ctx.saving) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Sparar länken…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/target`, { method: 'POST', body: { baseRevision: ctx.revisionId, kind: ctx.selectedLink.kind, element: ctx.selectedLink.element, href: linkInput.value } });
      if (!result?.ok) throw new Error(result?.error || 'link-save-failed');
      if (context !== ctx) return;
      ctx.linkEditing = false; ctx.savedMessage = 'Länken är sparad.'; mount(ctx, result);
    } catch (error) {
      if (context === ctx) show(error.message === 'invalid-link' ? 'Ange en säker webbadress, e-postadress, telefonlänk eller ankarlänk.' : 'Länken kunde inte sparas. Den gamla länken finns kvar.');
    } finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  async function replaceImage(file) {
    const ctx = context;
    if (!ctx || ctx.saving || !ctx.selectedImage) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Byter bilden…');
    try {
      const dataUrl = await fileDataUrl(file);
      const alt = String(file.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 500);
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/image`, { method: 'POST', body: { baseRevision: ctx.revisionId, image: ctx.selectedImage.image, dataUrl, fit: 'contain', position: 'center', alt, clearCaption: true }, timeoutMs: 30000 });
      if (!result?.ok) throw new Error(result?.error || 'image-save-failed');
      if (context !== ctx) return; ctx.savedMessage = 'Bilden är utbytt och sparad.'; mount(ctx, result);
    } catch (error) {
      if (context === ctx) show(error.message === 'invalid-image' ? 'Välj PNG, JPG, WebP eller GIF, högst 5 MB.' : 'Bilden kunde inte sparas. Den gamla bilden finns kvar.');
    } finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  async function saveImageStyle() {
    const ctx = context;
    if (!ctx || ctx.saving || !ctx.selectedImage) return;
    ctx.saving = true; controls(); command('lock-editing'); show('Sparar bildvisningen…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/image-style`, { method: 'POST', body: { baseRevision: ctx.revisionId, image: ctx.selectedImage.image, fit: contextImageFit.value, position: contextImagePosition.value } });
      if (!result?.ok) throw new Error(result?.error || 'image-style-save-failed');
      if (context !== ctx) return;
      ctx.savedMessage = 'Bildvisningen är sparad.'; mount(ctx, result);
    } catch (error) {
      if (context === ctx) show('Bildvisningen kunde inte sparas. Bilden är oförändrad.');
    } finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  async function generateImage() {
    const ctx = context;
    const prompt = contextImagePrompt?.value.trim() || '';
    if (!ctx || ctx.saving || !ctx.selectedImage) return;
    if (!prompt) { show('Beskriv först vilken bild du vill skapa.'); contextImagePrompt?.focus(); return; }
    const request = ctx.imageAiRequest?.prompt === prompt && ctx.imageAiRequest?.baseRevision === ctx.revisionId && ctx.imageAiRequest?.image === ctx.selectedImage.image
      ? ctx.imageAiRequest
      : {
          requestId: crypto.randomUUID(),
          baseRevision: ctx.revisionId,
          image: ctx.selectedImage.image,
          prompt,
          aspectRatio: ctx.selectedImage.aspectRatio || 1
        };
    ctx.imageAiRequest = request;
    ctx.saving = true; controls(); command('lock-editing'); show('AI skapar bilden. Det kan ta upp till två minuter…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/generate-image`, { method: 'POST', body: request, timeoutMs: 135000 });
      if (!result?.ok) throw new Error(result?.error || 'image-generation-unavailable');
      if (context !== ctx) return;
      ctx.imageAiRequest = null;
      ctx.savedMessage = 'AI-bilden är skapad, infogad och sparad.';
      mount(ctx, result);
    } catch (error) {
      if (context !== ctx) return;
      const message = {
        'invalid-image-prompt': 'Beskriv bilden med en kort och tydlig text.',
        'image-generation-blocked': 'Den bilden kunde inte skapas. Prova att beskriva motivet på ett annat sätt.',
        'image-ai-not-configured': 'AI-bilder är inte anslutna just nu. Du kan fortfarande välja en egen bild.',
        'revision-conflict': 'Sidan ändrades medan bilden skapades. Den nya bilden har inte ersatt något.'
      }[error.message] || 'AI-bilden kunde inte skapas. Den gamla bilden finns kvar.';
      show(message);
    } finally { ctx.saving = false; if (context === ctx) { controls(); command('unlock-editing'); } }
  }
  async function publishVersion(revisionId) {
    const ctx = context;
    if (!ctx || ctx.saving || !revisionId) return;
    ctx.saving = true; controls(); show('Publicerar den valda versionen…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/publish`, { method: 'POST', body: { revisionId } });
      if (!result?.ok) throw new Error(result?.error || 'publish-failed');
      if (context !== ctx) return;
      renderVersions(ctx, result); versionsPanel.hidden = true; versionsButton.setAttribute('aria-expanded', 'false');
      show('Versionen är publicerad.');
      if (chatLog && result.publicPath) {
        const row = document.createElement('p'); row.append('Publicerad: ');
        const link = document.createElement('a'); link.href = result.publicPath; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Öppna webbplatsen'; row.appendChild(link); chatLog.appendChild(row);
      }
    } catch (error) {
      if (context === ctx) show('Publiceringen misslyckades. Den tidigare publicerade versionen ligger kvar.');
    } finally { ctx.saving = false; if (context === ctx) controls(); }
  }
  async function load(ctx) {
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/open`, { method: 'POST', body: {} });
      if (!result?.ok) throw new Error(result?.error || 'document-open-failed');
      mount(ctx, result);
    } catch (error) { if (context === ctx) { ctx.loadError = true; controls(); show(messages[error.message] || 'Kunde inte öppna arbetsdokumentet. Försök med ”Ladda sparad version”.'); } }
  }
  function open(projectId, runId) {
    const pane = document.getElementById('studioPreviewPane');
    if (!pane) return;
    if (context?.projectId === projectId && context?.runId === runId) return;
    setup(pane); toolbar.hidden = false;
    document.body.classList.add('website-document-active');
    simplifyWorkspaceTabs(true);
    let frame = document.getElementById('greenfieldPreviewFrame');
    if (!frame) {
      frame = document.createElement('iframe'); frame.id = 'greenfieldPreviewFrame';
      frame.className = 'greenfield-preview-frame'; frame.setAttribute('sandbox', 'allow-scripts');
      frame.title = 'Din redigerbara webbplats'; pane.appendChild(frame);
    }
    frame.hidden = true; frame.removeAttribute('src');
    context = { projectId, runId, frame, pending: null, saving: false, viewport: 'desktop', aiTarget: null, storefrontKinds: new Set(), contentKinds: new Set() };
    setViewport('desktop');
    if (chatLog) { chatLog.replaceChildren(); chatLog.hidden = false; }
    chatMessage('Vad vill du ändra? Du kan till exempel be mig lägga till en sektion. Jag arbetar vidare i din sparade sida.');
    controls();
    show('Öppnar sparat webbplatsdokument…'); load(context);
  }
  async function save(ctx) {
    if (ctx.saving || !ctx.pending || context !== ctx) return;
    ctx.saving = true; controls();
    const isHeading = ctx.pending.kind === 'heading';
    show(isHeading ? 'Sparar rubriken…' : 'Sparar texten…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/${isHeading ? 'heading' : 'text'}`, {
        method: 'POST',
        body: {
          baseRevision: ctx.revisionId,
          textIndex: ctx.pending.textIndex,
          text: ctx.pending.text,
          ...(isHeading ? { heading: ctx.pending.key } : { element: ctx.pending.key })
        },
      });
      if (!result?.ok) throw new Error(result?.error || 'document-save-failed');
      if (context !== ctx) return;
      ctx.pending = null; ctx.savedMessage = isHeading ? 'Rubriken är sparad.' : 'Texten är sparad.'; mount(ctx, result);
    } catch (error) {
      if (context === ctx) show(messages[error.message] || 'Inte sparad. Din text är kvar. Tryck Spara för att försöka igen.');
    } finally {
      ctx.saving = false;
      if (context === ctx) controls();
    }
  }
  async function editWithAi(instructionOverride, displayOverride) {
    const ctx = context;
    const input = document.getElementById('welcomeBusinessDescription');
    if (!ctx || !input || ctx.saving) return;
    if (ctx.editing || ctx.pending) { show('Spara eller avbryt rubrikändringen innan du skickar till AI.'); return; }
    if (!ctx.revisionId || ctx.loadError) { show('Ladda den sparade versionen först.'); return; }
    const pendingAnswer = typeof instructionOverride !== 'string' && !!ctx.pendingAdd && !!input.value.trim();
    const catalogRequest = typeof instructionOverride === 'string' || pendingAnswer;
    const writtenAnswer = input.value.trim();
    const scopedInstruction = !catalogRequest && ctx.aiTarget
      ? `Ändra endast sektionen med attributet ${ctx.aiTarget.selector}="${ctx.aiTarget.kind}" och lämna resten av webbplatsen oförändrad. Användarens begäran: ${writtenAnswer}`
      : writtenAnswer;
    const instruction = pendingAnswer
      ? ctx.pendingAdd.instruction + '\n\nVerifierade uppgifter från användaren:\n' + writtenAnswer
      : (catalogRequest ? instructionOverride.trim() : scopedInstruction);
    const displayInstruction = pendingAnswer ? writtenAnswer : (catalogRequest ? String(displayOverride || 'Lägg till sektion').trim() : writtenAnswer);
    if (!instruction) { input.focus(); return; }
    if (ctx.aiRequest?.instruction !== instruction || ctx.aiRequest?.baseRevision !== ctx.revisionId || ctx.aiRequest?.conversationVersion !== ctx.conversationVersion) {
      ctx.aiRequest = { instruction, displayInstruction, baseRevision: ctx.revisionId, conversationVersion: ctx.conversationVersion, requestId: crypto.randomUUID() };
    }
    ctx.saving = true; controls(); command('lock-editing');
    show(catalogRequest ? displayInstruction + '…' : 'AI ändrar din sparade sida…'); chatMessage('Du: ' + displayInstruction);
    const progressMessage = chatMessage('AI arbetar med ändringen…');
    try {
      const result = await global.SiteApi.request(`/api/website-documents/${encodeURIComponent(ctx.projectId)}/edit`, { method: 'POST', body: ctx.aiRequest, timeoutMs: 110000 });
      if (!result?.ok) throw new Error(result?.error || 'ai-edit-failed');
      if (context !== ctx) return;
      if (input.value.trim() === writtenAnswer) input.value = '';
      if (pendingAnswer && result.changed) { ctx.pendingAdd = null; input.placeholder = 'Skriv här…'; }
      ctx.aiRequest = null;
      ctx.savedMessage = result.changed ? 'AI-ändringen är sparad i din webbplats.' : 'Ingen ändring gjord.';
      if (result.changed) mount(ctx, result);
      else { restoreConversation(ctx, result); show('AI har svarat i chatten. Webbplatsen är oförändrad.'); }
    } catch (error) {
      if (context !== ctx) return;
      if (error.message === 'revision-conflict' || error.message === 'conversation-conflict') ctx.loadError = true;
      const message = catalogRequest
        ? 'Det gick inte att lägga till ' + displayInstruction.replace(/^Lägg till\s+/i, '') + ' just nu. Webbplatsen är oförändrad. Prova igen från Lägg till.'
        : (messages[error.message] || 'Ändringen kunde inte sparas. Din instruktion är kvar. Försök igen eller ladda den sparade versionen.');
      show(message); chatMessage(message);
    } finally {
      progressMessage?.remove();
      ctx.saving = false;
      if (context === ctx) { controls(); command('unlock-editing'); }
    }
  }
  global.addEventListener('message', function (event) {
    const ctx = context;
    const message = event.data;
    if (!ctx || event.source !== ctx.frame?.contentWindow || message?.channel !== 'easily-document' || message.token !== ctx.token || message.revisionId !== ctx.revisionId) return;
    if (message.type === 'text-selected') {
      if (Number.isFinite(Number(message.scrollY))) ctx.scrollY = Math.max(0, Number(message.scrollY));
      ctx.selected = true; ctx.selectedImage = null; ctx.selectedSection = null; ctx.selectedKind = message.kind;
      ctx.selectedLink = ['a', 'button'].includes(message.kind) ? { kind: message.kind, element: String(message.key), href: message.href || '' } : null;
      ctx.linkEditing = ['a', 'button'].includes(message.kind);
      if (ctx.selectedLink) linkInput.value = ctx.selectedLink.href;
      editButton.textContent = message.kind === 'heading' ? 'Redigera rubrik' : message.kind === 'button' ? 'Redigera knapptext' : message.kind === 'a' ? 'Redigera länktext' : 'Redigera text';
      openTextPanel(ctx, message);
      show(message.kind === 'heading' ? 'Rubriken redigeras i vänsterpanelen.' : 'Texten redigeras i vänsterpanelen.');
    }
    if (message.type === 'image-selected') { ctx.selected = false; ctx.selectedKind = null; ctx.selectedLink = null; ctx.selectedSection = null; ctx.linkEditing = false; ctx.selectedImage = { image: String(message.image), src: message.src, alt: message.alt, aspectRatio: Number(message.aspectRatio) || 1, fit: message.fit, position: message.position }; openImagePanel(); show('Bild markerad. Välj egen bild, justera visningen eller skapa en AI-bild i vänsterpanelen.'); }
    if (message.type === 'edit-started') { ctx.editing = true; show('Ändra texten på sidan. Välj Spara eller Avbryt.'); }
    if (message.type === 'edit-finished') { ctx.editing = false; show('Ingen ändring sparad. Texten är fortfarande markerad.'); }
    if (message.type === 'unsupported-text') show('Den här texten ändras av sidans egna skript och kan ännu inte direktredigeras säkert.');
    if (message.type === 'remove-storefront') removeStorefrontSection(message.kind);
    if (message.type === 'remove-content') removeContentSection(message.kind);
    if (message.type === 'section-selected') {
      const target = sectionTarget(message.sectionType, message.kind);
      if (target) { openSectionPanel(target); show(`${target.label}-sektionen är vald.`); }
    }
    if (message.type === 'scroll-position' && Number.isFinite(Number(message.y))) ctx.scrollY = Math.max(0, Number(message.y));
    if (message.type === 'ready') {
      ctx.storefrontKinds = new Set(Array.isArray(message.storefrontKinds) ? message.storefrontKinds.filter(kind => /^[a-z-]+$/.test(kind)) : []);
      ctx.contentKinds = new Set(Array.isArray(message.contentKinds) ? message.contentKinds.filter(kind => /^[a-z-]+$/.test(kind)) : []);
      renderAddCatalog();
      renderAddRecommendations(message.pageText);
      refreshProducts(ctx);
      const hasSectionDestination = !!(ctx.scrollToStorefront || ctx.scrollToContent);
      if (ctx.scrollToStorefront) {
        ctx.frame.contentWindow?.postMessage({ channel: 'easily-document', token: ctx.token, revisionId: ctx.revisionId, type: 'scroll-storefront', kind: ctx.scrollToStorefront }, '*');
        ctx.scrollToStorefront = null;
      }
      if (ctx.scrollToContent) {
        ctx.frame.contentWindow?.postMessage({ channel: 'easily-document', token: ctx.token, revisionId: ctx.revisionId, type: 'scroll-content', kind: ctx.scrollToContent }, '*');
        ctx.scrollToContent = null;
      } else if (!hasSectionDestination && Number.isFinite(ctx.restoreScrollY)) {
        command('restore-scroll', { y: ctx.restoreScrollY });
        ctx.scrollY = ctx.restoreScrollY;
        ctx.restoreScrollY = null;
      }
      if (ctx.addedStorefront) {
        showAddedStorefrontChoices(ctx.addedStorefront);
        ctx.addedStorefront = null;
      }
      if (ctx.reopenSection) {
        const target = ctx.reopenSection; ctx.reopenSection = null; openSectionPanel(target);
      }
      if (ctx.retrySectionAdd) {
        const retry = ctx.retrySectionAdd; ctx.retrySectionAdd = null;
        if (retry.type === 'content') addContentSection(retry.kind, retry.label); else addStorefrontSection(retry.kind, retry.label);
        return;
      }
      show(ctx.savedMessage || 'Klicka på en rubrik, text, knapp, länk eller bild för att redigera den.');
      ctx.savedMessage = null;
    }
    if (message.type === 'text-change' && !ctx.pending && ['heading', 'text'].includes(message.kind) && typeof message.key === 'string' && typeof message.text === 'string' && Number.isInteger(message.textIndex)) {
      ctx.editing = false;
      if (Number.isFinite(Number(message.scrollY))) { ctx.scrollY = Math.max(0, Number(message.scrollY)); ctx.restoreScrollY = ctx.scrollY; }
      ctx.pending = { kind: message.kind, key: message.key, textIndex: message.textIndex, text: message.text }; save(ctx);
    }
    controls();
  });
  global.addEventListener('beforeunload', function (event) {
    if (context?.pending || context?.saving || context?.editing) { event.preventDefault(); event.returnValue = ''; }
  });
  // Until the next slices are connected, old metadata-only actions must not
  // pretend to edit, undo or publish this file-backed website.
  function guardLegacyAction(event) {
    if (!context) return;
    const control = event.target.closest?.('#projectPublishBtn,#undoBtn,#redoBtn,#welcomeGenerateBtn,#welcomeRebuildBtn');
    const chatEnter = event.type === 'keydown' && event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.target.id === 'welcomeBusinessDescription';
    if (!control && !chatEnter) return;
    if (event.type === 'keydown' && !chatEnter) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (chatEnter || control?.id === 'welcomeGenerateBtn') { editWithAi(); return; }
    if (control?.id === 'undoBtn') { restoreVersion('undo'); return; }
    if (control?.id === 'redoBtn') { restoreVersion('redo'); return; }
    if (control?.id === 'projectPublishBtn') { publishVersion(context?.revisionId); return; }
    show('Ångra och publicering kopplas till samma dokument i nästa steg. Sidan byggs inte om.');
  }
  global.addEventListener('click', guardLegacyAction, true);
  global.addEventListener('keydown', guardLegacyAction, true);
  function close() { context = null; document.body.classList.remove('website-document-active'); simplifyWorkspaceTabs(false); if (toolbar) toolbar.hidden = true; if (versionsPanel) versionsPanel.hidden = true; if (chatLog) chatLog.hidden = true; }
  global.WebsiteDocumentEditor = Object.freeze({ open, close });
})(window);
