const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Validate request theo schema Zod cho từng phần (body/params/query).
 * Dùng: router.post('/login', validate({ body: loginSchema }), controller.login)
 *
 * - Parse thành công: GHI ĐÈ req.body/params/query bằng dữ liệu đã ép kiểu + trim.
 * - Thất bại: ném AppError 400 (errorHandler sẽ trả về envelope chuẩn với data.errors).
 *
 * @param {{ body?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny }} schemas
 * @returns {import('express').RequestHandler}
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const part of ['body', 'params', 'query']) {
        if (schemas[part]) {
          req[part] = schemas[part].parse(req[part]);
        }
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return next(
          new AppError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', 400, { errors: details }),
        );
      }
      return next(err);
    }
  };
}

module.exports = { validate };
