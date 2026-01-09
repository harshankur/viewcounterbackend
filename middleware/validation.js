const { body, query, param, validationResult } = require('express-validator');

/**
 * Validation middleware
 */

// Validate IP address format
const isValidIP = (ip) => {
    if (!ip) return false;
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // More robust IPv6 regex (supports shortened forms and mapped IPv4)
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1';
};

/**
 * Validate registerView request
 */
const validateRegisterView = (allowedValues) => [
    query('appId')
        .notEmpty()
        .withMessage('appId is required')
        .isIn(allowedValues.appId)
        .withMessage('Invalid appId'),

    query('deviceSize')
        .notEmpty()
        .withMessage('deviceSize is required')
        .isIn(allowedValues.deviceSize)
        .withMessage('Invalid deviceSize')
];

/**
 * Validate stats request
 */
const validateStatsRequest = (allowedValues) => [
    param('appId')
        .notEmpty()
        .withMessage('appId is required')
        .isIn(allowedValues.appId)
        .withMessage('Invalid appId')
];

/**
 * Validate views request
 */
const validateViewsRequest = (allowedValues) => [
    param('appId')
        .notEmpty()
        .withMessage('appId is required')
        .isIn(allowedValues.appId)
        .withMessage('Invalid appId'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100'),

    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('offset must be a non-negative integer')
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

module.exports = {
    isValidIP,
    validateRegisterView,
    validateStatsRequest,
    validateViewsRequest,
    handleValidationErrors
};
