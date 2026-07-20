import { NextResponse } from 'next/server';
import { listCredentials, setCredential, deleteCredential } from '@/lib/credential-manager';
import type { CredentialKey, ApiResponse, CredentialStatus } from '@/types';

// GET — 설정 상태만 반환 (값 절대 노출 안 함)
export async function GET() {
  try {
    if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Google Sheets 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      );
    }
    const credentials = await listCredentials();
    return NextResponse.json<ApiResponse<CredentialStatus[]>>({ success: true, data: credentials });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// POST — 키 저장 (암호화)
export async function POST(request: Request) {
  try {
    const { key, value } = (await request.json()) as { key: CredentialKey; value: string };
    if (!key || !value) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'key와 value가 필요합니다.' },
        { status: 400 },
      );
    }
    await setCredential(key, value);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// DELETE — 키 삭제
export async function DELETE(request: Request) {
  try {
    const { key } = (await request.json()) as { key: CredentialKey };
    if (!key) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'key가 필요합니다.' },
        { status: 400 },
      );
    }
    await deleteCredential(key);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
