import mysql from 'mysql2/promise';
const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'123456',database:'exchange_db'});
const [rows] = await c.query('SHOW COLUMNS FROM members');
console.log(rows.map(r => r.Field).join(', '));
await c.end();
