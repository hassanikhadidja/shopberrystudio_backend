const isAdmin = (req, res, next) => {
  const role = req?.user?.role;
  if (role === "Admin" || role === "admin") {
    next();
    return;
  }
  return res.status(403).json({ msg: "Access denied - Admins only" });
};

module.exports = isAdmin;
