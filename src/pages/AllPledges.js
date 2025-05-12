import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllPledges } from '../utils/web3';
import { checkPledgeAttestation, getEASScanLink } from '../utils/eas';

const AllPledges = () => {
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPledges = async () => {
      try {
        setLoading(true);
        setError('');
        
        const allPledges = await getAllPledges();
        console.log('All pledges:', allPledges);
        
        // Check if each pledge has an attestation in EAS
        const pledgesWithAttestations = await Promise.all(allPledges.map(async (pledge) => {
          const attestationUID = await checkPledgeAttestation(pledge);
          return {
            ...pledge,
            attestationUID,
            attestationLink: attestationUID ? getEASScanLink(attestationUID) : null
          };
        }));
        
        setPledges(pledgesWithAttestations);
      } catch (err) {
        console.error('Error fetching pledges:', err);
        setError('Error fetching pledges. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPledges();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">All Pledges</h1>
      
      {error && (
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
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : pledges.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No pledges found</h2>
          <p className="text-gray-500 mb-6">There are no pledges registered in the system yet.</p>
          <Link to="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
            Register New Pledge
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pledges.map((pledge, index) => (
            <div key={index} className="bg-white shadow-md rounded-lg overflow-hidden">
              {/* Cabeçalho do Card */}
              <div className={`bg-gradient-to-r ${pledge.commitmentType === 'Revenue' ? 'from-purple-600 to-purple-700' : 'from-blue-600 to-blue-700'} text-white p-4`}>
                <h2 className="text-2xl font-bold mb-1">{pledge.projectName}</h2>
                <p className="text-blue-100">{pledge.location}</p>
              </div>
              
              <div className="p-6">
                {/* Informações Principais */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Commitment Type</p>
                    <p className="font-bold text-gray-800">{pledge.commitmentType}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Percentage</p>
                    <p className="font-bold text-gray-800">{pledge.percentage}%</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Start Date</p>
                    <p className="font-bold text-gray-800">{pledge.startDate.toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Registered on</p>
                    <p className="font-bold text-gray-800">{pledge.timestamp.toLocaleDateString()}</p>
                  </div>
                </div>
                
                {/* Description */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Description</h3>
                  <p className="text-gray-700">{pledge.description || 'No description'}</p>
                </div>
                
                {/* Additional Information */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Additional Information</h3>
                  <p className="text-gray-700">{pledge.additionalInfo || 'No additional information'}</p>
                </div>
                
                {/* Technical Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Pledgor Address</p>
                    <p className="font-mono text-sm break-all text-gray-700">{pledge.pledgor}</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">IPFS Hash</p>
                    <p className="font-mono text-sm break-all text-gray-700">{pledge.ipfsHash}</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Transaction ID</p>
                    <p className="font-mono text-sm break-all text-gray-700">{pledge.txHash}</p>
                  </div>
                  
                  {pledge.attestationLink && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Arb Revow Attestation</p>
                      <a 
                        href={pledge.attestationLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono text-sm break-all text-blue-600 hover:text-blue-800 underline"
                      >
                        View attestation details
                      </a>
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Note: This is a local attestation that serves as a verifiable record of the pledge.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        UID: <span className="font-mono">{pledge.attestationUID.substring(0, 10)}...</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link to="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
          Register New Pledge
        </Link>
      </div>
    </div>
  );
};

export default AllPledges;
