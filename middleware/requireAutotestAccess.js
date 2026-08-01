const permsLib = require('../lib/users-perms');

module.exports = function requireAutotestAccess(req, res, next) {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role === 'admin') return next();
  const perms = permsLib.getPerms(user.username);
  if (perms.canRunAutotests) return next();
  return res.status(403).json({ error: 'Access denied' });
};
