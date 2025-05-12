/**
 * pledge_helper.js
 * Sistema centralizado para gerenciamento de pledges
 * 
 * Este módulo implementa funções auxiliares para trabalhar com pledges,
 * integrando o sistema de armazenamento centralizado e o EAS.
 */

import { getUserPledges as getContractPledges } from './web3';
import { checkPledgeAttestation, getEASScanLink } from './eas_new';
import { getIPFSData, extractDescription, extractAdditionalInfo } from './storage';

/**
 * Enriquece um pledge com dados do IPFS e attestations
 * @param {Object} pledge - Objeto pledge a ser enriquecido
 * @returns {Promise<Object>} - Pledge enriquecido
 */
export const enrichPledge = async (pledge) => {
  if (!pledge || !pledge.ipfsHash) return pledge;
  
  console.log('Enriquecendo pledge:', pledge.projectName);
  console.log('IPFS Hash:', pledge.ipfsHash);
  
  // Criar uma cópia do pledge para não modificar o original
  const enrichedPledge = { ...pledge };
  
  // 1. Adicionar dados do IPFS
  try {
    const ipfsData = await getIPFSData(pledge.ipfsHash);
    
    if (ipfsData) {
      console.log('Dados IPFS encontrados:', ipfsData);
      
      // Adicionar descrição
      const description = extractDescription(ipfsData);
      if (description) {
        console.log('Descrição encontrada:', description);
        enrichedPledge.description = description;
      }
      
      // Adicionar informações adicionais
      const additionalInfo = extractAdditionalInfo(ipfsData);
      if (additionalInfo) {
        console.log('Informações adicionais encontradas:', additionalInfo);
        enrichedPledge.additionalInfo = additionalInfo;
      }
    } else {
      console.log('Nenhum dado IPFS encontrado para este pledge');
    }
  } catch (error) {
    console.error('Erro ao obter dados IPFS:', error);
  }
  
  // 2. Adicionar informações de attestation
  try {
    const attestationUID = await checkPledgeAttestation(pledge);
    
    if (attestationUID) {
      console.log('Attestation encontrado:', attestationUID);
      enrichedPledge.attestationUID = attestationUID;
      enrichedPledge.attestationLink = getEASScanLink(attestationUID);
    } else {
      console.log('Nenhum attestation encontrado para este pledge');
      enrichedPledge.attestationUID = null;
      enrichedPledge.attestationLink = null;
    }
  } catch (error) {
    console.error('Erro ao verificar attestation:', error);
    enrichedPledge.attestationUID = null;
    enrichedPledge.attestationLink = null;
  }
  
  return enrichedPledge;
};

/**
 * Enriquece uma lista de pledges com dados do IPFS e attestations
 * @param {Array} pledges - Lista de pledges a ser enriquecida
 * @returns {Promise<Array>} - Lista de pledges enriquecida
 */
export const enrichPledges = async (pledges) => {
  if (!pledges || !Array.isArray(pledges)) return [];
  
  console.log('Enriquecendo lista de pledges...');
  
  const enrichedPledges = [];
  
  for (const pledge of pledges) {
    const enrichedPledge = await enrichPledge(pledge);
    enrichedPledges.push(enrichedPledge);
  }
  
  console.log('Lista de pledges enriquecida:', enrichedPledges);
  return enrichedPledges;
};

/**
 * Obtém todos os pledges de um usuário, enriquecidos com dados do IPFS e attestations
 * @param {string} userAddress - Endereço do usuário
 * @returns {Promise<Array>} - Lista de pledges enriquecida
 */
export const getUserPledges = async (userAddress) => {
  if (!userAddress) return [];
  
  console.log('Obtendo pledges do usuário:', userAddress);
  
  try {
    // Obter pledges do contrato
    const contractPledges = await getContractPledges(userAddress);
    console.log('Pledges obtidos do contrato:', contractPledges);
    
    // Enriquecer com dados do IPFS e attestations
    const enrichedPledges = await enrichPledges(contractPledges);
    
    return enrichedPledges;
  } catch (error) {
    console.error('Erro ao obter pledges do usuário:', error);
    return [];
  }
};
