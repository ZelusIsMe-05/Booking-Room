const crypto = require('crypto');

/**
 * Sắp xếp các tham số của object theo thứ tự bảng chữ cái
 */
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

/**
 * Sinh liên kết thanh toán sang VNPAY
 */
function buildPaymentUrl({ ipAddr, amount, txnRef, orderInfo, returnUrl }) {
  const tmnCode = process.env.VNP_TMN_CODE || 'MO9YN7YC';
  const secretKey = process.env.VNP_HASH_SECRET || 'K01ZI6IVAYPG63S0YKTTT5OHIGC3GNQJ';
  const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

  const date = new Date();
  
  // VNPAY yêu cầu định dạng ngày giờ Việt Nam (UTC+7): YYYYMMDDHHmmss
  const timezoneOffset = 7; // Vietnam UTC+7
  const localDate = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hour = String(localDate.getUTCHours()).padStart(2, '0');
  const minute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const second = String(localDate.getUTCSeconds()).padStart(2, '0');
  const createDate = `${year}${month}${day}${hour}${minute}${second}`;

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo || `Thanh toan dat coc phong ${txnRef}`,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(amount) * 100, // Cần nhân 100 và làm tròn số nguyên theo quy chuẩn VNPAY
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate
  };

  const sortedParams = sortObject(vnp_Params);
  
  // Chuỗi để tạo chữ ký bảo mật
  const signData = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', secretKey);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Chuỗi query string đầy đủ gửi sang VNPAY
  const rawParams = Object.keys(vnp_Params)
    .map(key => `${key}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, '+')}`)
    .join('&');

  return `${vnpUrl}?${rawParams}&vnp_SecureHash=${secureHash}`;
}

/**
 * Kiểm tra tính hợp lệ của chữ ký phản hồi từ VNPAY
 */
function verifySecureHash(queryParams) {
  const secretKey = process.env.VNP_HASH_SECRET || 'K01ZI6IVAYPG63S0YKTTT5OHIGC3GNQJ';
  
  const secureHash = queryParams['vnp_SecureHash'];
  
  let vnp_Params = {};
  for (let key in queryParams) {
    if (queryParams.hasOwnProperty(key) && key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      vnp_Params[key] = queryParams[key];
    }
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', secretKey);
  const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return calculatedHash.toLowerCase() === (secureHash || '').toLowerCase();
}

module.exports = {
  buildPaymentUrl,
  verifySecureHash
};
