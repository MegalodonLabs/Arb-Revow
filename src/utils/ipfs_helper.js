/**
 * ipfs_helper.js
 * Funções auxiliares para lidar com dados do IPFS
 * 
 * Este módulo implementa funções para recuperar e processar dados do IPFS,
 * utilizando o sistema de armazenamento centralizado.
 */

import { getFromIPFS } from './ipfs';
import { getIPFSData as getStoredIPFSData, saveIPFSData, extractDescription as getDescriptionFromStorage, extractAdditionalInfo as getAdditionalInfoFromStorage } from './storage';

/**
 * Recupera dados do IPFS para um determinado hash
 * @param {string} ipfsHash - Hash IPFS a ser buscado
 * @returns {Promise<Object|null>} - Dados recuperados ou null se não encontrado
 */
export const getIPFSData = async (ipfsHash) => {
  if (!ipfsHash) {
    console.error('IPFS Hash é obrigatório');
    return null;
  }
  
  console.log('Buscando dados IPFS para:', ipfsHash);
  
  // Verificar no sistema de armazenamento centralizado primeiro
  const storedData = getStoredIPFSData(ipfsHash);
  if (storedData) {
    console.log('Dados encontrados no armazenamento centralizado:', storedData);
    return storedData;
  }
  
  // Se não encontrado, buscar do IPFS
  try {
    const ipfsData = await getFromIPFS(ipfsHash);
    console.log('Dados IPFS brutos:', ipfsData);
    
    if (ipfsData && ipfsData.length > 0) {
      try {
        const textData = await ipfsData[0].text();
        console.log('Texto recuperado do IPFS:', textData);
        
        const jsonData = JSON.parse(textData);
        console.log('Dados JSON recuperados do IPFS:', jsonData);
        
        // Salvar no sistema de armazenamento centralizado
        saveIPFSData(ipfsHash, jsonData);
        console.log('Dados IPFS salvos no armazenamento centralizado');
        
        return jsonData;
      } catch (parseError) {
        console.error('Erro ao fazer parse dos dados IPFS:', parseError);
      }
    } else {
      console.log('Nenhum dado IPFS encontrado');
    }
  } catch (error) {
    console.error('Erro ao buscar dados do IPFS:', error);
  }
  
  return null;
};

/**
 * Extrai a descrição de um objeto de dados IPFS
 * @param {Object} ipfsData - Dados recuperados do IPFS
 * @returns {string} - Descrição encontrada ou string vazia
 */
export const extractDescription = (ipfsData) => {
  // Usar a função do sistema de armazenamento centralizado
  return getDescriptionFromStorage(ipfsData);
};

/**
 * Extrai informações adicionais de um objeto de dados IPFS
 * @param {Object} ipfsData - Dados recuperados do IPFS
 * @returns {string} - Informações adicionais encontradas ou string vazia
 */
export const extractAdditionalInfo = (ipfsData) => {
  // Usar a função do sistema de armazenamento centralizado
  return getAdditionalInfoFromStorage(ipfsData);
};

/**
 * Atualiza um pledge com dados do IPFS
 * @param {Object} pledge - Objeto pledge a ser atualizado
 * @returns {Promise<Object>} - Pledge atualizado com dados do IPFS
 */
export const enrichPledgeWithIPFSData = async (pledge) => {
  if (!pledge || !pledge.ipfsHash) return pledge;
  
  const ipfsData = await getIPFSData(pledge.ipfsHash);
  if (!ipfsData) return pledge;
  
  // Criar uma cópia do pledge para não modificar o original
  const enrichedPledge = { ...pledge };
  
  // Atualizar descrição
  const description = extractDescription(ipfsData);
  if (description) {
    console.log('Descrição encontrada para pledge:', description);
    enrichedPledge.description = description;
  }
  
  // Atualizar informações adicionais
  const additionalInfo = extractAdditionalInfo(ipfsData);
  if (additionalInfo) {
    console.log('Informações adicionais encontradas para pledge:', additionalInfo);
    enrichedPledge.additionalInfo = additionalInfo;
  }
  
  return enrichedPledge;
};

/**
 * Atualiza uma lista de pledges com dados do IPFS
 * @param {Array} pledges - Lista de pledges a ser atualizada
 * @returns {Promise<Array>} - Lista de pledges atualizada com dados do IPFS
 */
export const enrichPledgesWithIPFSData = async (pledges) => {
  if (!pledges || !Array.isArray(pledges)) return [];
  
  const enrichedPledges = [];
  
  for (const pledge of pledges) {
    const enrichedPledge = await enrichPledgeWithIPFSData(pledge);
    enrichedPledges.push(enrichedPledge);
  }
  
  return enrichedPledges;
};
