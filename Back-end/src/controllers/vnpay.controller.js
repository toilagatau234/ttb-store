const querystring = require('qs');
const crypto = require('crypto');
const dateformat = require('dateformat');
const OrderModel = require('../models/order.model'); // Import model Order

// Hàm sort object (lấy từ demo)
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
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

// =================================================================
// HÀM TẠO THANH TOÁN
// =================================================================
const createPaymentUrl = async (req, res, next) => {
  try {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    let date = new Date();
    let createDate = dateformat(date, 'yyyymmddHHmmss');

    let ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    let tmnCode = process.env.VNP_TMNCODE;
    let secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    let returnUrl = process.env.VNP_RETURNURL;

    // Lấy thông tin từ Front-end
    // Chú ý: orderId của bạn có thể là một mảng nếu 1 lần thanh toán cho nhiều đơn hàng
    // Ở đây ta giả định front-end gửi lên 1 mã đơn hàng duy nhất cho 1 lần thanh toán
    let orderId = req.body.orderId; 
    let amount = req.body.amount;
    let bankCode = req.body.bankCode; // 'VNBANK', 'INTCARD'
    let locale = req.body.language;
    if (locale === null || locale === '' || !locale) {
      locale = 'vn';
    }
    let currCode = 'VND';
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId; // Mã tham chiếu giao dịch (Mã đơn hàng)
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
    vnp_Params['vnp_OrderType'] = 'other'; // Loại hàng hóa (search mã trên VNPay)
    vnp_Params['vnp_Amount'] = amount * 100; // Số tiền (nhân 100 theo quy định VNPay)
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    if (bankCode !== null && bankCode !== '' && bankCode) {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

    // Trả về URL thanh toán cho Front-end
    res.status(200).json({ paymentUrl: vnpUrl });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo URL thanh toán' });
  }
};

// =================================================================
// HÀM XỬ LÝ KẾT QUẢ VNPay TRẢ VỀ (vnpay_return)
// =================================================================
const vnpayReturn = async (req, res, next) => {
  try {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = process.env.VNP_HASHSECRET;
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      // Kiem tra xem du lieu trong db co hop le hay khong
      // Cập nhật trạng thái đơn hàng (nếu cần)
      // ...
      
      // Chuyển hướng về Front-end
      // Thay đổi URL này thành URL trang "Kết quả thanh toán" của bạn
      const frontendReturnUrl = `http://localhost:8080/payment-result?${querystring.stringify(vnp_Params, { encode: false })}`;
      res.redirect(frontendReturnUrl);
    } else {
      // Chuyển hướng về Front-end với thông báo lỗi
      const frontendErrorUrl = `http://localhost:8080/payment-result?vnp_ResponseCode=97`;
      res.redirect(frontendErrorUrl);
    }
  } catch (error) {
     // Chuyển hướng về Front-end với thông báo lỗi
    const frontendErrorUrl = `http://localhost:8080/payment-result?vnp_ResponseCode=99`;
    res.redirect(frontendErrorUrl);
  }
};

// =================================================================
// HÀM XỬ LÝ IPN (VNPay gọi ngầm)
// =================================================================
const vnpayIpn = async (req, res, next) => {
  try {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = process.env.VNP_HASHSECRET;
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      let orderId = vnp_Params['vnp_TxnRef'];
      let rspCode = vnp_Params['vnp_ResponseCode'];

      // Kiem tra du lieu co hop le khong, cap nhat trang thai don hang
      // Ví dụ: Cập nhật trạng thái đơn hàng trong Database
      if(rspCode == '00') {
        // Cập nhật trạng thái thành công, ví dụ: status = 2 (Đã thanh toán)
        // await OrderModel.updateOne({ orderCode: orderId }, { $set: { status: 2 } });
        console.log(`Don hang ${orderId} da duoc thanh toan thanh cong.`);
      } else {
         // Cập nhật trạng thái thất bại
        // await OrderModel.updateOne({ orderCode: orderId }, { $set: { status: -1 } });
        console.log(`Don hang ${orderId} thanh toan that bai.`);
      }

      res.status(200).json({ RspCode: '00', Message: 'success' });
    } else {
      res.status(200).json({ RspCode: '97', Message: 'Fail checksum' });
    }
  } catch (error) {
    res.status(500).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

module.exports = {
  createPaymentUrl,
  vnpayReturn,
  vnpayIpn,
};