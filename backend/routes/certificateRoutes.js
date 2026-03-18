const express = require('express');
const {
    getCertificates,
    getCertificateById,
    createCertificate,
    updateCertificate,
    deleteCertificate,
} = require('../controllers/certificateController');
const { protect, staffOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(getCertificates).post(protect, staffOnly, createCertificate);
router.route('/:id').get(getCertificateById).put(protect, staffOnly, updateCertificate).delete(protect, staffOnly, deleteCertificate);

module.exports = router;
