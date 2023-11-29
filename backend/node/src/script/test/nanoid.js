import { customAlphabet } from 'nanoid';

const custAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const nanoid = customAlphabet(custAlphabet, 6);

console.log(nanoid());
