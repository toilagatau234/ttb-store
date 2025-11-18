import { Carousel } from 'antd';
import React from 'react';
import './index.scss';

const list = [
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763452410/unnamed_2_d2ccjd_xwiypl.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763452409/unnamed_flqfng_qafqwa.webp',
  'https://res.cloudinary.com/dmlv4rbtm/image/upload/v1763452409/unnamed_1_t5luv4_t64cl6.webp',
];

function ProductCarousel() {
  return (
    <Carousel className="Product-Carousel m-tb-24 bor-rad-8" autoplay>
      {list.map((item, index) => (
        <img
          className="Product-Carousel-img bor-rad-8"
          src={item}
          key={index}
        />
      ))}
    </Carousel>
  );
}

export default ProductCarousel;
