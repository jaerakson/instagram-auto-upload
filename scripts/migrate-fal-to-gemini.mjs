#!/usr/bin/env node

/**
 * FAL_KEY → GEMINI_KEY 마이그레이션 스크립트
 * Google Sheets 인증정보 시트에서 FAL_KEY의 암호화 데이터를 GEMINI_KEY로 복사한다.
 */

import { google } from 'googleapis';

const SHEET_CREDENTIALS = '인증정보';

async function migrate() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!spreadsheetId) {
    console.error('GOOGLE_SHEETS_ID 환경변수가 필요합니다.');
    process.exit(1);
  }

  // 1. 모든 인증정보 행 조회
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_CREDENTIALS}!A2:E`,
  });
  const rows = res.data.values || [];
  console.log('현재 인증정보 시트:', rows.map(r => `${r[0]} → configured: ${!!r[2]}`));

  // 2. FAL_KEY 행 찾기
  const falRow = rows.find(r => r[0] === 'FAL_KEY');
  if (!falRow || !falRow[2]) {
    console.error('FAL_KEY가 인증정보 시트에 없거나 비어있습니다.');
    process.exit(1);
  }

  const [, iv, ciphertext, tag] = falRow;
  console.log(`FAL_KEY 찾음 (iv: ${iv.substring(0, 8)}..., ciphertext 길이: ${ciphertext.length})`);

  // 3. GEMINI_KEY 행 확인
  const geminiRowIndex = rows.findIndex(r => r[0] === 'GEMINI_KEY');
  const updatedAt = new Date().toISOString();

  if (geminiRowIndex >= 0) {
    // 기존 GEMINI_KEY 행 업데이트
    const rowNumber = geminiRowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_CREDENTIALS}!A${rowNumber}:E${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['GEMINI_KEY', iv, ciphertext, tag, updatedAt]] },
    });
    console.log(`GEMINI_KEY 행 업데이트 완료 (row ${rowNumber})`);
  } else {
    // 새 GEMINI_KEY 행 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_CREDENTIALS}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['GEMINI_KEY', iv, ciphertext, tag, updatedAt]] },
    });
    console.log('GEMINI_KEY 행 새로 추가 완료');
  }

  // 4. FAL_KEY 행 삭제 (빈 값으로 덮어쓰기)
  const falRowIndex = rows.findIndex(r => r[0] === 'FAL_KEY');
  const falRowNumber = falRowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_CREDENTIALS}!A${falRowNumber}:E${falRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['', '', '', '', '']] },
  });
  console.log(`FAL_KEY 행 삭제 완료 (row ${falRowNumber})`);

  console.log('\n마이그레이션 완료: FAL_KEY → GEMINI_KEY');
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err.message);
  process.exit(1);
});
