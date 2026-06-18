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

/**
 * Validate body của /register theo `role`: TENANT dùng registerTenantSchema,
 * LANDLORD dùng registerLandlordSchema. Tái dùng cơ chế parse + map lỗi của `validate`.
 * Phải chạy SAU multer (để req.body đã có khi gửi multipart) và trước controller.
 *
 * @type {import('express').RequestHandler}
 */
function validateRegisterByRole(req, res, next) {
  // require ở trong hàm để tránh phụ thuộc vòng (models/User không import middleware).
  const { registerTenantSchema, registerLandlordSchema } = require('../models/User');
  const role = String((req.body && req.body.role) || 'TENANT').toUpperCase();
  const schema = role === 'LANDLORD' ? registerLandlordSchema : registerTenantSchema;
  return validate({ body: schema })(req, res, next);
}

module.exports = { validate, validateRegisterByRole };
