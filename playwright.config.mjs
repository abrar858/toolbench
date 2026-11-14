export default {
 testDir:'./tests',
 testMatch:'browser.spec.mjs',
 use:{baseURL:'http://127.0.0.1:8765',browserName:'chromium'},
 reporter:'list',
 workers:1,
 timeout:30000
};
