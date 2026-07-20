import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// JSON 키 파일 직접 읽기
const keyFilePath = '/Users/liche/Downloads/instagram-auto-upload-314699834ee0.json';
const credentials = JSON.parse(readFileSync(keyFilePath, 'utf-8'));
const spreadsheetId = '1GL98n9l_iJozlHodI1Q5eqpGMjKbeZ08yR0zBzTPUQo';

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function run() {
  console.log('🔗 Google Sheets 연결 중...');
  console.log(`📋 Spreadsheet ID: ${spreadsheetId}`);

  // 1. 기존 시트 목록 확인
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
  console.log(`📄 기존 시트: ${existingSheets.join(', ')}`);

  // 2. 필요한 시트 생성
  const requiredSheets = ['게시기록', '성과', '설정', '인증정보'];
  const sheetsToCreate = requiredSheets.filter(s => !existingSheets.includes(s));

  if (sheetsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: sheetsToCreate.map(title => ({
          addSheet: { properties: { title } }
        }))
      }
    });
    console.log(`✅ 시트 생성: ${sheetsToCreate.join(', ')}`);
  } else {
    console.log('✅ 모든 시트가 이미 존재합니다');
  }

  // 3. 각 시트에 헤더 설정
  const headers = {
    '게시기록': [['id', 'date', 'prompt', 'caption', 'hashtags', 'imageUrl', 'mediaId', 'mediaUrl', 'status', 'trendReport', 'style']],
    '성과': [['mediaId', 'date', 'likes', 'comments', 'saves', 'reach', 'followersDelta']],
    '설정': [['key', 'value']],
    '인증정보': [['key', 'iv', 'ciphertext', 'tag', 'updatedAt']],
  };

  for (const [sheetName, headerRow] of Object.entries(headers)) {
    // 기존 헤더 확인
    try {
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });
      if (existing.data.values && existing.data.values[0]?.length > 0) {
        console.log(`⏭️  ${sheetName}: 헤더가 이미 있음`);
        continue;
      }
    } catch (e) {
      // 시트가 비어있으면 에러 발생 가능
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: headerRow },
    });
    console.log(`✅ ${sheetName}: 헤더 설정 완료`);
  }

  // 4. 설정 시트 기본값 입력
  try {
    const settingsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '설정!A2:B',
    });
    if (!settingsData.data.values || settingsData.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '설정!A2:B7',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['autoMode', 'false'],
            ['postTime', '19:00'],
            ['language', 'ko'],
            ['instagramConnected', 'false'],
            ['googleSheetsConnected', 'true'],
            ['falApiConnected', 'false'],
          ]
        },
      });
      console.log('✅ 설정: 기본값 입력 완료');
    } else {
      console.log('⏭️  설정: 기본값이 이미 있음');
    }
  } catch (e) {
    console.log('⚠️  설정 기본값 입력 실패:', e.message);
  }

  // 5. 기본 시트(Sheet1 등) 삭제 (선택)
  const refreshed = await sheets.spreadsheets.get({ spreadsheetId });
  const defaultSheet = refreshed.data.sheets.find(s =>
    !requiredSheets.includes(s.properties.title)
  );
  if (defaultSheet) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteSheet: { sheetId: defaultSheet.properties.sheetId }
          }]
        }
      });
      console.log(`🗑️  불필요한 시트 삭제: ${defaultSheet.properties.title}`);
    } catch (e) {
      console.log(`⚠️  기본 시트 삭제 실패 (무시 가능): ${e.message}`);
    }
  }

  console.log('\n🎉 Google Sheets DB 초기화 완료!');
  console.log(`📊 https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
}

run().catch(err => {
  console.error('❌ 에러:', err.message);
  if (err.message.includes('403') || err.message.includes('permission')) {
    console.error('💡 서비스 계정에 스프레드시트 "편집자" 권한을 부여했는지 확인하세요.');
    console.error(`   서비스 계정 이메일: ${credentials.client_email}`);
  }
  process.exit(1);
});
