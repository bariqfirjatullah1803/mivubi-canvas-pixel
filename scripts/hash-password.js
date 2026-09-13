// node --env-file=.env scripts/hash-password.js "password baru"
// atau: ADMIN_PASSWORD=... node --env-file=.env scripts/hash-password.js
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const password = process.argv[2] || process.env.ADMIN_PASSWORD;
if (!password) {
	console.error('Isi password sebagai argumen atau lewat ADMIN_PASSWORD.');
	process.exit(1);
}
const salt = randomBytes(16);
const key = await promisify(scrypt)(password.normalize('NFKC'), salt, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`);
