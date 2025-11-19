const vnpayApi = require('express').Router();
const vnpayController = require('../controllers/vnpay.controller');

// API tạo URL thanh toán
vnpayApi.post('/create_payment_url', vnpayController.createPaymentUrl);

// API VNPay gọi khi thanh toán xong (để redirect)
vnpayApi.get('/vnpay_return', vnpayController.vnpayReturn);

// API VNPay gọi ngầm để cập nhật DB
vnpayApi.get('/vnpay_ipn', vnpayController.vnpayIpn);

module.exports = vnpayApi;