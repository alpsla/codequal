"use strict";
/**
 * Helper utilities for CodeQual
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepClone = deepClone;
exports.isEmpty = isEmpty;
exports.formatDate = formatDate;
exports.truncate = truncate;
exports.sleep = sleep;
exports.retry = retry;
/**
 * Deep clone an object
 * @param obj Object to clone
 * @returns Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value Value to check
 * @returns True if empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    return false;
}
/**
 * Format a date string
 * @param date Date to format
 * @returns Formatted date string
 */
function formatDate(date) {
    return date.toISOString();
}
/**
 * Truncate a string to a maximum length
 * @param str String to truncate
 * @param maxLength Maximum length
 * @returns Truncated string
 */
function truncate(str, maxLength) {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength) + '...';
}
/**
 * Sleep for a specified time
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry a function multiple times
 * @param fn Function to retry
 * @param retries Number of retries
 * @param delay Delay between retries in milliseconds
 * @returns Promise that resolves with the function result
 */
async function retry(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0) {
            throw error;
        }
        await sleep(delay);
        return retry(fn, retries - 1, delay);
    }
}
