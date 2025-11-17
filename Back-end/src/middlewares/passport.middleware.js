const passport = require('passport');
const AccountModel = require('../models/account.models/account.model');
const jwt = require('jsonwebtoken');
const express = require('express');

//authentication with JWT
const jwtAuthentication = async (req, res, next) => {
  try {
    res.locals.isAuth = false;
    let token = null;
    if (express().get('env') === 'production') token = req.query.token;
    else token = req.cookies.access_token;

    //if not exist cookie[access_token] -> isAuth = false -> next
    if (!token) {
      next();
      return;
    }
    //verify jwt
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (decoded) {
      const { accountId } = decoded.sub;
      const user = await AccountModel.findById(accountId);
      if (user) {
        res.locals.isAuth = true;
        req.user = user;
      }
    }
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Unauthorized.',
      error,
    });
  }
};

module.exports = {
  jwtAuthentication,
};
