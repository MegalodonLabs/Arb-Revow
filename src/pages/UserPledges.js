import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getUserPledges } from '../utils/pledge_helper';
import { createAttestationForExistingPledge, getEASScanLink, getAttestationDetails } from '../utils/eas_new';
import { createLocalAttestationForPledge, getLocalAttestationDetails } from '../utils/local_attestation';
import { debugStorage } from '../utils/storage';

const UserPledges = ({ account }) => {
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAttestations, setCreatingAttestations] = useState({});
  const [attestationDetails, setAttestationDetails] = useState({});

  const fetchPledges = useCallback(async (forceUpdate = false) => {
    try {
      if (forceUpdate) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      
      if (!account) {
        setError('Wallet not connected. Please connect your wallet to view your pledges.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Se forçar atualização, depurar o armazenamento
      if (forceUpdate) {
        console.log('Depurando armazenamento...');
        debugStorage();
      }
      
      // Obter pledges do usuário (já enriquecidos com dados IPFS e attestations)
      console.log('Fetching user pledges:', account);
      const userPledges = await getUserPledges(account);
      console.log('Pledges obtained (already enriched):', userPledges);
      
      // Atualizar o estado com os pledges enriquecidos
      setPledges(userPledges);
    } catch (err) {
      console.error('Error fetching pledges:', err);
      setError('Error fetching pledges. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [account]);

  // Função para atualizar os dados e depurar o armazenamento
  const refreshAttestations = () => {
    // Depurar o armazenamento e atualizar os pledges
    console.log('Depurando armazenamento e atualizando pledges...');
    fetchPledges(true);
  };
  
  // Função para verificar detalhes do attestation
  const verifyAttestationDetails = async (pledge) => {
    if (!pledge || !pledge.attestationUID) {
      alert('This pledge does not have an attestation.');
      return;
    }
    
    try {
      console.log('Verificando detalhes do attestation:', pledge.attestationUID);
      
      // Marcar como carregando
      setAttestationDetails(prev => ({
        ...prev,
        [pledge.ipfsHash]: { loading: true }
      }));
      
      // Primeiro tentar obter detalhes do sistema local
      let details = getLocalAttestationDetails(pledge.attestationUID);
      
      // If not found locally, try in the EAS contract
      if (!details) {
        console.log('Attestation not found locally, trying in the EAS contract...');
        details = await getAttestationDetails(pledge.attestationUID);
      }
      
      if (details) {
        console.log('Detalhes do attestation obtidos com sucesso:', details);
        
        // Formatar a data para exibição
        const formattedTime = details.time.toLocaleString('en-US', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        // Add information about the attestation source
        const source = details.isLocal ? 'Local System' : 'Arb Revow Attestations';
        
        // Atualizar o estado com os detalhes do attestation
        setAttestationDetails(prev => ({
          ...prev,
          [pledge.ipfsHash]: {
            loading: false,
            error: null,
            data: details,
            formattedTime,
            source
          }
        }));
        
        // Atualizar o pledge com o link do attestation (caso não tenha)
        if (!pledge.attestationLink) {
          setPledges(prevPledges => 
            prevPledges.map(p => 
              p.ipfsHash === pledge.ipfsHash 
                ? { ...p, attestationLink: details.link }
                : p
            )
          );
        }
      } else {
        console.error('Attestation não encontrado');
        setAttestationDetails(prev => ({
          ...prev,
          [pledge.ipfsHash]: {
            loading: false,
            error: 'Attestation não encontrado. Pode ter sido removido ou não indexado corretamente.'
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao verificar detalhes do attestation:', error);
      setAttestationDetails(prev => ({
        ...prev,
        [pledge.ipfsHash]: {
          loading: false,
          error: `Erro ao verificar detalhes: ${error.message || 'Erro desconhecido'}`
        }
      }));
    }
  };
  // Função removida: addTestAttestationForPledge
  
  // Função para criar manualmente um attestation para um pledge existente
  const createAttestationForPledge = async (pledge) => {
    try {
      // Marcar como em progresso
      setCreatingAttestations(prev => ({
        ...prev,
        [pledge.ipfsHash]: true
      }));
      
      console.log('Criando attestation para pledge:', pledge.projectName);
      
      // Tentar criar o attestation usando o sistema local primeiro
      const result = await createLocalAttestationForPledge(pledge);
      
      // Se falhar no sistema local, tentar com o EAS como fallback
      if (!result.success) {
        console.log('Falha ao criar attestation local, tentando com EAS...');
        const easResult = await createAttestationForExistingPledge(pledge);
        if (easResult.success) {
          console.log('Attestation criado com sucesso via EAS:', easResult);
          // Usar o resultado do EAS
          Object.assign(result, easResult);
        }
      } else {
        console.log('Attestation local criado com sucesso:', result);
      }
      
      if (result.success) {
        // Atualizar o pledge com o UID do attestation
        setPledges(prevPledges => 
          prevPledges.map(p => 
            p.ipfsHash === pledge.ipfsHash 
              ? { 
                  ...p, 
                  attestationUID: result.attestationUID,
                  attestationLink: result.link
                }
              : p
          )
        );
        
        // Verificar detalhes do attestation
        setTimeout(() => {
          verifyAttestationDetails({
            ...pledge,
            attestationUID: result.attestationUID
          });
        }, 1000);
        
        alert(`Attestation criado com sucesso! ${result.link ? `Você pode visualizá-lo em: ${result.link}` : ''}`);
      } else {
        alert(`Erro ao criar attestation: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao criar attestation:', error);
      alert(`Erro ao criar attestation: ${error.message || 'Erro desconhecido'}`);
    } finally {
      // Marcar como concluído
      setCreatingAttestations(prev => ({
        ...prev,
        [pledge.ipfsHash]: false
      }));
    }
  };

  useEffect(() => {
    if (account) {
      fetchPledges();
    }
  }, [account, fetchPledges]);

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Meus Pledges</h1>
        <button 
          onClick={refreshAttestations}
          disabled={refreshing}
          className={`flex items-center px-4 py-2 rounded ${refreshing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white transition duration-150 ease-in-out`}
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Atualizando...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar Attestations
            </>
          )}
        </button>
      </div>
      
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
                
                {/* Informações Detalhadas */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Detalhes do Pledge</h3>
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
                  
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold">ID da Transação</p>
                    <p className="font-mono text-sm break-all text-gray-700">{pledge.txHash}</p>
                  </div>
                  
                  {pledge.attestationUID ? (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Attestation EAS</p>
                      
                      {/* Botão para verificar detalhes do attestation */}
                      <div className="flex space-x-2 mb-2">
                        <button
                          onClick={() => verifyAttestationDetails(pledge)}
                          disabled={attestationDetails[pledge.ipfsHash]?.loading}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          {attestationDetails[pledge.ipfsHash]?.loading ? 'Verificando...' : 'Verificar Detalhes'}
                        </button>
                        
                        {pledge.attestationLink && (
                          <a 
                            href={pledge.attestationLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Ver Attestation
                          </a>
                        )}
                      </div>
                      
                      {/* Exibir detalhes do attestation se disponíveis */}
                      {attestationDetails[pledge.ipfsHash]?.data && (
                        <div className="bg-gray-50 p-2 rounded text-xs">
                          <p className="font-semibold">Detalhes do Attestation:</p>
                          <p>Data: {attestationDetails[pledge.ipfsHash].formattedTime}</p>
                          <p>Attestor: {attestationDetails[pledge.ipfsHash].data.attester.substring(0, 6)}...{attestationDetails[pledge.ipfsHash].data.attester.substring(38)}</p>
                          <p className="mt-1">UID: <span className="font-mono">{pledge.attestationUID.substring(0, 10)}...</span></p>
                          
                          {/* Mostrar a origem do attestation */}
                          {attestationDetails[pledge.ipfsHash].source && (
                            <p className="mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${attestationDetails[pledge.ipfsHash].data.isLocal ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                {attestationDetails[pledge.ipfsHash].source}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Exibir erro se houver */}
                      {attestationDetails[pledge.ipfsHash]?.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {attestationDetails[pledge.ipfsHash].error}
                        </p>
                      )}
                      
                      {/* Mensagem informativa */}
                      {!attestationDetails[pledge.ipfsHash]?.data && !attestationDetails[pledge.ipfsHash]?.error && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Note: There may be a delay of a few minutes until the attestation is processed.
                          Click on "Verify Details" to fetch the most recent information.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Attestation Arb Revow</p>
                      <div>
                        <button
                          onClick={() => createAttestationForPledge(pledge)}
                          disabled={creatingAttestations[pledge.ipfsHash]}
                          className={`mt-1 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md ${creatingAttestations[pledge.ipfsHash] ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'} focus:outline-none transition ease-in-out duration-150`}
                        >
                          {creatingAttestations[pledge.ipfsHash] ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating...
                            </>
                          ) : (
                            <>Create Arb Revow Attestation</>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 italic">
                        This pledge does not have an attestation. Click the button above to create one.                        
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

export default UserPledges;
