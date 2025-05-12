import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { registerPledge } from '../utils/web3';
import { uploadJSONToIPFS } from '../utils/ipfs';
import { createPledgeAttestation, savePledgeAttestation, getEASScanLink } from '../utils/eas';
import { createLocalAttestation, getLocalAttestationLink } from '../utils/local_attestation';

const RegisterPledge = ({ account }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    projectName: '',
    location: '',
    commitmentType: '0', // 0 = Revenue, 1 = Token
    percentage: '',
    startDate: '',
    description: '',
    additionalInfo: ''
  });
  const [createEAS, setCreateEAS] = useState(false);
  const [attestationUID, setAttestationUID] = useState('');
  const [attestationLink, setAttestationLink] = useState('');
  const [redirectAfterSubmit, setRedirectAfterSubmit] = useState(true);
  // Note: File upload functionality removed for simplicity
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState('');

  // Check if wallet is connected
  if (!account) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Wallet Not Connected</h2>
        <p className="text-gray-600 mb-6">
          You need to connect your wallet to register a pledge.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Note: File upload functionality removed for simplicity
  const handleFileChange = (e) => {
    console.log('File upload functionality disabled');
    // Does nothing, just to maintain compatibility with the form
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTransactionStatus('');
    setWaitingConfirmation(false);

    try {
      // Validate data
      if (!formData.projectName || !formData.location || !formData.percentage || !formData.startDate) {
        throw new Error('Please fill in all required fields.');
      }

      // Validate project name and location size (max 32 bytes for bytes32)
      if (formData.projectName.length > 31 || formData.location.length > 31) {
        throw new Error('Project name and location must be at most 31 characters.');
      }

      // Validate percentage
      const percentage = parseInt(formData.percentage);
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        throw new Error('Percentage must be a number between 1 and 100.');
      }

      // Step 1: Prepare and upload to IPFS
      setTransactionStatus('Preparing data for IPFS...');
      const ipfsData = {
        projectName: formData.projectName,
        location: formData.location,
        commitmentType: formData.commitmentType === '0' ? 'Revenue' : 'Token',
        percentage: percentage,
        startDate: new Date(formData.startDate).getTime(),
        description: formData.description,
        additionalInfo: formData.additionalInfo,
        createdBy: account,
        createdAt: new Date().toISOString()
      };

      try {
        // Upload to IPFS
        setTransactionStatus('Uploading to IPFS...');
        
        // Ensure data is valid for upload
        if (!ipfsData.description) ipfsData.description = '';
        if (!ipfsData.additionalInfo) ipfsData.additionalInfo = '';
        
        console.log('Data sent to IPFS:', ipfsData);
        const ipfsResult = await uploadJSONToIPFS(ipfsData);
        if (!ipfsResult || !ipfsResult.cid) {
          throw new Error('Failed to upload to IPFS. Please try again.');
        }
        
        console.log('IPFS Hash generated:', ipfsResult.cid);
        
        const ipfsHash = ipfsResult.cid;

        // Step 2: Register on the contract
        setTransactionStatus('Sending transaction to the blockchain...');
        setWaitingConfirmation(true);
        
        // Prepare data for the contract
        const startDateTimestamp = Math.floor(new Date(formData.startDate).getTime() / 1000);
        
        // Call the contract function
        const tx = await registerPledge(
          formData.projectName,
          formData.location,
          parseInt(formData.commitmentType),
          percentage,
          startDateTimestamp,
          ipfsHash
        );
        
        console.log('Transaction sent:', tx);
        
        // Check if the transaction was successful
        if (tx.success) {
          setTransactionStatus('Pledge registered successfully!');
          console.log('Transaction confirmed:', tx.receipt);
          
          // Step 3 (optional): Create attestation on EAS
          if (createEAS) {
            try {
              setTransactionStatus('Creating local attestation...');
              
              // First try to create a local attestation
              const localResult = await createLocalAttestation({
                ...ipfsData,
                ipfsHash,
                txHash: tx.txHash,
                pledgor: account
              });
              
              if (localResult.success) {
                console.log('Local attestation created successfully:', localResult);
                setAttestationUID(localResult.attestationUID);
                const link = getLocalAttestationLink(localResult.attestationUID);
                setAttestationLink(link);
                
                // Save the attestation in localStorage for future reference
                await savePledgeAttestation(ipfsHash, localResult.attestationUID, link);
                
                setTransactionStatus('Local attestation created successfully!');
                setSuccess(`Pledge registered successfully! A local attestation has been created.`);
                setWaitingConfirmation(false);
              } else {
                console.error('Failed to create local attestation:', localResult.error);
                setTransactionStatus('Failed to create attestation, but the pledge was registered.');
                setSuccess('Pledge registered successfully! However, there was an error creating the attestation.');
                setWaitingConfirmation(false);
              }
            } catch (attestationError) {
              console.error('Error creating attestation:', attestationError);
              setTransactionStatus('Failed to create attestation, but the pledge was registered.');
              setSuccess('Pledge registered successfully! However, there was an error creating the attestation.');
              setWaitingConfirmation(false);
            }
          } else {
            setSuccess('Pledge registered successfully!');
          }
          
          // Clear form after success
          setFormData({
            projectName: '',
            location: '',
            commitmentType: '0',
            percentage: '',
            startDate: '',
            description: '',
            additionalInfo: ''
          });
          
          // Redirect to pledges page only if the user chose this option
          if (redirectAfterSubmit) {
            // Redirect to the pledges page after 3 seconds
            setTimeout(() => {
              navigate('/my-pledges');
            }, 3000);
          }
        } else {
          setTransactionStatus('Transaction failed.');
          setError('Transaction failed. Please try again.');
        }
      } catch (txError) {
        console.error('Error in blockchain transaction:', txError);
        setWaitingConfirmation(false);
        if (txError.code === 4001) { // Error code when user rejects the transaction in MetaMask
          setError('Transaction rejected. You canceled the operation in MetaMask.');
        } else {
          setError(`Transaction error: ${txError.message || 'An error occurred while processing the transaction.'}`);
        }
      }
    } catch (err) {
      console.error('Error registering pledge:', err);
      // The specific error has already been handled in the inner catch blocks
      if (!error) { // If there is no specific error message already set
        setError(err.message || 'An error occurred while registering the pledge. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Register New Pledge</h1>
      
      {error && (
        <div className="alert alert-danger mb-6" role="alert">
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 whitespace-pre-line">{success}</p>
              {attestationLink && (
                <a 
                  href={attestationLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                >
                  View attestation details
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      
      {transactionStatus && (
        <div className="card mb-6">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-2">Transaction Status</h3>
            <p>{transactionStatus}</p>
            {waitingConfirmation && (
              <div className="mt-4">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    border: '3px solid #6c5ce7', 
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    marginRight: '10px'
                  }}></div>
                  <p><strong>Waiting for confirmation in MetaMask...</strong></p>
                </div>
                <p className="mt-2" style={{ color: '#6c5ce7' }}>
                  Please check MetaMask and confirm the transaction to continue.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="projectName">
                Project Name*
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                maxLength={31}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your project name"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 31 characters</p>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="location">
                Location*
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                maxLength={31}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Country, state or city"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 31 characters</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="commitmentType">
                Commitment Type*
              </label>
              <select
                id="commitmentType"
                name="commitmentType"
                value={formData.commitmentType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="0">Revenue</option>
                <option value="1">Token</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="percentage">
                Percentage*
              </label>
              <input
                type="number"
                id="percentage"
                name="percentage"
                value={formData.percentage}
                onChange={handleChange}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1-100"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="startDate">
                Start Date*
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe details about your commitment..."
            ></textarea>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="additionalInfo">
              Additional Information
            </label>
            <textarea
              id="additionalInfo"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Any relevant additional information..."
            ></textarea>
          </div>
          
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start mb-2">
              <input
                type="checkbox"
                id="createEAS"
                checked={createEAS}
                onChange={(e) => setCreateEAS(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="createEAS" className="ml-2 block text-sm font-medium text-blue-700">
                Generate a public and verifiable record on Arb Revow Attestations
              </label>
            </div>
            <p className="text-xs text-blue-600 ml-6">
              This will create a local attestation that serves as a verifiable record of your pledge.
            </p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="redirectAfterSubmit"
                checked={redirectAfterSubmit}
                onChange={(e) => setRedirectAfterSubmit(e.target.checked)}
                className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="redirectAfterSubmit" className="ml-2 block text-sm font-medium text-gray-700">
                Redirect to "My Pledges" after registration
              </label>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg mr-4 hover:bg-gray-300 transition"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register Pledge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPledge;
