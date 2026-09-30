'use strict';

const express = require('express');
const controller = require('./qr-order.controller');

const router = express.Router();

// Public compatibility contract used by the Pronto QR ordering frontend.
router.get('/menu', controller.getMenu);
router.get('/tables/validate', controller.validateTable);
router.post('/orders', controller.createOrder);
router.get('/orders/public/:publicToken', controller.getPublicOrder);
router.post('/orders/public/:publicToken/cancel', controller.cancelPublicOrder);

module.exports = { webhookRouter: router };
