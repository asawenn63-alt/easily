function fail(code, status = 502) {
  throw Object.assign(new Error(code), { status });
}

function requestedSize(aspectRatio) {
  const ratio = Number(aspectRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) return 'auto';
  if (ratio >= 1.18) return '1536x1024';
  if (ratio <= 0.85) return '1024x1536';
  return '1024x1024';
}

export async function generateDocumentImage({ apiKey, prompt, aspectRatio, fetchImpl = fetch }) {
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  if (!text || text.length > 2000) fail('invalid-image-prompt', 400);
  if (!apiKey) fail('image-ai-not-configured', 503);

  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(125000),
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt: `${text}\n\nCreate this as a polished website image. Do not add words, letters, logos or watermarks unless the user explicitly requested them.`,
        size: requestedSize(aspectRatio),
        quality: 'low'
      })
    });
  } catch {
    fail('image-generation-unavailable');
  }

  let payload = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) {
    if (payload?.error?.code === 'moderation_blocked') fail('image-generation-blocked', 400);
    if (response.status === 401 || response.status === 403) fail('image-ai-not-configured', 503);
    fail('image-generation-unavailable');
  }

  const encoded = payload?.data?.[0]?.b64_json;
  if (typeof encoded !== 'string' || !/^[a-zA-Z0-9+/=]+$/.test(encoded)) fail('invalid-generated-image');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 20_000_000 || bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) fail('invalid-generated-image');
  return {
    bytes,
    mimeType: 'image/png',
    providerRequestId: response.headers?.get?.('x-request-id') || null
  };
}
