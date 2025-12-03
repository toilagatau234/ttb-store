import { HomeOutlined } from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Input,
  message,
  Radio,
  Result,
  Row,
} from 'antd';
import addressApi from 'apis/addressApi';
import orderApi from 'apis/orderApi';
import couponApi from 'apis/couponApi';
import vnpayApi from 'apis/vnpayApi'; // Đảm bảo đã import API này
import CartPayment from 'components/Cart/Payment';
import constants from 'constants/index';
import UserAddressList from 'containers/AccountPage/UserAddressList';
import helpers from 'helpers';
import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import cartReducers from 'reducers/carts';
import './index.scss'; // Nếu bạn có file scss riêng, hoặc dùng style inline bên dưới

// : Lấy địa chỉ giao hàng của user theo index
const getUserDeliveryAdd = async (userId, index = 0) => {
  try {
    const response = await addressApi.getDeliveryAddressList(userId, 1);
    if (response) {
      return response.data.list[index];
    }
    return null;
  } catch (err) {
    return null;
  }
};

function PaymentPage() {
  const dispatch = useDispatch();
  const isAuth = useSelector((state) => state.authenticate.isAuth);
  const carts = useSelector((state) => state.carts);
  const user = useSelector((state) => state.user);

  const note = useRef("");
  const addressIndex = useRef(-1);

  // State quản lý phương thức vận chuyển (0: Tiêu chuẩn, 1: Nhanh...)
  const [transport, setTransport] = useState(0);

  // State quản lý phương thức thanh toán (0: COD, 1: VNPAY)
  const [paymentMethod, setPaymentMethod] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);

  // State cho Coupon
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Tính phí vận chuyển
  const transportFee = constants.TRANSPORT_METHOD_OPTIONS.find(
    (item) => item.value === transport
  )?.price || 0;

  // Tổng tiền hàng
  const cartTotal = carts.reduce(
    (a, b) => a + b.price * b.amount,
    0
  );

  // Tiền giảm giá
  const discountAmount = appliedCoupon ? (cartTotal * appliedCoupon.discount) / 100 : 0;

  // Tổng tiền thanh toán cuối cùng
  const finalTotal = cartTotal + transportFee - discountAmount;

  // --- Xử lý Coupon ---
  const onApplyCoupon = async () => {
    if (!couponCode.trim()) {
      message.warn("Vui lòng nhập mã giảm giá");
      return;
    }
    try {
      const res = await couponApi.checkCoupon(couponCode.trim().toUpperCase());
      if (res && res.status === 200) {
        setAppliedCoupon(res.data);
        message.success(`Áp dụng mã thành công! Giảm ${res.data.discount}%`);
      }
    } catch (error) {
      setAppliedCoupon(null);
      const msg = error.response?.data?.message || "Mã không hợp lệ";
      message.error(msg);
    }
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    message.info("Đã hủy mã giảm giá");
  };

  // --- Hiển thị danh sách sản phẩm ---
  const showOrderInfo = (carts) => {
    return carts.map((item, index) => (
      <Card key={index} size="small" className="m-b-8">
        <Card.Meta
          title={item.name}
          description={
            <>
              <div>{`Số lượng: ${item.amount}`}</div>
              <div className="font-weight-700" style={{ color: "#3555C5" }}>
                {helpers.formatProductPrice(item.price * item.amount)}
              </div>
            </>
          }
          avatar={<Avatar src={item.avt} shape="square" size={64} />}
        />
      </Card>
    ));
  };

  // --- Xử lý Đặt hàng chung (COD hoặc VNPAY) ---
  const onCheckout = async () => {
    // 1. Kiểm tra thông tin cơ bản
    if (carts.length === 0) {
      message.warn("Giỏ hàng trống");
      return;
    }
    if (addressIndex.current === -1) {
      message.warn("Vui lòng chọn địa chỉ giao hàng");
      return;
    }

    setIsLoading(true);
    try {
      const owner = user._id;
      const deliveryAdd = await getUserDeliveryAdd(owner, addressIndex.current);

      // Chuẩn bị dữ liệu sản phẩm
      const productList = carts.map((item) => ({
        numOfProd: item.amount,
        orderProd: {
          code: item.code,
          name: item.name,
          price: item.price,
          discount: item.discount,
          id: item._id
        },
      }));

      // Dữ liệu chung cho đơn hàng
      const orderData = {
        owner,
        deliveryAdd,
        paymentMethod, // 0: COD, 1: VNPAY
        orderStatus: 0, // 0: Pending
        transportMethod: transport,
        transportFee,
        orderDate: new Date(),
        productList,
        note: note.current,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        totalMoney: finalTotal,
      };

      // --- TRƯỜNG HỢP 1: THANH TOÁN VNPAY ---
      if (paymentMethod === 1) {
        // Tạo mã đơn hàng unique cho giao dịch
        const orderId = `ORDER_${new Date().getTime()}`;

        // Gọi API Backend để lấy link thanh toán
        const res = await vnpayApi.createPaymentUrl({
          amount: finalTotal,
          orderId: orderId,
          bankCode: '',
          language: 'vn',
          orderDescription: `Thanh toan don hang ${orderId}`
        });

        if (res && res.data && res.data.data) {
          // Lưu đơn hàng chờ vào localStorage để xử lý sau khi thanh toán thành công
          localStorage.setItem('PENDING_ORDER', JSON.stringify(orderData));

          // Chuyển hướng sang VNPAY
          window.location.href = res.data.data;
        } else {
          message.error("Không lấy được link thanh toán");
          setIsLoading(false);
        }
      }
      // --- TRƯỜNG HỢP 2: THANH TOÁN COD ---
      else {
        const response = await orderApi.postCreateOrder2(orderData);
        if (response && response.status === 200) {
          setTimeout(() => {
            message.success("Đặt hàng thành công", 2);
            setIsLoading(false);
            setIsOrderSuccess(true);
            dispatch(cartReducers.resetCart());
          }, 1000);
        }
      }

    } catch (error) {
      message.error("Đặt hàng thất bại, vui lòng thử lại", 3);
      setIsLoading(false);
    }
  };

  return (
    <>
      {carts.length <= 0 && !isOrderSuccess && (
        <Navigate to={constants.ROUTES.CART} replace />
      )}
      {isAuth ? (
        <div className="container m-tb-32" style={{ minHeight: "100vh" }}>
          {isOrderSuccess ? (
            <Result
              status="success"
              title="Đơn hàng của bạn đã đặt thành công."
              subTitle="Xem chi tiết đơn hàng vừa rồi trong phần quản lý tài khoản."
              extra={[
                <Button type="default" key="0">
                  <Link to={constants.ROUTES.ACCOUNT + "/orders"}>
                    Xem chi tiết đơn hàng
                  </Link>
                </Button>,
                <Button type="primary" key="1">
                  <Link to="/">Tiếp tục mua sắm</Link>
                </Button>,
              ]}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {/* Breadcrumb */}
              <Col span={24} className="d-flex page-position">
                <Link to="/">
                  <HomeOutlined className="p-12 icom-home font-size-16px bg-white" style={{ borderRadius: 50 }} />
                </Link>
                <span className="p-lr-8 font-weight-500" style={{ lineHeight: "40px" }}>{`>`}</span>
                <span className="p-8 font-weight-500 bg-white" style={{ borderRadius: 50 }}>Tiến hành thanh toán</span>
              </Col>

              {/* Cột Trái: Thông tin giao hàng & Thanh toán */}
              <Col span={24} md={16}>
                {/* 1. Thông tin giao hàng */}
                <div className="p-12 bg-white bor-rad-8 m-tb-16">
                  <h2>Thông tin giao hàng</h2>
                  <Radio.Group
                    defaultValue={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    className="m-tb-8"
                  >
                    {constants.TRANSPORT_METHOD_OPTIONS.map((item, index) => (
                      <Radio key={index} value={item.value}>
                        {item.label} - {helpers.formatProductPrice(item.price)}
                      </Radio>
                    ))}
                  </Radio.Group>
                  <UserAddressList
                    isCheckout={true}
                    onChecked={(value) => (addressIndex.current = value)}
                  />
                </div>

                {/* 2. Ghi chú */}
                <div className="p-12 bg-white bor-rad-8">
                  <h2 className="m-b-8">Ghi chú đơn hàng</h2>
                  <Input.TextArea
                    placeholder="Nhập thông tin cần ghi chú..."
                    maxLength={200}
                    showCount
                    allowClear
                    onChange={(value) => (note.current = value.target.value)}
                  />
                </div>

                {/* 3. Phương thức thanh toán (Đã sửa lại UI và Logic) */}
                <div className="p-12 bg-white bor-rad-8 m-tb-16">
                  <h2 className="m-b-8">Phương thức thanh toán</h2>
                  <p className="text-muted">Thông tin thanh toán của bạn sẽ luôn được bảo mật</p>
                  <Row gutter={[16, 16]}>
                    {/* COD Option */}
                    <Col span={24} md={12} onClick={() => setPaymentMethod(0)}>
                      <div
                        className={`p-tb-16 p-lr-16 bor-rad-8 cursor-pointer ${paymentMethod === 0 ? 'bg-gray item-active' : 'bg-white'}`}
                        style={{ border: paymentMethod === 0 ? '2px solid #3555C5' : '1px solid #ddd' }}
                      >
                        <div className="d-flex align-items-center">
                          <img src="https://cdn-icons-png.flaticon.com/512/2331/2331941.png" alt="cod" width={32} style={{ marginRight: 10 }} />
                          <div>
                            <b className="font-size-16px">Thanh toán khi nhận hàng (COD)</b>
                            <div className="font-size-12px">Thanh toán bằng tiền mặt khi nhận hàng</div>
                          </div>
                        </div>
                      </div>
                    </Col>

                    {/* VNPAY Option */}
                    <Col span={24} md={12} onClick={() => setPaymentMethod(1)}>
                      <div
                        className={`p-tb-16 p-lr-16 bor-rad-8 cursor-pointer ${paymentMethod === 1 ? 'bg-gray item-active' : 'bg-white'}`}
                        style={{ border: paymentMethod === 1 ? '2px solid #3555C5' : '1px solid #ddd' }}
                      >
                        <div className="d-flex align-items-center">
                          <img src="https://res.cloudinary.com/dmlv4rbtm/image/upload/v1764755006/vnpay-logo-vinadesign-25-12-59-16_royutu.jpg" alt="vnpay" width={32} style={{ marginRight: 10 }} />
                          {/* <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmxbksr1686814746080_1561522605975-5663897.png" alt="vnpay" width={32} style={{ marginRight: 10 }} /> */}
                          <div>
                            <b className="font-size-16px">Thanh toán VNPAY</b>
                            <div className="font-size-12px">Ví VNPAY, Thẻ ngân hàng, QR Code</div>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>

              {/* Cột Phải: Đơn hàng & Tổng tiền */}
              <Col span={24} md={8}>
                {/* Mã giảm giá */}
                <div className="bg-white p-12 bor-rad-8 m-b-16">
                  <h2 className="m-b-8">Mã giảm giá</h2>
                  <div className="d-flex">
                    <Input
                      placeholder="Nhập mã giảm giá"
                      value={couponCode}
                      disabled={!!appliedCoupon}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      style={{ marginRight: 8 }}
                    />
                    {appliedCoupon ? (
                      <Button danger onClick={onRemoveCoupon}>Hủy</Button>
                    ) : (
                      <Button type="primary" onClick={onApplyCoupon}>Áp dụng</Button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <div className="m-t-8" style={{ color: 'green', fontWeight: 500 }}>
                      Đã giảm {appliedCoupon.discount}% (-{helpers.formatProductPrice(discountAmount)})
                    </div>
                  )}
                </div>

                {/* Thông tin đơn hàng */}
                <div className="bg-white p-12 bor-rad-8 m-tb-16">
                  <div className="d-flex justify-content-between align-items-center m-b-12">
                    <h2>Đơn hàng</h2>
                    <Link to={constants.ROUTES.CART} style={{ color: '#1890ff' }}>Chỉnh sửa</Link>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {showOrderInfo(carts)}
                  </div>
                </div>

                {/* Tổng kết & Nút đặt hàng */}
                <div className="bg-white p-12 bor-rad-8">
                  <CartPayment
                    isLoading={isLoading}
                    carts={carts}
                    isCheckout={true}
                    transportFee={transportFee}
                    onCheckout={onCheckout} // Chỉ dùng 1 hàm xử lý duy nhất
                    discountAmount={discountAmount}
                    paymentText={paymentMethod === 1 ? "THANH TOÁN VNPAY" : "ĐẶT HÀNG"} // Đổi text nút bấm
                  />
                  <div className="t-center p-tb-16">
                    <span style={{ color: "#ff5000", fontSize: 12 }}>
                      (Xin vui lòng kiểm tra lại đơn hàng trước khi đặt mua)
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </div>
      ) : (
        <Navigate to={constants.ROUTES.LOGIN} replace />
      )}
    </>
  );
}

export default PaymentPage;