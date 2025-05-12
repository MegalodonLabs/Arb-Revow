import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllLocalAttestations } from '../utils/local_attestation';

function AllAttestations() {
  const [attestations, setAttestations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttestations = async () => {
      try {
        setLoading(true);
        
        // Get all attestations from local storage
        const attestationsObj = getAllLocalAttestations();
        
        // Convert from object to array format
        const attestationsArray = Object.entries(attestationsObj).map(([uid, data]) => ({
          uid,
          ...data,
          // Ensure createdAt is a Date object for proper formatting
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(data.time * 1000)
        }));
        
        // Sort by creation date (newest first)
        attestationsArray.sort((a, b) => {
          const dateA = a.createdAt || 0;
          const dateB = b.createdAt || 0;
          return dateB - dateA;
        });
        
        console.log('Fetched attestations:', attestationsArray);
        setAttestations(attestationsArray);
      } catch (err) {
        console.error('Error fetching attestations:', err);
        setError('Failed to load attestations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttestations();
  }, []);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">All Attestations</h1>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : attestations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No attestations found.</p>
          <p className="text-gray-400">
            Attestations will appear here when you create them during pledge registration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attestations.map((attestation) => (
            <div key={attestation.uid} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 truncate">{attestation.data?.projectName || 'Unnamed Project'}</h2>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Created:</span> {formatDate(attestation.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Attestor:</span> {attestation.attestor ? 
                      `${attestation.attestor.substring(0, 6)}...${attestation.attestor.substring(attestation.attestor.length - 4)}` : 
                      'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Type:</span> {attestation.data?.commitmentType === 0 ? 'Revenue Share' : 'Token Share'}
                  </p>
                </div>
                
                <div className="flex justify-between items-center">
                  <Link 
                    to={`/attestation/${attestation.uid}`}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                  
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    {attestation.data?.percentage}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AllAttestations;
