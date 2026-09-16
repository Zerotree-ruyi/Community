// Find the zh-CN fundRecords block by searching for distinctive strings
import fs from 'fs';
const p = 'src/app/contexts/LanguageContext.tsx';
let data = fs.readFileSync(p);

// Find by looking for unique substring: "txId: '交易ID',"
const marker = Buffer.from("txId: '\xe4\xba\xa4\xe6\x98\x93ID',\n");
let pos = data.indexOf(marker);
console.log('txId ID marker pos:', pos);
if (pos < 0) { process.exit(1); }

// Find second occurrence (zh-CN is the second one after th)
pos = data.indexOf(marker, pos + 1);
console.log('second txId pos:', pos);
if (pos < 0) { process.exit(1); }

// Walk back to find the start of "    fundRecords: {"
let start = data.lastIndexOf(Buffer.from('    fundRecords: {'), pos);
console.log('fundRecords start:', start);

// Find the end "    },"
let end = data.indexOf(Buffer.from('    },'), pos);
console.log('fundRecords end:', end);

const old_block = data.slice(start, end + '    },'.length);
console.log('--- OLD BLOCK ---');
console.log(old_block.toString('utf8'));

// Build new block
const new_block = Buffer.from(`    fundRecords: {
      title: '资金记录',
      all: '全部',
      deposit: '充值',
      withdraw: '提现',
      completed: '已完成',
      pending: '处理中',
      noRecords: '暂无资金记录',
      recordsWillShow: '您的交易记录将显示在这里',
      txId: '交易ID',
      currentBalance: '当前余额',
      totalIn: '总入账',
      totalOut: '总出账',
      loadError: '加载失败',
      loading: '加载中…',
      notes: '备注',
      balanceAfter: '余额',
      types: {
        recharge: '后台充值',
        deduct:   '后台扣款',
        withdraw: '会员提现',
        order:    '会员下单',
        profit:   '下推盈利',
      },
    },`, 'utf8');

const result = Buffer.concat([data.slice(0, start), new_block, data.slice(end + '    },'.length)]);
fs.writeFileSync(p, result);
console.log('✓ written');