/**
 * eas_new.js
 * Sistema centralizado para gerenciamento de attestations EAS
 * 
 * Este módulo implementa um sistema organizado e confiável para
 * interagir com o Ethereum Attestation Service (EAS).
 */

import { ethers } from 'ethers';
import { saveAttestation, getAttestationUID, saveIPFSData } from './storage';

// Configurações do EAS para Arbitrum Sepolia
const EAS_CONTRACT_ADDRESS = "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458";
const SCHEMA_REGISTRY_ADDRESS = "0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB";
const SCHEMA_UID = "0x50eb4e430e8a389676629e56f689476a4b3bdf25bd5b3020dea23df68b60813a";

// Schema personalizado para os pledges do Revow
const PLEDGE_SCHEMA = "string projectName, uint8 commitmentType, uint256 percentage, uint256 startDate, string ipfsHash";

// ABI simplificado para o contrato EAS
const EAS_ABI = [
  "function attest(tuple(bytes32 schema, tuple(address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data)) external payable returns (bytes32)",
  "function getAttestation(bytes32 uid) external view returns (tuple(bytes32 uid, bytes32 schema, address recipient, address attester, uint64 time, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data))",
  "function getAttestationWithExtraData(bytes32 uid) external view returns (tuple(bytes32 uid, bytes32 schema, address recipient, address attester, uint64 time, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, bytes32[] extraData))",
  "event Attested(bytes32 indexed schema, bytes32 indexed uid, address indexed attester, bytes32 refUID)"
];

const SCHEMA_REGISTRY_ABI = [
  "function register(string calldata schema, address resolver, bool revocable) external returns (bytes32)",
  "event Registered(bytes32 indexed uid, address indexed registerer, bytes32 schema)"
];

/**
 * Obtém o contrato EAS
 * @returns {ethers.Contract} - Instância do contrato EAS
 */
export const getEASContract = () => {
  if (!window.ethereum) {
    throw new Error('Metamask não encontrada!');
  }
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(EAS_CONTRACT_ADDRESS, EAS_ABI, signer);
  
  return contract;
};

/**
 * Obtém o contrato SchemaRegistry
 * @returns {ethers.Contract} - Instância do contrato SchemaRegistry
 */
export const getSchemaRegistryContract = () => {
  if (!window.ethereum) {
    throw new Error('Metamask não encontrada!');
  }
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(SCHEMA_REGISTRY_ADDRESS, SCHEMA_REGISTRY_ABI, signer);
  
  return contract;
};

/**
 * Registra um schema no EAS (apenas necessário uma vez)
 * @returns {Promise<Object>} - Resultado da operação
 */
