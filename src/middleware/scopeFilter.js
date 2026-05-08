const { NGO_ORGANIZATIONAL_ROLES } = require('../config/roles');

module.exports = (req, res, next) => {
  const user = req.user;
  // SUPER_ADMIN and ADDITIONAL_DIRECTOR can see everything
  if (!user || user.role === 'SUPER_ADMIN' || user.role === 'ADDITIONAL_DIRECTOR') {
    req.scopeFilter = {};
    return next();
  }

  // NGO Organizational roles – filter by their location
  if (NGO_ORGANIZATIONAL_ROLES.includes(user.role)) {
    const filter = {};
    if (user.state) filter.state = user.state;
    if (user.district) filter.district = user.district;
    if (user.block) filter.block = user.block;
    if (user.village) filter.village = user.village;
    req.scopeFilter = filter;
    return next();
  }

  return res.status(403).json({ success: false, message: 'Access denied' });
};