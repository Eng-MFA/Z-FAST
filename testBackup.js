// Quick test: download then restore backup
const jwt = require('jsonwebtoken');
const fs  = require('fs');
const token = jwt.sign({id:1,username:'admin'},'zfast_secret_key_2024',{expiresIn:'1h'});

(async () => {
  // 1) Download
  console.log('Downloading backup...');
  const dlRes = await fetch('http://localhost:3000/api/backup/download', { headers: { Authorization: 'Bearer ' + token } });
  const buf   = Buffer.from(await dlRes.arrayBuffer());
  fs.writeFileSync('test_backup.zip', buf);
  console.log(`Downloaded: ${(buf.length/1048576).toFixed(1)} MB`);

  // 2) Restore using raw multipart
  const boundary = '----ZFASTBoundary' + Date.now();
  const fileData = fs.readFileSync('test_backup.zip');
  const CRLF = '\r\n';
  const bodyParts = [
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="backup"; filename="test_backup.zip"${CRLF}`,
    `Content-Type: application/zip${CRLF}`,
    CRLF,
  ];
  const body = Buffer.concat([
    Buffer.from(bodyParts.join('')),
    fileData,
    Buffer.from(`${CRLF}--${boundary}--${CRLF}`),
  ]);

  console.log('Sending restore request...');
  const restoreRes = await fetch('http://localhost:3000/api/backup/restore', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const result = await restoreRes.json();
  console.log('Restore result:', JSON.stringify(result, null, 2));

  // Cleanup
  fs.unlinkSync('test_backup.zip');
})().catch(console.error);
