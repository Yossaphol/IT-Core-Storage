function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).send("Forbidden");
    }

    next();
  };
}

module.exports = { isLoggedIn, allowRoles };