const express = require('express');
const router = express.Router();
const permsLib = require('../lib/users-perms');

const BASE_USERS = JSON.parse(process.env.USERS || '[]').map(u => ({
  username: u.username,
  role: u.role || 'user',
}));

router.get('/', (req, res) => {
  const perms = permsLib.load();
  const users = BASE_USERS.map(u => ({
    username: u.username,
    role: u.role,
    canRunAutotests: u.role === 'admin' ? true : (perms[u.username]?.canRunAutotests ?? false),
  }));
  res.json(users);
});

router.put('/:username', (req, res) => {
  const { canRunAutotests } = req.body;
  const user = BASE_USERS.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.json({ username: user.username, role: 'admin', canRunAutotests: true });
  permsLib.setPerms(req.params.username, { canRunAutotests: !!canRunAutotests });
  res.json({ username: user.username, role: user.role, canRunAutotests: !!canRunAutotests });
});

module.exports = router;
