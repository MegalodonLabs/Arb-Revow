/**
 * local_attestation.js
 * Local attestation system to replace EAS integration
 * 
 * This module implements a local attestation system that simulates
 * the functionalities of Ethereum Attestation Service (EAS), but
 * stores everything locally in localStorage.
 */

import { ethers } from 'ethers';

// Key for localStorage storage
const STORAGE_KEY = 'revow_local_attestations';

// Function to generate a unique UID for each attestation
const generateUID = () => {
  // Generate a random hash in 0x... format
  return ethers.utils.hexlify(ethers.utils.randomBytes(32));
};

/**
 * Creates a local attestation for a pledge
 * @param {Object} pledgeData - Pledge data
 * @returns {Object} - Operation result with the attestation UID
 */
export const createLocalAttestation = async (pledgeData) => {
  try {
    if (!pledgeData || !pledgeData.ipfsHash) {
      console.error('Invalid pledge data for local attestation');
      return { success: false, error: 'Invalid pledge data' };
    }
    
    console.log('Creating local attestation for pledge:', pledgeData.projectName);
    
    // Check if an attestation already exists for this pledge
    const existingUID = getLocalAttestationByIPFS(pledgeData.ipfsHash);
    if (existingUID) {
      console.log('Pledge already has a local attestation:', existingUID);
      return { 
        success: true, 
        attestationUID: existingUID,
        message: 'Pledge already has a local attestation'
      };
    }
    
    // Get the connected wallet
    let attester = 'unknown';
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          attester = accounts[0];
        }
      } catch (error) {
        console.warn('Could not get connected wallet:', error);
      }
    }
    
    // Generate a new UID
    const uid = generateUID();
    
    // Create the attestation object
    const attestation = {
      uid,
      ipfsHash: pledgeData.ipfsHash,
      attester,
      recipient: pledgeData.pledgor || attester,
      time: Math.floor(Date.now() / 1000), // Timestamp in seconds
      data: pledgeData,
      txHash: generateUID(), // Simulate a transaction hash
      createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    saveLocalAttestation(attestation);
    
    console.log('Local attestation created successfully:', uid);
    
    return {
      success: true,
      attestationUID: uid,
      txHash: attestation.txHash
    };
  } catch (error) {
    console.error('Error creating local attestation:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Saves an attestation to localStorage
 * @param {Object} attestation - Attestation object
 * @returns {boolean} - Operation success
 */
const saveLocalAttestation = (attestation) => {
  try {
    // Get existing attestations
    const attestations = getAllLocalAttestations();
    
    // Add the new attestation
    attestations[attestation.uid] = attestation;
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attestations));
    
    return true;
  } catch (error) {
    console.error('Error saving local attestation:', error);
    return false;
  }
};

/**
 * Gets all local attestations
 * @returns {Object} - Object with all attestations
 */
export const getAllLocalAttestations = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting local attestations:', error);
    return {};
  }
};

/**
 * Gets a local attestation by UID
 * @param {string} uid - Attestation UID
 * @returns {Object|null} - Attestation object or null if not found
 */
export const getLocalAttestation = (uid) => {
  if (!uid) return null;
  
  try {
    const attestations = getAllLocalAttestations();
    return attestations[uid] || null;
  } catch (error) {
    console.error('Error getting local attestation:', error);
    return null;
  }
};

/**
 * Gets a local attestation by the pledge's IPFS hash
 * @param {string} ipfsHash - Pledge's IPFS hash
 * @returns {string|null} - Attestation UID or null if not found
 */
export const getLocalAttestationByIPFS = (ipfsHash) => {
  if (!ipfsHash) return null;
  
  try {
    const attestations = getAllLocalAttestations();
    
    // Search for an attestation with the corresponding ipfsHash
    for (const [uid, attestation] of Object.entries(attestations)) {
      if (attestation.ipfsHash === ipfsHash) {
        return uid;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting local attestation by IPFS hash:', error);
    return null;
  }
};

/**
 * Gets formatted details of a local attestation
 * @param {string} uid - Attestation UID
 * @returns {Object|null} - Formatted details or null if not found
 */
export const getLocalAttestationDetails = (uid) => {
  const attestation = getLocalAttestation(uid);
  if (!attestation) return null;
  
  // Format the data into a user-friendly format
  return {
    uid: attestation.uid,
    ipfsHash: attestation.ipfsHash,
    attester: attestation.attester,
    recipient: attestation.recipient,
    time: new Date(attestation.time * 1000),
    data: attestation.data,
    txHash: attestation.txHash,
    createdAt: attestation.createdAt,
    link: getLocalAttestationLink(uid),
    isLocal: true
  };
};

/**
 * Generates a link to view a local attestation
 * @param {string} uid - Attestation UID
 * @returns {string} - URL to view the attestation
 */
export const getLocalAttestationLink = (uid) => {
  if (!uid) return '';
  
  // Create a link to the attestation details page
  // This could be an internal application route
  return `/attestation/${uid}`;
};

/**
 * Checks if a pledge has a local attestation
 * @param {Object} pledgeData - Pledge data
 * @returns {string|null} - Attestation UID or null if not found
 */
export const checkLocalAttestation = (pledgeData) => {
  if (!pledgeData || !pledgeData.ipfsHash) return null;
  
  return getLocalAttestationByIPFS(pledgeData.ipfsHash);
};

/**
 * Creates a local attestation for an existing pledge
 * @param {Object} pledgeData - Pledge data
 * @returns {Object} - Operation result
 */
export const createLocalAttestationForPledge = async (pledgeData) => {
  try {
    if (!pledgeData || !pledgeData.ipfsHash) {
      console.error('Invalid pledge data for creating local attestation:', pledgeData);
      return { success: false, error: 'Invalid pledge data' };
    }
    
    console.log('Creating local attestation for existing pledge:', pledgeData.projectName);
    
    // Check if an attestation already exists for this pledge
    const existingUID = checkLocalAttestation(pledgeData);
    if (existingUID) {
      console.log('Pledge already has a local attestation:', existingUID);
      return { 
        success: true, 
        attestationUID: existingUID,
        message: 'Pledge already has a local attestation',
        link: getLocalAttestationLink(existingUID)
      };
    }
    
    // Create a new attestation
    const result = await createLocalAttestation(pledgeData);
    
    if (result.success) {
      console.log('Local attestation successfully created for existing pledge:', result.attestationUID);
      return {
        success: true,
        attestationUID: result.attestationUID,
        link: getLocalAttestationLink(result.attestationUID)
      };
    } else {
      console.error('Error creating local attestation for existing pledge:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error creating local attestation for existing pledge:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};
