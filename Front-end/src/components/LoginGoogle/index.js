import { message } from 'antd';
import loginApi from 'apis/loginApi';
import ggIcon from 'assets/icon/gg-icon.png';
import constants from 'constants/index';
import PropTypes from 'prop-types';
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import authReducers from 'reducers/auth';
import './index.scss';

function LoginGoogle(props) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // xử lý khi đăng nhập thành công
  const onLoginSuccess = async (data) => {
    try {
      message.success('Đăng nhập thành công');
      // lưu refresh token vào local storage
      localStorage.setItem(constants.REFRESH_TOKEN, data.refreshToken);
      // Note: Lưu jwt vào localStorage nếu deploy heroku
      if (process.env.NODE_ENV === 'production')
        localStorage.setItem(constants.ACCESS_TOKEN_KEY, data.token);
      dispatch(authReducers.setIsAuth(true));
      setTimeout(() => {
        navigate(-1);
      }, constants.DELAY_TIME);
    } catch (error) {
      message.error('Lỗi đăng nhập.');
    }
  };

  // login with Google
  const onLoginWithGoogle = async (credentialResponse) => {
    try {
      // credentialResponse chứa 'credential' là ID Token (JWT)
      const { credential } = credentialResponse;
      const response = await loginApi.postLoginWithGoogle({
        idToken: credential, // Gửi ID Token lên server
      });
      const { status, data } = response;
      //login success -> redirect home
      if (status === 200) {
        onLoginSuccess(data);
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message);
      } else {
        message.error('Đăng nhập thất bại, thử lại');
      }
    }
  };

  return (
    <>
      <GoogleLogin
        onSuccess={onLoginWithGoogle}
        onError={() => {
          message.error('Đăng nhập Google thất bại, thử lại');
        }}
        useOneTap // Tùy chọn: bật tính năng one-tap login
        width="300px" // Tùy chỉnh chiều rộng
        theme="outline"
        text="continue_with"
      />
    </>
  );
}

LoginGoogle.defaultProps = {
  title: 'Google+',
  className: '',
};

LoginGoogle.propTypes = {
  title: PropTypes.string,
  className: PropTypes.string,
};

export default LoginGoogle;