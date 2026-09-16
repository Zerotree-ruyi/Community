// Find the zh-CN fundRecords block by anchor search
import fs from 'fs';
const p = 'src/app/contexts/LanguageContext.tsx';
let data = fs.readFileSync(p);

// Use a known-good ASCII anchor that only appears in zh-CN context
// "txId: '\xE4\xBA\xA4\xE6\x98\x93ID'" - but let me try ASCII anchor
// The character "充值" only appears in zh-CN block, search for that
const anchor = Buffer.from([0xe5, 0x85, 0x85, 0xe5, 0x80, 0xbc]);  // 充值 bytes
let pos = -1;
let found = [];
let p2 = 0;
while ((p2 = data.indexOf(anchor, p2 + 1)) >= 0) {
  found.push(p2);
}
console.log('"充值" found at positions:', found);

// Each occurrence has "deposit: '充值'"
// Find the zh-CN one — it's right before fundRecords.types in the new structure (but currently no types)
// So find the one in fundRecords block.
// Actually "充值" might appear in many places. Let me search by '\xe5\x85\x85\xe5\x80\xbc' followed by ',
let marker = Buffer.concat([anchor, Buffer.from("',")]);
found = [];
p2 = 0;
while ((p2 = data.indexOf(marker, p2 + 1)) >= 0) {
  found.push(p2);
}
console.log("'充值', found at positions:", found);

// The zh-CN fundRecords block has the unique sequence:
// txId: '\xE4\xBA\xA4\xE6\x98\x93ID',     (no other lang uses 交易ID)
// 交易 = e4 ba a4 e6 98 93
const txBytes = Buffer.from([0xe4, 0xba, 0xa4, 0xe6, 0x98, 0x93]);  // 交易
let txIdPositions = [];
p2 = 0;
while ((p2 = data.indexOf(txBytes, p2 + 1)) >= 0) {
  txIdPositions.push(p2);
}
console.log('"交易" bytes found at:', txIdPositions);

// Look at each — the one in zh-CN fundRecords has "ID" right after 交易
for (const pos of txIdPositions) {
  // Read 16 bytes after position
  const next = data.slice(pos + 6, pos + 30).toString('utf8');
  console.log(`  at ${pos}: next = "${next.replace(/\n/g, '\\n')}"`);
}