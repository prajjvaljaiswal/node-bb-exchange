function validate(schema) {
  return (req, res, next) => next();
}

function validateQuery(schema) {
  return (req, res, next) => next();
}

module.exports = { validate, validateQuery };
