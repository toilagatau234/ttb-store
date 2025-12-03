import { Button, message, Modal, Radio, Spin, Table, Tooltip } from 'antd';
import adminApi from 'apis/adminApi';
import helpers from 'helpers';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderDetail from "containers/AccountPage/OrderList/OrderDetail";


const generateFilterOrder = () => {
  let result = [];
  for (let i = 0; i < 7; ++i) {
    result.push({ value: i, text: helpers.convertOrderStatus(i) });
  }
  return result;
};

function OrderList() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState({
    isOpen: false,
    orderId: "",
  });

  // : Cập nhật trạng thái đơn hàng
  const updateOrderStatus = async (id, orderStatus) => {
    try {
      const response = await adminApi.postUpdateOrderStatus2(id, orderStatus);
      if (response) {
        message.success("Cập nhật thành công");
        setData(
          data.map((item) =>
            // item.orderId === id ? { ...item, orderStatus } : { ...item }
            item._id === id ? { ...item, orderStatus } : { ...item }
          )
        );
      }
    } catch (error) {
      message.success("Cập nhật thất bại");
    }
  };

  // modal cập nhật trạng thái đơn hàng
  const UpdateOrderStatusModal = (defaultValue = 0, orderCode, orderId) => {
    let valueCurr = defaultValue;
    const modal = Modal.info({
      width: 768,
      title: `Cập nhật trạng thái đơn hàng #${orderCode}`,
      content: (
        <Radio.Group
          defaultValue={defaultValue}
          onChange={(v) => (valueCurr = v.target.value)}
          className="m-t-12 d-flex flex-direction-column"
        >
          {generateFilterOrder().map((item, index) => (
            <Radio className="m-b-8" key={index} value={item.value}>
              {item.text}
            </Radio>
          ))}
        </Radio.Group>
      ),
      centered: true,
      icon: null,
      okText: "Cập nhật",
      onOk: () => {
        updateOrderStatus(orderId, valueCurr);
        modal.destroy();
      },
      closable: true,
    });
  };

  const columns = [
    {
      title: "khách hàng",
      key: "owner",
      dataIndex: "deliveryAdd",
      render: (value, records) => {
        const total = helpers.calTotalOrderFee2(records); 
        return (
          <b  style={{ color: "#333" }}>{helpers.formatProductPrice(total)}</b>
        );
      },
      sorter: (a, b) =>
        helpers.calTotalOrderFee2(a) - helpers.calTotalOrderFee2(b),
    },
    {
      title: "Mã đơn hàng",
      key: "orderCode",
      dataIndex: "orderCode",
      render: (orderCode, records) => (
        <Button
          type="link"
          onClick={() =>
            // setOrderDetails({ isOpen: true, orderId: records.orderId })
            setOrderDetails({ isOpen: true, orderId: records._id })
          }
        >
          <b>{orderCode}</b>
        </Button>
      ),
    },
    {
      title: "Ngày đặt",
      key: "orderDate",
      dataIndex: "orderDate",
      render: (orderDate) => helpers.formatOrderDate(orderDate),
      defaultSortOrder: "descend",
      sorter: (a, b) => {
        if (a.orderDate > b.orderDate) return 1;
        if (a.orderDate < b.orderDate) return -1;
        return 0;
      },
    },
    {
      title: "Sản phẩm",
      key: "name",
      dataIndex: "prod",
      render: (prodName, record) => (
        // <Tooltip title={prodName}>
        //   <Link to={`/product/${record.idProduct}`}>
        //     {helpers.reduceProductName(prodName, 30)}
        //   </Link>
        // </Tooltip>
        record.orderDetails.map((item, index) => (
          <div className="m-b-12"  key={index}>
            <Link to={`/product/${item.orderProd.id}`} >
              <Tooltip title={item.orderProd.name}>
                {helpers.reduceProductName(item.orderProd.name, 30)}
              </Tooltip>
            </Link>
          </div>
        ))
      ),
    },
    {
      title: "Tổng tiền",
      key: "totalMoney",
      dataIndex: "totalMoney",
      // render: (value) => (
      //   <b style={{ color: "#333" }}>{helpers.formatProductPrice(value)}</b>
      // ),
      // sorter: (a, b) => a.totalMoney - b.totalMoney,
      render: (value, records) => {
        const total = helpers.calTotalOrderFee2(records);
        return (
          <b  style={{ color: "#333" }}>{helpers.formatProductPrice(total)}</b>
        );
      },
      sorter: (a, b) =>
        helpers.calTotalOrderFee2(a) - helpers.calTotalOrderFee2(b),
    },
    {
      title: "HT thanh toán",
      key: "paymentMethod",
      dataIndex: "paymentMethod",
      render: (value) => (value === 0 ? "Tiền mặt" : "VNPay"),
    },
    {
      title: "Trạng thái đơn hàng",
      key: "orderStatus",
      dataIndex: "orderStatus",
      filters: generateFilterOrder(),
      onFilter: (value, record) => record.orderStatus === value,
      render: (value) => helpers.convertOrderStatus(value),
    },
    {
      title: "",
      render: (_v, records) => (
        <Button
          type="dashed"
          onClick={() =>
            UpdateOrderStatusModal(
              records.orderStatus,
              records.orderCode,
              // records.orderId
              records._id,
            )
          }
        >
          Cập nhật
        </Button>
      ),
    },
  ];

  // console.log(data)

  // useEffect(() => {
  //   let isSubscribe = true;
  //   async function getOrderList() {
  //     try {
  //       setIsLoading(true);
  //       const response = await adminApi.getOrderList();
  //       if (isSubscribe && response) {
  //         const { list } = response.data;
  //         const newList = list.map((item, index) => {
  //           return {
  //             key: index,
  //             owner: item.owner,
  //             orderCode: item.orderCode,
  //             orderDate: helpers.formatOrderDate(item.orderDate),
  //             prodName: item.orderProd.name,
  //             totalMoney:
  //               item.numOfProd *
  //               (item.orderProd.price -
  //                 (item.orderProd.price * item.orderProd.discount) / 100),
  //             paymentMethod: item.paymentMethod,
  //             orderStatus: item.orderStatus,
  //             idProduct: item.orderProd.id,
  //             orderId: item._id,
  //           };
  //         });
  //         setData([...newList]);
  //         setIsLoading(false);
  //       }
  //     } catch (error) {
  //       if (isSubscribe) setIsLoading(false);
  //     }
  //   }
  //   getOrderList();
  //   return () => {
  //     isSubscribe = false;
  //   };
  // }, []);


  // : Lấy danh sách
  useEffect(() => {
    let isSubscribe = true;
    const getOrderList = async () => {
      try {
        setIsLoading(true);
        const response = await adminApi.getOrderList2();
        if (response && isSubscribe) {
          const { list } = response.data;
          setData(
            list.map((item, index) => {
              return { ...item, key: index };
            })
          );
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
        setData([]);
      }
    };

    getOrderList();

    return () => {
      isSubscribe = false;
    };
  }, []);

  return (
    <>
      {isLoading ? (
        <Spin
          className="transform-center"
          tip="Đang lấy danh sách đơn hàng ..."
        />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          pagination={{ showLessItems: true, position: ["bottomCenter"] }}
        />
      )}
       {orderDetails.isOpen && (
        <OrderDetail
          orderId={orderDetails.orderId}
          onClose={() => setOrderDetails({ isOpen: false })}
        />
      )}
    </>
  );
}

export default OrderList;
