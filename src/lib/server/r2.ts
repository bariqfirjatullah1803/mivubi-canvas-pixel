// Penyimpanan objek (Cloudflare R2 lewat API S3). Berkas tidak pernah masuk Postgres.
import { AwsClient } from 'aws4fetch';
import { r2Config } from './env';

let client: AwsClient | null = null;
function aws() {
	const c = r2Config();
	client ??= new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: 's3', region: c.region });
	return { aws: client, cfg: c };
}

const url = (key: string) => {
	const { cfg } = aws();
	return `${cfg.endpoint}/${cfg.bucket}/${key.replace(/^\/+/, '')}`;
};

export async function putObject(key: string, body: ArrayBuffer, contentType: string) {
	const { aws: a } = aws();
	const res = await a.fetch(url(key), { method: 'PUT', body, headers: { 'content-type': contentType } });
	if (!res.ok) throw new Error(`R2 PUT ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function getObject(key: string): Promise<Response> {
	const { aws: a } = aws();
	return a.fetch(url(key), { method: 'GET' });
}

export async function deleteObject(key: string) {
	const { aws: a } = aws();
	const res = await a.fetch(url(key), { method: 'DELETE' });
	if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}`);
}
