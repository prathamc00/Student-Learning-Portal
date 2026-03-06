const Certificate = require('../models/certificateModel');

const getCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: certificates.length, certificates });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch certificates', error: error.message });
    }
};

const getCertificateById = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }
        res.status(200).json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch certificate', error: error.message });
    }
};

const createCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.create(req.body);
        res.status(201).json({ success: true, message: 'Certificate created', certificate });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to create certificate', error: error.message });
    }
};

const updateCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }
        res.status(200).json({ success: true, message: 'Certificate updated', certificate });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to update certificate', error: error.message });
    }
};

const deleteCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findByIdAndDelete(req.params.id);
        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found' });
        }
        res.status(200).json({ success: true, message: 'Certificate deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete certificate', error: error.message });
    }
};

module.exports = {
    getCertificates,
    getCertificateById,
    createCertificate,
    updateCertificate,
    deleteCertificate,
};
