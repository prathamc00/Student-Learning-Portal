const express = require('express');
const {
    getCertificates,
    getCertificateById,
    createCertificate,
    updateCertificate,
    deleteCertificate,
} = require('../controllers/certificateController');

const router = express.Router();

router.route('/').get(getCertificates).post(createCertificate);
router.route('/:id').get(getCertificateById).put(updateCertificate).delete(deleteCertificate);

module.exports = router;
