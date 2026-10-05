const fs = require('fs');
const zlib = require('zlib');

const input = fs.readFileSync('eas_build.bin');

try {
  const unzipped = zlib.gunzipSync(input);
  fs.writeFileSync('eas_build.txt', unzipped);
  console.log('gunzip success');
} catch (e1) {
  try {
    const inflated = zlib.inflateSync(input);
    fs.writeFileSync('eas_build.txt', inflated);
    console.log('inflate success');
  } catch (e2) {
    try {
      const brotli = zlib.brotliDecompressSync(input);
      fs.writeFileSync('eas_build.txt', brotli);
      console.log('brotli success');
    } catch (e3) {
      console.error('All decomp failures', e1.message, e2.message, e3.message);
    }
  }
}
