import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserPledges } from '../utils/web3';
import { useWallet } from '../contexts/WalletContext';

const UserPledges = () => {
  const { account } = useWallet();
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPledges = async () => {
      if (!account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const userPledges = await getUserPledges(account);
        console.log('Pledges do usuário:', userPledges);
        setPledges(userPledges);
      } catch (err) {
        console.error('Erro ao buscar pledges:', err);
        setError('Erro ao buscar seus pledges. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchPledges();
  }, [account]);

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Meus Pledges</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Você precisa conectar sua carteira para ver seus pledges.
              </p>
            </div>
          </div>
        </div>
        <Link to="/connect" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
          Conectar Carteira
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Meus Pledges</h1>
      
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
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhum pledge encontrado</h2>
          <p className="text-gray-500 mb-6">Você ainda não registrou nenhum pledge.</p>
          <Link to="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
            Registrar Novo Pledge
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
                    <p className="text-xs text-gray-500 uppercase font-semibold">Tipo de Compromisso</p>
                    <p className="font-bold text-gray-800">{pledge.commitmentType}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Porcentagem</p>
                    <p className="font-bold text-gray-800">{pledge.percentage}%</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Data de Início</p>
                    <p className="font-bold text-gray-800">{pledge.startDate.toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Registrado em</p>
                    <p className="font-bold text-gray-800">{pledge.timestamp.toLocaleDateString()}</p>
                  </div>
                </div>
                
                {/* Descrição */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Descrição</h3>
                  <p className="text-gray-700">{pledge.description || 'Sem descrição'}</p>
                </div>
                
                {/* Informações Adicionais */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Informações Adicionais</h3>
                  <p className="text-gray-700">{pledge.additionalInfo || 'Sem informações adicionais'}</p>
                </div>
                
                {/* Informações Técnicas */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">IPFS Hash</p>
                    <p className="font-mono text-sm break-all text-gray-700">{pledge.ipfsHash}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">ID da Transação</p>
                    <p className="font-mono text-sm break-all text-gray-700">{pledge.txHash}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link to="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
          Registrar Novo Pledge
        </Link>
      </div>
    </div>
  );
};

export default UserPledges;
