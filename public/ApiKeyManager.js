/**
 * Secure API Key Management using Web Crypto API
 * Provides encrypted storage for Groq API keys in localStorage
 */
class ApiKeyManager {
    constructor() {
        this.keyName = 'groq_api_key';
        this.saltName = 'groq_key_salt';
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    /**
     * Generate a cryptographic key from a password using PBKDF2
     * @param {string} password - The password to derive key from
     * @param {Uint8Array} salt - Salt for key derivation
     * @returns {Promise<CryptoKey>} The derived key
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Generate a random salt for key derivation
     * @returns {Uint8Array} Random salt
     */
    generateSalt() {
        return window.crypto.getRandomValues(new Uint8Array(16));
    }

    /**
     * Generate a device-specific password for encryption
     * Uses browser fingerprinting for consistency across sessions
     * @returns {string} Device-specific password
     */
    getDevicePassword() {
        const navigator = window.navigator;
        const screen = window.screen;
        
        // Create a device fingerprint from available browser properties
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown'
        ].join('|');

        // Hash the fingerprint to create a consistent password
        return btoa(fingerprint).substring(0, 32);
    }

    /**
     * Encrypt and save API key to localStorage
     * @param {string} apiKey - The API key to save
     * @returns {Promise<boolean>} Success status
     */
    async saveApiKey(apiKey) {
        try {
            if (!apiKey || typeof apiKey !== 'string') {
                throw new Error('Invalid API key provided');
            }

            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API not available');
            }

            const password = this.getDevicePassword();
            const salt = this.generateSalt();
            const key = await this.deriveKey(password, salt);

            // Encrypt the API key
            const encoder = new TextEncoder();
            const data = encoder.encode(apiKey);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );

            // Store encrypted data and metadata
            const encryptedKey = {
                data: Array.from(new Uint8Array(encryptedData)),
                iv: Array.from(iv),
                salt: Array.from(salt),
                timestamp: Date.now()
            };

            localStorage.setItem(this.keyName, JSON.stringify(encryptedKey));
            localStorage.setItem(this.saltName, JSON.stringify(Array.from(salt)));

            console.log('API key saved successfully');
            return true;

        } catch (error) {
            console.error('Failed to save API key:', error);
            this.clearApiKey(); // Clear any partial data
            throw new Error(`Failed to save API key: ${error.message}`);
        }
    }

    /**
     * Load and decrypt API key from localStorage
     * @returns {Promise<string|null>} The decrypted API key or null if not found
     */
    async loadApiKey() {
        try {
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                console.warn('Web Crypto API not available');
                return null;
            }

            const encryptedKeyData = localStorage.getItem(this.keyName);
            if (!encryptedKeyData) {
                return null;
            }

            const encryptedKey = JSON.parse(encryptedKeyData);
            
            // Validate the stored data structure
            if (!encryptedKey.data || !encryptedKey.iv || !encryptedKey.salt) {
                console.warn('Invalid encrypted key data structure');
                this.clearApiKey();
                return null;
            }

            const password = this.getDevicePassword();
            const salt = new Uint8Array(encryptedKey.salt);
            const key = await this.deriveKey(password, salt);

            // Decrypt the API key
            const iv = new Uint8Array(encryptedKey.iv);
            const encryptedData = new Uint8Array(encryptedKey.data);

            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encryptedData
            );

            const decoder = new TextDecoder();
            const apiKey = decoder.decode(decryptedData);

            console.log('API key loaded successfully');
            return apiKey;

        } catch (error) {
            console.error('Failed to load API key:', error);
            this.clearApiKey(); // Clear corrupted data
            return null;
        }
    }

    /**
     * Clear stored API key from localStorage
     * @returns {boolean} Success status
     */
    clearApiKey() {
        try {
            localStorage.removeItem(this.keyName);
            localStorage.removeItem(this.saltName);
            console.log('API key cleared successfully');
            return true;
        } catch (error) {
            console.error('Failed to clear API key:', error);
            return false;
        }
    }

    /**
     * Check if an API key is currently stored
     * @returns {boolean} True if key exists
     */
    hasApiKey() {
        return localStorage.getItem(this.keyName) !== null;
    }

    /**
     * Get metadata about the stored key (without decrypting)
     * @returns {Object|null} Key metadata or null if no key stored
     */
    getKeyMetadata() {
        try {
            const encryptedKeyData = localStorage.getItem(this.keyName);
            if (!encryptedKeyData) {
                return null;
            }

            const encryptedKey = JSON.parse(encryptedKeyData);
            return {
                hasKey: true,
                timestamp: encryptedKey.timestamp,
                savedAt: new Date(encryptedKey.timestamp).toLocaleString()
            };
        } catch (error) {
            console.error('Failed to get key metadata:', error);
            return null;
        }
    }

    /**
     * Validate API key format (basic validation)
     * @param {string} apiKey - The API key to validate
     * @returns {boolean} True if format appears valid
     */
    validateKeyFormat(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        // Basic Groq API key format validation
        // Groq keys typically start with 'gsk_' and are around 56 characters
        const groqKeyPattern = /^gsk_[A-Za-z0-9]{48,}$/;
        return groqKeyPattern.test(apiKey.trim());
    }

    /**
     * Update an existing API key
     * @param {string} newApiKey - The new API key
     * @returns {Promise<boolean>} Success status
     */
    async updateApiKey(newApiKey) {
        // Clear existing key first
        this.clearApiKey();
        
        // Save new key
        return await this.saveApiKey(newApiKey);
    }
}

// Export for use in other modules
window.ApiKeyManager = ApiKeyManager;