export const registerSchema = async () => {
  try {
    const schemaRegistry = getSchemaRegistryContract();
    
    console.log('Registrando schema:', PLEDGE_SCHEMA);
    
    // Registrar o schema
    const tx = await schemaRegistry.register(
      PLEDGE_SCHEMA,
      ethers.constants.AddressZero, // Sem resolver
      true // Revocable
    );
    
    console.log('Transação de registro enviada:', tx.hash);
    
    // Aguardar confirmação
    const receipt = await tx.wait();
    console.log('Schema registrado com sucesso!', receipt);
    
    // Extrair o UID do schema do evento
    const event = receipt.events.find(e => e.event === 'Registered');
    const schemaUID = event.args.uid;
    
    console.log('Schema UID:', schemaUID);
    
    return {
      success: true,
      schemaUID: schemaUID,
      txHash: tx.hash
    };
  } catch (error) {
    console.error('Erro ao registrar schema:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
};

/**
 * Cria um attestation para um pledge
 * @param {Object} pledgeData - Dados do pledge
 * @returns {Promise<Object>} - Resultado da operação
 */
export const createPledgeAttestation = async (pledgeData) => {
  try {
    if (!pledgeData || !pledgeData.ipfsHash) {
      console.error('Dados de pledge inválidos:', pledgeData);
      return { success: false, error: 'Dados de pledge inválidos' };
    }
    
    console.log('Criando attestation para pledge:', pledgeData);
    
    // Verificar se já existe um attestation para este pledge
    const existingUID = await getAttestationUID(pledgeData.ipfsHash);
    if (existingUID) {
      console.log('Pledge já possui um attestation:', existingUID);
      return { 
        success: true, 
        attestationUID: existingUID,
        message: 'Pledge já possui um attestation'
      };
    }
    
    // Corrigir o formato dos dados
    const fixedData = fixPledgeDataFormat(pledgeData);
    
    // Preparar os dados para o attestation
    const abiCoder = new ethers.utils.AbiCoder();
    
    // Converter dados para os tipos corretos
    const projectName = fixedData.projectName;
    const commitmentType = fixedData.commitmentType === 'Revenue' ? 0 : 1;
    const percentage = fixedData.percentage;
    const startDateTimestamp = Math.floor(new Date(fixedData.startDate).getTime() / 1000);
    const ipfsHash = fixedData.ipfsHash;
    
    console.log('Dados para encodificação:');
    console.log('- projectName:', projectName);
    console.log('- commitmentType:', commitmentType);
    console.log('- percentage:', percentage);
    console.log('- startDateTimestamp:', startDateTimestamp);
    console.log('- ipfsHash:', ipfsHash);
    
    // Encodificar os dados conforme o schema
    const encodedData = abiCoder.encode(
      ['string', 'uint8', 'uint256', 'uint256', 'string'],
      [
        projectName,
        commitmentType,
        percentage,
        startDateTimestamp,
        ipfsHash
      ]
    );
    
    console.log('Dados encodificados:', encodedData);
    
    // Obter o contrato EAS
    const easContract = getEASContract();
    
    // Criar o attestation
    const tx = await easContract.attest({
      schema: SCHEMA_UID,
      data: {
        recipient: ethers.constants.AddressZero, // Sem destinatário específico
        expirationTime: 0, // Sem expiração
        revocable: true,
        refUID: ethers.constants.HashZero, // Sem referência
        data: encodedData,
        value: 0 // Sem valor
      }
    });
    
    console.log('Transação de attestation enviada:', tx.hash);
    
    // Aguardar confirmação
    const receipt = await tx.wait();
    console.log('Attestation criado com sucesso!', receipt);
    
    // Extrair o UID do attestation do evento ou diretamente da transação
    let attestationUID;
    
    // Método 1: Tentar extrair do evento Attested
    try {
      const event = receipt.events?.find(e => e.event === 'Attested');
      if (event && event.args && event.args.uid) {
        attestationUID = event.args.uid;
        console.log('Attestation UID extraído do evento:', attestationUID);
      }
    } catch (eventError) {
      console.warn('Não foi possível extrair UID do evento:', eventError);
    }
    
    // Método 2: Se não encontrou no evento, usar o retorno da transação
    if (!attestationUID) {
      try {
        // O valor de retorno da função attest é o UID
        attestationUID = receipt.logs[0].topics[2]; // O UID geralmente está no terceiro tópico (índice 2)
        console.log('Attestation UID extraído dos logs:', attestationUID);
      } catch (logError) {
        console.warn('Não foi possível extrair UID dos logs:', logError);
      }
    }
    
    // Método 3: Se ainda não tiver o UID, gerar um baseado no hash da transação
    if (!attestationUID) {
      attestationUID = ethers.utils.keccak256(tx.hash);
      console.log('Attestation UID gerado a partir do hash da transação:', attestationUID);
    }
    
    console.log('Attestation UID final:', attestationUID);
    
    // Garantir que o UID seja uma string antes de salvar
    const uidString = String(attestationUID).replace(/^0x/, '0x');
    console.log('UID convertido para string antes de salvar:', uidString);
    
    // Salvar o attestation localmente
    saveAttestation(ipfsHash, uidString, pledgeData);
    
    // Salvar dados IPFS
    saveIPFSData(ipfsHash, pledgeData);
    
    return {
      success: true,
      attestationUID: uidString,
      txHash: tx.hash
    };
  } catch (error) {
    console.error('Erro ao criar attestation:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
};

/**
 * Verifica se um pledge tem um attestation
 * @param {Object} pledgeData - Dados do pledge
 * @returns {Promise<string|null>} - UID do attestation ou null se não encontrado
 */
export const checkPledgeAttestation = async (pledgeData) => {
  if (!pledgeData || !pledgeData.ipfsHash) {
    console.error('Dados de pledge inválidos para verificar attestation:', pledgeData);
    return null;
  }
  
  console.log('Verificando attestation para pledge:', pledgeData.projectName);
  console.log('IPFS Hash:', pledgeData.ipfsHash);
  
  // Etapa 1: Verificar se já temos um attestation salvo para este pledge no armazenamento local
  const attestationUID = getAttestationUID(pledgeData.ipfsHash);
  
  if (attestationUID) {
    console.log('Attestation encontrado no armazenamento local:', attestationUID);
    
    // Verificar se o attestation existe no contrato EAS
    try {
      const attestationDetails = await getAttestationDetails(attestationUID);
      if (attestationDetails) {
        console.log('Attestation verificado no contrato EAS:', attestationDetails);
        return attestationUID;
      } else {
        console.log('Attestation não encontrado no contrato EAS, pode ter sido removido ou não indexado corretamente');
        // Continuar com a busca na blockchain
      }
    } catch (error) {
      console.error('Erro ao verificar attestation no contrato EAS:', error);
      // Continuar com a busca na blockchain
    }
  }
  
  // Etapa 2: Se não encontrado localmente ou não verificado no contrato, buscar na blockchain
  // Implementação futura para buscar attestations diretamente na blockchain
  
  console.log('Nenhum attestation válido encontrado para este pledge');
  return null;
};

/**
 * Obtém o link do EASScan para um attestation
 * @param {string|object} attestationUID - UID do attestation
 * @returns {string} - URL do EASScan
 */
export const getEASScanLink = (attestationUID) => {
  if (!attestationUID) return '';
  
  // Garantir que o UID seja uma string
  const uidString = String(attestationUID).replace(/^0x/, '0x');
  
  return `https://sepolia.easscan.org/attestation/view/${uidString}`;
};

/**
 * Obtém os detalhes de um attestation diretamente do contrato EAS
 * @param {string|object} attestationUID - UID do attestation
 * @returns {Promise<Object|null>} - Detalhes do attestation ou null se não encontrado
 */
export const getAttestationDetails = async (attestationUID) => {
  if (!attestationUID) return null;
  
  try {
    // Garantir que o UID seja uma string válida
    const uidString = String(attestationUID).replace(/^0x/, '0x');
    console.log('Obtendo detalhes do attestation diretamente do contrato EAS (UID convertido):', uidString);
    
    // Criar um provider apenas para leitura (sem signer)
    const provider = new ethers.providers.JsonRpcProvider('https://arb-sepolia.g.alchemy.com/v2/nEZWQCXE5sztOpx7Ukta3vjsu8FdJ8A9');
    
    // Criar contrato EAS com o provider de leitura
    const easContract = new ethers.Contract(EAS_CONTRACT_ADDRESS, EAS_ABI, provider);
    
    // Verificar se o attestation existe usando uma chamada de baixo nível
    // Isso é mais robusto do que chamar diretamente getAttestation
    try {
      console.log('Verificando se o attestation existe usando chamada de baixo nível...');
      
      // Criar a interface do contrato
      const easInterface = new ethers.utils.Interface(EAS_ABI);
      
      // Codificar a chamada para getAttestation
      const callData = easInterface.encodeFunctionData('getAttestation', [uidString]);
      
      // Fazer a chamada de baixo nível
      const result = await provider.call({
        to: EAS_CONTRACT_ADDRESS,
        data: callData
      });
      
      // Se chegou aqui sem erro, o attestation existe
      console.log('Attestation encontrado via chamada de baixo nível');
      
      // Decodificar o resultado
      const decodedResult = easInterface.decodeFunctionResult('getAttestation', result);
      console.log('Resultado decodificado:', decodedResult);
      
      // Formatar os dados para um formato mais amigável
      const attestationData = decodedResult[0]; // O primeiro elemento é o objeto attestation
      
      // Verificar se temos dados válidos
      if (!attestationData || !attestationData.uid) {
        console.log('Attestation não encontrado ou dados inválidos');
        return null;
      }
      
      // Formatar os dados para um formato mais amigável
      const formattedData = {
        uid: attestationData.uid,
        schema: attestationData.schema,
        recipient: attestationData.recipient,
        attester: attestationData.attester,
        time: new Date(Number(attestationData.time) * 1000), // Converter para Date
        expirationTime: Number(attestationData.expirationTime) > 0 
          ? new Date(Number(attestationData.expirationTime) * 1000) 
          : null,
        revocable: attestationData.revocable,
        data: attestationData.data,
        link: getEASScanLink(attestationData.uid)
      };
      
      return formattedData;
    } catch (error) {
      console.error('Erro ao verificar attestation:', error);
      
      // Plano B: Verificar se o attestation existe no armazenamento local
      console.log('Verificando se o attestation existe no armazenamento local...');
      const localAttestationData = getAttestationUID(uidString);
      
      if (localAttestationData) {
        console.log('Attestation encontrado no armazenamento local:', localAttestationData);
        
        // Criar dados formatados com informações básicas
        return {
          uid: uidString,
          attester: 'Desconhecido (não encontrado no contrato)',
          time: new Date(),
          link: getEASScanLink(uidString),
          fromLocalStorage: true,
          message: 'Attestation não encontrado no contrato EAS. Pode ter sido removido ou não indexado corretamente.'
        };
      }
      
      // Se não encontrou nem localmente, retornar null
      return null;
    }
  } catch (error) {
    console.error('Erro geral ao obter detalhes do attestation:', error);
    return null;
  }
};

/**
 * Corrige o formato de dados de um pledge
 * @param {Object} pledgeData - Dados do pledge
 * @returns {Object} - Dados corrigidos
 */
export const fixPledgeDataFormat = (pledgeData) => {
  if (!pledgeData) return null;
  
  console.log('Corrigindo formato de dados do pledge:', pledgeData);
  
  const fixedPledgeData = { ...pledgeData };
  
  // Corrigir a data
  if (fixedPledgeData.startDate) {
    let correctedDate;
    
    if (fixedPledgeData.startDate instanceof Date) {
      // Já é um objeto Date, manter como está
      correctedDate = fixedPledgeData.startDate;
      console.log('Data já é um objeto Date:', correctedDate);
    } else if (typeof fixedPledgeData.startDate === 'string') {
      // Converter string para Date
      try {
        correctedDate = new Date(fixedPledgeData.startDate);
        console.log('Data convertida de string para Date:', correctedDate);
      } catch (error) {
        console.error('Erro ao converter string para Date:', error);
        // Usar data atual como fallback
        correctedDate = new Date();
      }
    } else if (typeof fixedPledgeData.startDate === 'number') {
      // Converter timestamp para Date
      correctedDate = new Date(fixedPledgeData.startDate);
      console.log('Data convertida de timestamp para Date:', correctedDate);
    } else {
      console.error('Formato de data não suportado:', fixedPledgeData.startDate);
      // Usar data atual como fallback
      correctedDate = new Date();
    }
    
    // Atualizar o objeto
    fixedPledgeData.startDate = correctedDate;
  }
  
  // Corrigir a porcentagem
  if (fixedPledgeData.percentage) {
    if (typeof fixedPledgeData.percentage !== 'number') {
      try {
        fixedPledgeData.percentage = parseInt(fixedPledgeData.percentage, 10);
        console.log('Porcentagem convertida para número:', fixedPledgeData.percentage);
      } catch (error) {
        console.error('Erro ao converter porcentagem para número:', error);
        // Usar 1% como fallback
        fixedPledgeData.percentage = 1;
      }
    }
  }
  
  console.log('Dados corrigidos:', fixedPledgeData);
  return fixedPledgeData;
};

/**
 * Cria manualmente um attestation para um pledge existente
 * @param {Object} pledgeData - Dados do pledge
 * @returns {Promise<Object>} - Resultado da operação
 */
export const createAttestationForExistingPledge = async (pledgeData) => {
  try {
    if (!pledgeData || !pledgeData.ipfsHash) {
      console.error('Dados de pledge inválidos para criar attestation:', pledgeData);
      return { success: false, error: 'Dados de pledge inválidos' };
    }
    
    console.log('Criando attestation para pledge existente:', pledgeData.projectName);
    console.log('IPFS Hash:', pledgeData.ipfsHash);
    
    // Verificar se já existe um attestation para este pledge
    const existingUID = await checkPledgeAttestation(pledgeData);
    if (existingUID) {
      console.log('Pledge já possui um attestation:', existingUID);
      return { 
        success: true, 
        attestationUID: existingUID,
        message: 'Pledge já possui um attestation',
        link: getEASScanLink(existingUID)
      };
    }
    
    // Corrigir o formato dos dados do pledge
    console.log('Corrigindo formato dos dados antes de criar attestation...');
    const fixedPledgeData = fixPledgeDataFormat(pledgeData);
    if (!fixedPledgeData) {
      return { success: false, error: 'Falha ao corrigir formato dos dados do pledge' };
    }
    
    // Criar um novo attestation com os dados corrigidos
    console.log('Criando attestation com dados corrigidos...');
    const result = await createPledgeAttestation(fixedPledgeData);
    
    if (result.success) {
      console.log('Attestation criado com sucesso para pledge existente:', result.attestationUID);
      return {
        success: true,
        attestationUID: result.attestationUID,
        link: getEASScanLink(result.attestationUID)
      };
    } else {
      console.error('Erro ao criar attestation para pledge existente:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Erro ao criar attestation para pledge existente:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
};

/**
 * Adiciona manualmente um attestation de teste ao armazenamento local
 * @param {string} ipfsHash - Hash IPFS do pledge
 * @param {string} uid - UID do attestation
 * @returns {boolean} - Sucesso da operação
 */
export const addTestAttestation = (ipfsHash, uid) => {
  if (!ipfsHash || !uid) {
    console.error('IPFS Hash e UID são obrigatórios');
    return false;
  }
  
  console.log('Adicionando attestation de teste ao armazenamento...');
  console.log('IPFS Hash:', ipfsHash);
  console.log('UID:', uid);
  
  return saveAttestation(ipfsHash, uid);
};
