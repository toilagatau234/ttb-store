import { Carousel } from 'antd';
import React from 'react';
import './index.scss';

const list = [
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451596/1_ggor4n_upolrw.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451597/2_b1d6dd_fsggvv.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451597/3_wwgin5_yvwtfc.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451597/4_amgb7n_veekit.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451597/5_kfuyu2_z8lozt.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451596/6_kt4deu_ghgfcu.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451595/7_gokjlq_tc03cr.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451595/8_ontuqq_nsbyhe.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451596/9_qq407q_lwsjsy.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451596/10_pcgl2j_lrpv1v.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451596/11_vhqqe1_lpj05x.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451597/12_crycbe_aeiqze.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763451596/13_ytp67u_gqeqs3.webp',
];

function SaleOff() {
  return (
    <Carousel className="Sale-Off" autoplay>
      {list.map((item, index) => (
        <img className="Sale-Off-img" src={item} key={index} />
      ))}
    </Carousel>
  );
}

export default SaleOff;
