/**
 * Sistema de armazenamento e recuperação de dados IPFS
 * 
 * Este módulo implementa um sistema robusto para gerenciar dados IPFS,
 * com múltiplas camadas de fallback para garantir que os dados sejam
 * sempre recuperáveis, mesmo quando o IPFS não está disponível.
 */

// Chave para o mapeamento global de CIDs no localStorage
const IPFS_MAPPING_KEY = 'revow_ipfs_mapping';

/**
 * Inicializa o sistema de mapeamento IPFS
 * Carrega o mapeamento existente do localStorage ou cria um novo
 */
export const initIPFSMapping = () => {
  if (!window.revowIPFSMapping) {
    try {
      const savedMapping = localStorage.getItem(IPFS_MAPPING_KEY);
      window.revowIPFSMapping = savedMapping ? JSON.parse(savedMapping) : {};
      console.log('Sistema de mapeamento IPFS inicializado:', Object.keys(window.revowIPFSMapping).length, 'entradas encontradas');
    } catch (error) {
      console.error('Erro ao inicializar mapeamento IPFS:', error);
      window.revowIPFSMapping = {};
    }
  }
  return window.revowIPFSMapping;
};

/**
 * Salva o mapeamento IPFS no localStorage
 */
export const saveIPFSMapping = () => {
  try {
    if (window.revowIPFSMapping) {
      localStorage.setItem(IPFS_MAPPING_KEY, JSON.stringify(window.revowIPFSMapping));
      console.log('Mapeamento IPFS salvo com', Object.keys(window.revowIPFSMapping).length, 'entradas');
    }
  } catch (error) {
    console.error('Erro ao salvar mapeamento IPFS:', error);
  }
};

/**
 * Adiciona um novo mapeamento CID -> dados
 * @param {string} cid - O CID do conteúdo IPFS
 * @param {object} data - Os dados a serem associados ao CID
 */
export const addIPFSMapping = (cid, data) => {
  if (!cid || !data) {
    console.warn('Tentativa de adicionar mapeamento IPFS inválido:', { cid, data });
    return;
  }
  
  // Inicializar o mapeamento se necessário
  initIPFSMapping();
  
  // Adicionar o mapeamento
  window.revowIPFSMapping[cid] = {
    data: data,
    timestamp: Date.now(),
    source: 'direct_mapping'
  };
  
  // Salvar o mapeamento atualizado
  saveIPFSMapping();
  console.log('Mapeamento IPFS adicionado para CID:', cid);
};

/**
 * Recupera dados do mapeamento IPFS
 * @param {string} cid - O CID do conteúdo IPFS
 * @returns {object|null} - Os dados associados ao CID ou null se não encontrado
 */
export const getIPFSMapping = (cid) => {
  if (!cid) {
    console.warn('Tentativa de recuperar mapeamento IPFS com CID inválido');
    return null;
  }
  
  // Inicializar o mapeamento se necessário
  initIPFSMapping();
  
  // Verificar se o CID existe no mapeamento
  if (window.revowIPFSMapping[cid]) {
    console.log('Dados encontrados no mapeamento IPFS para CID:', cid);
    return window.revowIPFSMapping[cid].data;
  }
  
  console.log('Nenhum dado encontrado no mapeamento IPFS para CID:', cid);
  return null;
};

/**
 * Limpa o mapeamento IPFS (útil para testes)
 */
export const clearIPFSMapping = () => {
  window.revowIPFSMapping = {};
  localStorage.removeItem(IPFS_MAPPING_KEY);
  console.log('Mapeamento IPFS limpo');
};

// Inicializar o mapeamento IPFS quando o módulo é carregado
initIPFSMapping();
