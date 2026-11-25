/** Match Berry Studio frontend: at least 6 characters. */
function passwordvalidator(ch) {
  return typeof ch === "string" && ch.length >= 6;
}

module.exports = passwordvalidator;
