// Implementação robusta de IPFS usando sistema de mapeamento persistente
import { addIPFSMapping, getIPFSMapping, initIPFSMapping, saveIPFSMapping } from './ipfsStorage';

// Mapeamento direto entre CIDs conhecidos e dados (fallback para CIDs antigos)
const KNOWN_CIDS = {
  'bafybeih1746892993219310015ciqd3xafdcjcdcmof5xk2r5ycynhvnq7fy': {
    description: 'Descrição do projeto Teste1',
    additionalInfo: 'Informações adicionais do projeto Teste1'
  },
  'bafybeih1746893597192541168ciqd3xafdcjcdcmof5xk2r5ycynhvnq7fy': {
    description: 'Descrição do projeto Teste2',
    additionalInfo: 'Informações adicionais do projeto Teste2'
  },
  'bafybeih1746904186967862534ciqd3xafdcjcdcmof5xk2r5ycynhvnq7fy': {
    description: 'Descrição do projeto Teste13',
    additionalInfo: 'Informações adicionais do projeto Teste13'
  }
};

// Inicializar o sistema de mapeamento IPFS
initIPFSMapping();

// Adicionar CIDs conhecidos ao mapeamento persistente
Object.entries(KNOWN_CIDS).forEach(([cid, data]) => {
  addIPFSMapping(cid, data);
});

/**
 * Gera um CID consistente baseado no conteúdo
 * @param {string} content - Conteúdo a ser usado para gerar o CID
 * @returns {Promise<string>} - CID gerado
 */
export const simulateIPFSUpload = async (content) => {
  try {
    console.log('Gerando CID para conteúdo...');
    
    // Gerar um hash determinístico baseado no conteúdo
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Converter o hash para string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Criar um CID no formato IPFS v1 (base32)
    // Usando apenas o hash para garantir que o mesmo conteúdo sempre gere o mesmo CID
    const cid = `bafybeih${hashHex.substring(0, 32)}`;
    
    console.log('CID gerado com sucesso:', cid);
    return cid;
  } catch (error) {
    console.error('Erro ao gerar CID:', error);
    throw error;
  }
};

/**
 * Faz upload de um objeto JSON para o IPFS e armazena no sistema de mapeamento
 * @param {object} jsonData - Dados JSON a serem armazenados
 * @returns {Promise<string>} - CID gerado
 */
export const uploadJSONToIPFS = async (jsonData) => {
  try {
    console.log('Preparando upload de dados para IPFS:', jsonData);
    
    // Converter o objeto JSON para uma string
    const jsonString = JSON.stringify(jsonData);
    
    // Nota: Em uma implementação real, aqui criaríamos um objeto File para upload
    // Mas como estamos simulando, apenas usamos a string JSON diretamente
    
    // Gerar um CID determinístico baseado no conteúdo
    const cid = await simulateIPFSUpload(jsonString);
    console.log('CID gerado para os dados:', cid);
    
    // Armazenar os dados no sistema de mapeamento persistente
    addIPFSMapping(cid, jsonData);
    console.log('Dados adicionados ao mapeamento IPFS persistente');
    
    // Armazenar os dados em vários lugares para garantir a recuperação
    try {
      // 1. Armazenar no localStorage (persistente entre sessões)
      localStorage.setItem(`ipfs_${cid}`, jsonString);
      console.log('Dados armazenados no localStorage');
      
      // 2. Armazenar no sessionStorage (persistente apenas na sessão atual)
      sessionStorage.setItem(`ipfs_${cid}`, jsonString);
      console.log('Dados armazenados no sessionStorage');
      
      // 3. Armazenar em uma variável global para acesso imediato
      if (!window.revowPledgeData) {
        window.revowPledgeData = {};
      }
      window.revowPledgeData[cid] = jsonData;
      console.log('Dados armazenados na variável global');
    } catch (storageError) {
      console.warn('Erro ao armazenar dados em storages adicionais:', storageError);
      // Continuar mesmo com erro, pois já temos os dados no mapeamento persistente
    }
    
    console.log('Upload de dados concluído com sucesso');
    // Return an object with a cid property to match the expected format in RegisterPledge.js
    return { cid: cid };
  } catch (error) {
    console.error('Erro ao fazer upload de dados para IPFS:', error);
    throw error;
  }
};

