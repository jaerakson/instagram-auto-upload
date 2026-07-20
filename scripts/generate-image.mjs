/**
 * Image generation script using fal.ai Nano Banana Pro
 * Reads FAL_KEY from Google Sheets via credential-manager pattern,
 * then calls the fal.ai API directly.
 */

import { createDecipheriv } from 'crypto';
import { google } from 'googleapis';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

// --- Config ---
const PROMPT = `Cinematic flash portrait of a young woman in a dimly lit cafe, dramatic directional rim light casting rich deep shadows, warm peach undertone on glossy skin highlights, 35mm film grain texture, soft halation and subtle lens diffusion, atmospheric fog drifting through warm ambient light, shallow depth of field with creamy bokeh background, natural skin pores and realistic skin texture, intentional imperfection, matte desaturated highlights, editorial fashion mood, highly detailed, professional, 8k resolution, cinematic lighting, sharp focus`;

const FAL_ENDPOINT = 'https://fal.run/fal-ai/nano-banana-pro';
const IMAGE_SIZE = 'square_hd';
const NUM_IMAGES = 1;
const GUIDANCE_SCALE = 7.5;

// --- Credential retrieval ---
async function getFalKey() {
  const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const sheetsId = process.env.GOOGLE_SHEETS_ID;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!serviceAccountKey || !sheetsId || !encryptionKey) {
    throw new Error('Missing required environment variables');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsId,
    range: '인증정보!A2:E',
  });

  const rows = res.data.values || [];
  const falRow = rows.find((row) => row[0] === 'FAL_KEY');
  if (!falRow || !falRow[2]) {
    throw new Error('FAL_KEY not found in credentials sheet. Please configure it via the Settings page.');
  }

  // Columns: key, iv, ciphertext, tag, updatedAt
  const iv = falRow[1];
  const ciphertext = falRow[2];
  const tag = falRow[3];

  const key = Buffer.from(encryptionKey, 'hex');
  const ivBuf = Buffer.from(iv, 'hex');
  const tagBuf = Buffer.from(tag, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, ivBuf, { authTagLength: 16 });
  decipher.setAuthTag(tagBuf);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// --- fal.ai API call ---
async function generateImage(apiKey, prompt) {
  console.log('Calling fal.ai Nano Banana Pro...');
  console.log(`Prompt: ${prompt.substring(0, 80)}...`);

  const res = await fetch(FAL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: IMAGE_SIZE,
      num_images: NUM_IMAGES,
      guidance_scale: GUIDANCE_SCALE,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`fal.ai API error (${res.status}): ${JSON.stringify(error)}`);
  }

  const data = await res.json();

  // fal.ai queue API returns a request_id for async processing
  if (data.request_id) {
    console.log(`Request queued: ${data.request_id}`);
    return await pollForResult(apiKey, data.request_id);
  }

  // Synchronous response
  const imageUrl = data.images?.[0]?.url || data.output?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL in response');
  }
  return imageUrl;
}

async function pollForResult(apiKey, requestId) {
  const statusUrl = `https://queue.fal.run/fal-ai/nano-banana-pro/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/nano-banana-pro/requests/${requestId}`;

  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    console.log(`  Status: ${status.status} (attempt ${i + 1}/${maxAttempts})`);

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const result = await resultRes.json();
      const imageUrl = result.images?.[0]?.url || result.output?.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL in completed result');
      return imageUrl;
    }

    if (status.status === 'FAILED') {
      throw new Error(`Generation failed: ${JSON.stringify(status)}`);
    }
  }

  throw new Error('Polling timeout: image generation did not complete in time');
}

// --- Main ---
async function main() {
  try {
    console.log('=== Nano Banana Pro Image Generation ===\n');

    console.log('1. Retrieving FAL_KEY from Google Sheets...');
    const falKey = await getFalKey();
    console.log('   FAL_KEY retrieved successfully.\n');

    console.log('2. Generating image...');
    let imageUrl;
    try {
      imageUrl = await generateImage(falKey, PROMPT);
    } catch (err) {
      console.log(`   First attempt failed: ${err.message}`);
      console.log('   Retrying with simplified prompt...');
      const simplifiedPrompt =
        'Cinematic flash portrait, young woman in dimly lit cafe, dramatic rim light, warm peach tones, 35mm film grain, soft halation, bokeh background, highly detailed, 8k resolution, cinematic lighting';
      imageUrl = await generateImage(falKey, simplifiedPrompt);
    }

    console.log(`\n   Image URL: ${imageUrl}\n`);

    // Output result as JSON for the caller
    const result = {
      prompt: PROMPT,
      imageUrl,
      model: 'nano-banana-pro',
      imageSize: IMAGE_SIZE,
      guidanceScale: GUIDANCE_SCALE,
    };

    console.log('=== RESULT_JSON ===');
    console.log(JSON.stringify(result));
    console.log('=== END_RESULT ===');
  } catch (err) {
    console.error(`\nFATAL ERROR: ${err.message}`);
    process.exit(1);
  }
}

main();
