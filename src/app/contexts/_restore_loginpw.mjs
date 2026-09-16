// Restore the deleted zh-CN loginPassword block
import fs from 'fs';
const p = 'src/app/contexts/LanguageContext.tsx';
let data = fs.readFileSync(p);

// Find the tradingPassword at line 1320 (in zh-CN section)
const anchor = Buffer.from(`    tradingPassword: {
      title: '修改交易密码',`, 'utf8');
let pos = data.indexOf(anchor);
console.log('tradingPassword zh-CN pos:', pos);
if (pos < 0) { process.exit(1); }

const newLoginPw = Buffer.from(`    loginPassword: {
      title: '修改登录密码',
      oldPassword: '旧密码',
      oldPasswordPlaceholder: '请输入旧密码',
      newPassword: '新密码',
      newPasswordPlaceholder: '请输入新密码',
      confirmPassword: '确认新密码',
      confirmPasswordPlaceholder: '请再次输入新密码',
      passwordRule: '密码长度为6-20位，包含字母和数字',
      confirmChange: '确认修改',
      tips: '温馨提示：',
      tip1: '密码必须包含字母和数字',
      tip2: '密码长度为6-20位字符',
      tip3: '建议使用大小写字母、数字和符号的组合',
      tip4: '修改密码后需要重新登录',
    },
`, 'utf8');

const result = Buffer.concat([data.slice(0, pos), newLoginPw, data.slice(pos)]);
fs.writeFileSync(p, result);
console.log('✓ restored loginPassword, new size:', result.length);