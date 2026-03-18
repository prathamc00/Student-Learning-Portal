const express = require('express');
const {
    getCertificates,
    getCertificateById,
    createCertificate,
    updateCertificate,
    deleteCertificate,
} = require('./certificate.controller');
const { protect, staffOnly } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.route('/').get(getCertificates).post(protect, staffOnly, createCertificate);
router.route('/:id').get(getCertificateById).put(protect, staffOnly, updateCertificate).delete(protect, staffOnly, deleteCertificate);

module.exports = router;
