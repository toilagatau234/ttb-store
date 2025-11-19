const OrderModel = require('../models/order.model');
const helpers = require('../helpers');
const ProductModel = require('../models/product.models/product.model');

// api: lấy danh sách đơn hàng
const getOrderList = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const orderList = await OrderModel.find({ owner: userId }).select(
      '-owner -deliveryAdd -paymentMethod -note',
    );
    if (orderList) {
      return res.status(200).json({ list: orderList });
    }
    return res.status(200).json({ list: [] });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ list: [] });
  }
};

// api: lấy chi tiết 1 đơn hàng
const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.query;
    const order = await OrderModel.findById(orderId).select('-_id -owner');
    if (order) {
      const { deliveryAdd } = order;
      const { name, phone, address } = deliveryAdd;
      const addressStr = await helpers.convertAddress(address);
      let newOrder = {
        ...order._doc,
        deliveryAdd: { name, phone, address: addressStr },
      };
      return res.status(200).json({ order: newOrder });
    }
    return res.status(400).json({});
  } catch (error) {
    console.error(error);
    return res.status(400).json({});
  }
};

// api: tạo 1 đơn hàng (tách nhiều sản phẩm ra mỗi sp 1 đơn)
const postCreateOrder = async (req, res, next) => {
  try {
    const data = req.body;
    const {
      owner,
      deliveryAdd,
      paymentMethod,
      orderStatus,
      transportMethod,
      transportFee,
      orderDate,
      productList,
      note,
    } = data;

    let createdOrders = [];
    let totalAmount = 0;

    for (let i = 0; i < productList.length; ++i) {
      const { orderProd, numOfProd } = productList[i];
      const product = await ProductModel.findById(orderProd.id);
      if (product) {
        if (product.stock < parseInt(numOfProd)) {
          return res.status(401).json({ message: 'Sản phẩm tồn kho đã hết' });
        } else {
          await ProductModel.updateOne(
            { _id: orderProd.id },
            { stock: product.stock - parseInt(numOfProd) },
          );
          const newOrder = await OrderModel.create({
            owner,
            orderCode: helpers.generateVerifyCode(6),
            deliveryAdd,
            paymentMethod,
            orderStatus,
            transportMethod,
            transportFee,
            orderDate,
            orderProd,
            numOfProd,
            note,
          });

          if (newOrder) {
             createdOrders.push(newOrder.orderCode);
             // Tính tổng tiền thật (đã trừ khuyến mãi)
             totalAmount += (newOrder.orderProd.price * newOrder.numOfProd - (newOrder.orderProd.price * newOrder.numOfProd * newOrder.orderProd.discount) / 100) + newOrder.transportFee;
          }
        }
      } else {
        return res.status(401).json({ message: 'Sản phẩm đẫ ngừng bán' });
      }
    }
    // if (response) return res.status(200).json({});

    if (createdOrders.length > 0) {
      // Nếu là thanh toán tiền mặt, trả về như cũ
      if (paymentMethod === 0) {
        return res.status(200).json({});
      } 
      // Nếu là VNPay, trả về mã đơn hàng (ta sẽ gộp lại) và tổng tiền
      else if (paymentMethod === 1) {
        const combinedOrderId = createdOrders.join(';'); // Gộp nhiều mã đơn hàng thành 1 mã
        return res.status(200).json({
          orderId: combinedOrderId,
          amount: totalAmount,
        });
      }
  }
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Lỗi hệ thống' });
  }
};

module.exports = {
  getOrderList,
  getOrderDetails,
  postCreateOrder,
};
