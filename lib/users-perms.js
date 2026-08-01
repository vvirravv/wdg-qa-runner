const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/users-perms.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getPerms(username) {
  return load()[username] || {};
}

function setPerms(username, perms) {
  const all = load();
  all[username] = { ...(all[username] || {}), ...perms };
  save(all);
  return all[username];
}

module.exports = { getPerms, setPerms, load };
