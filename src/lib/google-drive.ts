import { google } from 'googleapis';

export class GoogleDriveService {
  private drive;

  constructor() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(
    fileUrl: string,
    filename: string,
    folderId: string,
  ): Promise<{ fileId: string; webViewLink: string }> {
    // Fetch file from URL
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const driveRes = await this.drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: contentType,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    return {
      fileId: driveRes.data.id || '',
      webViewLink: driveRes.data.webViewLink || '',
    };
  }
}

export const driveService = new GoogleDriveService();
