import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAttestationDetails } from '../utils/eas_new';
import { getLocalAttestationDetails } from '../utils/local_attestation';

const AttestationView = () => {
  const { uid } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attestation, setAttestation] = useState(null);

  useEffect(() => {
    const fetchAttestationDetails = async () => {
      if (!uid) {
        setError('Attestation UID not provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching attestation details:', uid);
        setLoading(true);
        
        // First try to get from local system
        let details = getLocalAttestationDetails(uid);
        
        // If not found locally, try the Arb Revow contract
        if (!details) {
          console.log('Attestation not found locally, trying Arb Revow contract...');
          details = await getAttestationDetails(uid);
        }
        
        if (details) {
          console.log('Attestation details successfully retrieved:', details);
          setAttestation(details);
        } else {
          setError('Attestation not found. Please verify the UID and try again.');
        }
      } catch (err) {
        console.error('Error fetching attestation details:', err);
        setError(`Error fetching details: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAttestationDetails();
  }, [uid]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format address
  const formatAddress = (address) => {
    if (!address) return 'Address not available';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Attestation Details</h1>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : attestation ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h2 className="text-2xl font-bold mb-1">Arb Revow Attestation</h2>
            <p className="text-blue-100">
              {attestation.isLocal ? 'Local System' : 'Blockchain Attestation'}
            </p>
          </div>
          
          <div className="p-6">
            {/* Main Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Attestation UID</p>
                <p className="font-mono text-sm break-all text-gray-700">{uid}</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Creation Date</p>
                <p className="font-bold text-gray-800">{formatDate(attestation.time)}</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Attestor</p>
                <p className="font-bold text-gray-800">{formatAddress(attestation.attester)}</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Recipient</p>
                <p className="font-bold text-gray-800">{formatAddress(attestation.recipient)}</p>
              </div>
            </div>
            
            {/* Pledge Data */}
            {attestation.data && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Pledge Data</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Project Name</p>
                    <p className="font-bold text-gray-800">{attestation.data.projectName || 'Not specified'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Commitment Type</p>
                    <p className="font-bold text-gray-800">{attestation.data.commitmentType || 'Not specified'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Percentage</p>
                    <p className="font-bold text-gray-800">{attestation.data.percentage ? `${attestation.data.percentage}%` : 'Not specified'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Location</p>
                    <p className="font-bold text-gray-800">{attestation.data.location || 'Not specified'}</p>
                  </div>
                </div>
                
                {attestation.data.description && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Description</h3>
                    <p className="text-gray-700">{attestation.data.description}</p>
                  </div>
                )}
                
                {attestation.data.additionalInfo && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Additional Information</h3>
                    <p className="text-gray-700">{attestation.data.additionalInfo}</p>
                  </div>
                )}
              </>
            )}
            
            {/* Technical Information */}
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Technical Information</h3>
              
              {attestation.ipfsHash && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold">IPFS Hash</p>
                  <p className="font-mono text-sm break-all text-gray-700">{attestation.ipfsHash}</p>
                </div>
              )}
              
              {attestation.txHash && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Transaction Hash</p>
                  <p className="font-mono text-sm break-all text-gray-700">{attestation.txHash}</p>
                </div>
              )}
              
              <div className="mt-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Source</p>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${attestation.isLocal ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {attestation.isLocal ? 'Local System' : 'Arb Revow Attestations'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No attestation found with the specified UID.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <Link to="/my-pledges" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to My Pledges
        </Link>
      </div>
    </div>
  );
};

export default AttestationView;
