import https from 'node:https';
import fs from 'node:fs';

const req = https.get('https://sms.hupa.ir/webservice/sample/sendSms_Pattern/Python', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('CONTENT-TYPE:', res.headers['content-type']);
  const file = fs.createWriteStream('C:/Users/Lenovo/Downloads/Pattern_Python.zip');
  res.pipe(file);
  file.on('finish', () => console.log('SAVED!'));
});
req.on('error', e => console.log('ERR:', e.message));
