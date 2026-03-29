function sendSuccess(res, data, statusCode = 200, meta = null) {
  const response = { success: true, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
}

function sendError(res, statusCode, code, message, field = null) {
  const error = { code, message };
  if (field) error.field = field;
  return res.status(statusCode).json({ success: false, error });
}

function sendCreated(res, data) {
  return sendSuccess(res, data, 201);
}

module.exports = { sendSuccess, sendError, sendCreated };
