function errorHandler(err, req, res, next) {
  console.error('[error]', err.message, err.stack);

  if (err.name === 'ZodError') {
    const field = err.errors[0]?.path?.join('.');
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Validation failed',
        field,
        details: err.errors,
      },
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${err.meta?.target?.join(', ')} already exists`,
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Record not found' },
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    },
  });
}

module.exports = errorHandler;