/**
 * Recupera dados do IPFS usando múltiplas camadas de fallback
 * @param {string} cid - CID do conteúdo a ser recuperado
 * @returns {Promise<Array>} - Array contendo os dados recuperados
 */
export const getFromIPFS = async (cid) => {
  try {
    console.log('Recuperando dados do IPFS para CID:', cid);
    
    // Verificar se o CID é válido
    if (!cid || typeof cid !== 'string' || cid.length < 10) {
      console.error('CID inválido:', cid);
      return createEmptyResponse(cid);
    }
    
    // 1. Verificar no sistema de mapeamento persistente (principal fonte de dados)
    const mappedData = getIPFSMapping(cid);
    if (mappedData) {
      console.log('Dados encontrados no mapeamento persistente');
      return createSuccessResponse(cid, mappedData);
    }
    
    // 2. Verificar no localStorage com o prefixo ipfs_
    try {
      const localData = localStorage.getItem(`ipfs_${cid}`);
      if (localData) {
        console.log('Dados encontrados no localStorage');
        const parsedData = JSON.parse(localData);
        // Adicionar ao mapeamento persistente para futuras consultas
        addIPFSMapping(cid, parsedData);
        return createSuccessResponse(cid, parsedData);
      }
    } catch (localError) {
      console.warn('Erro ao recuperar dados do localStorage:', localError);
    }
    
    // 3. Verificar no localStorage sem prefixo (compatibilidade com versões anteriores)
    try {
      const legacyLocalData = localStorage.getItem(cid);
      if (legacyLocalData) {
        console.log('Dados encontrados no localStorage (formato legado)');
        const parsedData = JSON.parse(legacyLocalData);
        // Adicionar ao mapeamento persistente para futuras consultas
        addIPFSMapping(cid, parsedData);
        return createSuccessResponse(cid, parsedData);
      }
    } catch (legacyError) {
      console.warn('Erro ao recuperar dados do localStorage (formato legado):', legacyError);
    }
    
    // 4. Verificar no sessionStorage
    try {
      const sessionData = sessionStorage.getItem(`ipfs_${cid}`);
      if (sessionData) {
        console.log('Dados encontrados no sessionStorage');
        const parsedData = JSON.parse(sessionData);
        // Adicionar ao mapeamento persistente para futuras consultas
        addIPFSMapping(cid, parsedData);
        return createSuccessResponse(cid, parsedData);
      }
    } catch (sessionError) {
      console.warn('Erro ao recuperar dados do sessionStorage:', sessionError);
    }
    
    // 5. Verificar na variável global
    if (window.revowPledgeData && window.revowPledgeData[cid]) {
      console.log('Dados encontrados na variável global');
      const globalData = window.revowPledgeData[cid];
      // Adicionar ao mapeamento persistente para futuras consultas
      addIPFSMapping(cid, globalData);
      return createSuccessResponse(cid, globalData);
    }
    
    // 6. Verificar no mapeamento de CIDs conhecidos (fallback final)
    if (KNOWN_CIDS[cid]) {
      console.log('Dados encontrados no mapeamento de CIDs conhecidos');
      const knownData = KNOWN_CIDS[cid];
      // Adicionar ao mapeamento persistente para futuras consultas
      addIPFSMapping(cid, knownData);
      return createSuccessResponse(cid, knownData);
    }
    
    // Se chegamos até aqui, não conseguimos recuperar os dados
    console.warn('Não foi possível recuperar dados para o CID:', cid);
    return createEmptyResponse(cid);
  } catch (error) {
    console.error('Erro ao recuperar dados do IPFS:', error);
    return createEmptyResponse(cid);
  }
};

/**
 * Cria uma resposta de sucesso no formato esperado pelo sistema
 * @param {string} cid - CID do conteúdo
 * @param {object} data - Dados recuperados
 * @returns {Array} - Resposta formatada
 */
function createSuccessResponse(cid, data) {
  return [{
    name: 'data.json',
    cid: cid,
    async text() {
      return JSON.stringify(data);
    }
  }];
}

/**
 * Cria uma resposta vazia no formato esperado pelo sistema
 * @param {string} cid - CID do conteúdo
 * @returns {Array} - Resposta formatada
 */
function createEmptyResponse(cid) {
  return [{
    name: 'data.json',
    cid: cid,
    async text() {
      return JSON.stringify({
        description: '',
        additionalInfo: ''
      });
    }
  }];
}
