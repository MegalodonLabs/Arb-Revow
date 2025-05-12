/**
 * storage.js
 * Sistema centralizado de gerenciamento de armazenamento para o Revow
 * 
 * Este módulo implementa um sistema de armazenamento estruturado e confiável
 * para todos os dados da aplicação, incluindo pledges, attestations e dados IPFS.
 */

// Chaves de armazenamento
const STORAGE_KEYS = {
  // Pledges
  PLEDGES: 'revow_pledges',
  USER_PLEDGES: 'revow_user_pledges',
  
  // Attestations
  ATTESTATIONS: 'revow_attestations',
  PLEDGE_ATTESTATIONS: 'revow_pledge_attestations',
  
  // IPFS
  IPFS_DATA: 'revow_ipfs_data',
  
  // Configurações
  SETTINGS: 'revow_settings',
  
  // Cache
  CACHE: 'revow_cache'
};

// Cache em memória para acesso rápido
const memoryCache = {
  pledges: {},
  attestations: {},
  ipfsData: {}
};

/**
 * Inicializa o sistema de armazenamento
 * Migra dados antigos para o novo formato
 */
export const initStorage = () => {
  console.log('Inicializando sistema de armazenamento...');
  
  try {
    // Criar estruturas de armazenamento se não existirem
    if (!localStorage.getItem(STORAGE_KEYS.PLEDGES)) {
      localStorage.setItem(STORAGE_KEYS.PLEDGES, JSON.stringify({}));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.USER_PLEDGES)) {
      localStorage.setItem(STORAGE_KEYS.USER_PLEDGES, JSON.stringify({}));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.ATTESTATIONS)) {
      localStorage.setItem(STORAGE_KEYS.ATTESTATIONS, JSON.stringify({}));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS)) {
      localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify({}));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.IPFS_DATA)) {
      localStorage.setItem(STORAGE_KEYS.IPFS_DATA, JSON.stringify({}));
    }
    
    // Migrar dados antigos
    migrateOldData();
    
    // Carregar dados do localStorage para o cache em memória
    loadCacheFromLocalStorage();
    
    console.log('Sistema de armazenamento inicializado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar sistema de armazenamento:', error);
    return false;
  }
};

/**
 * Carrega os dados do localStorage para o cache em memória
 * Isso garante que os dados persistam entre recargas da página
 */
const loadCacheFromLocalStorage = () => {
  try {
    console.log('Carregando dados do localStorage para o cache em memória...');
    
    // Carregar attestations
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || '{}');
    memoryCache.attestations = { ...attestations };
    console.log('Attestations carregados para o cache:', Object.keys(memoryCache.attestations).length);
    
    // Carregar dados IPFS
    const ipfsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.IPFS_DATA) || '{}');
    memoryCache.ipfsData = { ...ipfsData };
    console.log('Dados IPFS carregados para o cache:', Object.keys(memoryCache.ipfsData).length);
    
    // Carregar pledges
    const pledges = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGES) || '{}');
    memoryCache.pledges = { ...pledges };
    console.log('Pledges carregados para o cache:', Object.keys(memoryCache.pledges).length);
    
    console.log('Cache em memória carregado com sucesso!');
  } catch (error) {
    console.error('Erro ao carregar cache do localStorage:', error);
  }
};

/**
 * Migra dados de formatos antigos para o novo formato
 */
const migrateOldData = () => {
  console.log('Migrando dados antigos...');
  
  try {
    // Migrar attestations antigos
    const oldKeys = [
      'easAttestations',
      'attestations',
      'pledgeEasMap',
      'pledgeAttestations',
      'allAttestations'
    ];
    
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || '{}');
    let migrationCount = 0;
    
    // Verificar cada chave antiga
    for (const key of oldKeys) {
      const oldData = localStorage.getItem(key);
      if (oldData) {
        try {
          const parsedData = JSON.parse(oldData);
          
          // Se for um objeto, assumir que é um mapeamento ipfsHash -> uid
          if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
            for (const [ipfsHash, uid] of Object.entries(parsedData)) {
              if (ipfsHash && uid && !attestations[ipfsHash]) {
                attestations[ipfsHash] = uid;
                migrationCount++;
              }
            }
          }
          
          // Se for um array, assumir que é uma lista de attestations
          if (Array.isArray(parsedData)) {
            for (const item of parsedData) {
              if (item && item.ipfsHash && item.uid && !attestations[item.ipfsHash]) {
                attestations[item.ipfsHash] = item.uid;
                migrationCount++;
              }
            }
          }
        } catch (parseError) {
          console.warn(`Erro ao analisar dados antigos da chave ${key}:`, parseError);
        }
      }
    }
    
    // Salvar attestations migrados
    if (migrationCount > 0) {
      localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
      console.log(`${migrationCount} attestations migrados com sucesso!`);
    } else {
      console.log('Nenhum attestation antigo encontrado para migração.');
    }
    
    // Migrar dados IPFS antigos
    const ipfsMapping = JSON.parse(localStorage.getItem('ipfsMapping') || '{}');
    const ipfsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.IPFS_DATA) || '{}');
    
    let ipfsMigrationCount = 0;
    
    for (const [ipfsHash, data] of Object.entries(ipfsMapping)) {
      if (ipfsHash && data && !ipfsData[ipfsHash]) {
        ipfsData[ipfsHash] = data;
        ipfsMigrationCount++;
      }
    }
    
    // Salvar dados IPFS migrados
    if (ipfsMigrationCount > 0) {
      localStorage.setItem(STORAGE_KEYS.IPFS_DATA, JSON.stringify(ipfsData));
      console.log(`${ipfsMigrationCount} dados IPFS migrados com sucesso!`);
    } else {
      console.log('Nenhum dado IPFS antigo encontrado para migração.');
    }
    
    console.log('Migração de dados concluída!');
  } catch (error) {
    console.error('Erro durante a migração de dados:', error);
  }
};

// ===== FUNÇÕES DE GERENCIAMENTO DE PLEDGES =====

/**
 * Salva um pledge no armazenamento local
 * @param {Object} pledge - Objeto pledge a ser salvo
 * @param {string} userAddress - Endereço do usuário (opcional)
 * @returns {boolean} - Sucesso da operação
 */
export const savePledge = (pledge, userAddress = null) => {
  if (!pledge || !pledge.ipfsHash) {
    console.error('Dados de pledge inválidos:', pledge);
    return false;
  }
  
  try {
    // Salvar no armazenamento de todos os pledges
    const pledges = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGES) || '{}');
    pledges[pledge.ipfsHash] = pledge;
    localStorage.setItem(STORAGE_KEYS.PLEDGES, JSON.stringify(pledges));
    
    // Se tiver endereço do usuário, salvar nos pledges do usuário
    if (userAddress) {
      const userPledges = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PLEDGES) || '{}');
      if (!userPledges[userAddress]) {
        userPledges[userAddress] = [];
      }
      
      // Verificar se o pledge já existe na lista do usuário
      const existingIndex = userPledges[userAddress].findIndex(p => p.ipfsHash === pledge.ipfsHash);
      if (existingIndex >= 0) {
        userPledges[userAddress][existingIndex] = pledge;
      } else {
        userPledges[userAddress].push(pledge);
      }
      
      localStorage.setItem(STORAGE_KEYS.USER_PLEDGES, JSON.stringify(userPledges));
    }
    
    // Atualizar cache em memória
    memoryCache.pledges[pledge.ipfsHash] = pledge;
    
    console.log('Pledge salvo com sucesso:', pledge.ipfsHash);
    return true;
  } catch (error) {
    console.error('Erro ao salvar pledge:', error);
    return false;
  }
};

/**
 * Obtém um pledge pelo ipfsHash
 * @param {string} ipfsHash - Hash IPFS do pledge
 * @returns {Object|null} - Objeto pledge ou null se não encontrado
 */
export const getPledge = (ipfsHash) => {
  if (!ipfsHash) return null;
  
  // Verificar cache em memória primeiro
  if (memoryCache.pledges[ipfsHash]) {
    return memoryCache.pledges[ipfsHash];
  }
  
  try {
    const pledges = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGES) || '{}');
    const pledge = pledges[ipfsHash];
    
    if (pledge) {
      // Atualizar cache em memória
      memoryCache.pledges[ipfsHash] = pledge;
    }
    
    return pledge || null;
  } catch (error) {
    console.error('Erro ao obter pledge:', error);
    return null;
  }
};

/**
 * Obtém todos os pledges de um usuário
 * @param {string} userAddress - Endereço do usuário
 * @returns {Array} - Lista de pledges do usuário
 */
export const getUserPledges = (userAddress) => {
  if (!userAddress) return [];
  
  try {
    const userPledges = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PLEDGES) || '{}');
    return userPledges[userAddress] || [];
  } catch (error) {
    console.error('Erro ao obter pledges do usuário:', error);
    return [];
  }
};

// ===== FUNÇÕES DE GERENCIAMENTO DE ATTESTATIONS =====

/**
 * Salva um attestation para um pledge
 * @param {string} ipfsHash - Hash IPFS do pledge
 * @param {string|object} uid - UID do attestation
 * @param {Object} pledgeData - Dados do pledge (opcional)
 * @returns {boolean} - Sucesso da operação
 */
export const saveAttestation = (ipfsHash, uid, pledgeData = null) => {
  if (!ipfsHash || !uid) {
    console.error('IPFS Hash e UID são obrigatórios');
    return false;
  }
  
  try {
    // Garantir que o UID seja uma string
    const uidString = String(uid).replace(/^0x/, '0x');
    console.log('Convertendo UID para string:', uidString);
    
    // Salvar no mapeamento de attestations
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || '{}');
    attestations[ipfsHash] = uidString;
    localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
    
    // Salvar dados completos do attestation
    const allAttestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTESTATIONS) || '{}');
    allAttestations[uidString] = {
      uid: uidString,
      ipfsHash,
      pledgeData,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ATTESTATIONS, JSON.stringify(allAttestations));
    
    // Atualizar cache em memória
    memoryCache.attestations[ipfsHash] = uidString;
    
    console.log('Attestation salvo com sucesso:', uidString);
    return true;
  } catch (error) {
    console.error('Erro ao salvar attestation:', error);
    return false;
  }
};

/**
 * Obtém o UID do attestation para um pledge
 * @param {string} ipfsHash - Hash IPFS do pledge
 * @returns {string|null} - UID do attestation ou null se não encontrado
 */
export const getAttestationUID = (ipfsHash) => {
  if (!ipfsHash) return null;
  
  // Verificar cache em memória primeiro
  if (memoryCache.attestations[ipfsHash]) {
    return memoryCache.attestations[ipfsHash];
  }
  
  try {
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || '{}');
    const uid = attestations[ipfsHash];
    
    if (uid) {
      // Atualizar cache em memória
      memoryCache.attestations[ipfsHash] = uid;
    }
    
    return uid || null;
  } catch (error) {
    console.error('Erro ao obter attestation:', error);
    return null;
  }
};

/**
 * Obtém todos os dados de um attestation pelo UID
 * @param {string} uid - UID do attestation
 * @returns {Object|null} - Dados do attestation ou null se não encontrado
 */
export const getAttestationData = (uid) => {
  if (!uid) return null;
  
  try {
    const allAttestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTESTATIONS) || '{}');
    return allAttestations[uid] || null;
  } catch (error) {
    console.error('Erro ao obter dados do attestation:', error);
    return null;
  }
};

/**
 * Gets all attestations from storage
 * @returns {Array} - Array of attestation objects with their UIDs
 */
export const getAllAttestations = () => {
  try {
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTESTATIONS) || '{}');
    const result = [];
    
    // Convert object to array with UIDs included
    for (const [uid, data] of Object.entries(attestations)) {
      result.push({
        uid,
        ...data
      });
    }
    
    // Sort by creation date (newest first)
    result.sort((a, b) => {
      const dateA = a.createdAt || 0;
      const dateB = b.createdAt || 0;
      return dateB - dateA;
    });
    
    return result;
  } catch (error) {
    console.error('Error getting all attestations:', error);
    return [];
  }
};

// ===== FUNÇÕES DE GERENCIAMENTO DE DADOS IPFS =====

/**
 * Salva dados IPFS no armazenamento local
 * @param {string} ipfsHash - Hash IPFS
 * @param {Object} data - Dados a serem salvos
 * @returns {boolean} - Sucesso da operação
 */
export const saveIPFSData = (ipfsHash, data) => {
  if (!ipfsHash || !data) {
    console.error('IPFS Hash e dados são obrigatórios');
    return false;
  }
  
  try {
    const ipfsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.IPFS_DATA) || '{}');
    ipfsData[ipfsHash] = data;
    localStorage.setItem(STORAGE_KEYS.IPFS_DATA, JSON.stringify(ipfsData));
    
    // Atualizar cache em memória
    memoryCache.ipfsData[ipfsHash] = data;
    
    console.log('Dados IPFS salvos com sucesso:', ipfsHash);
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados IPFS:', error);
    return false;
  }
};

/**
 * Obtém dados IPFS do armazenamento local
 * @param {string} ipfsHash - Hash IPFS
 * @returns {Object|null} - Dados IPFS ou null se não encontrados
 */
export const getIPFSData = (ipfsHash) => {
  if (!ipfsHash) return null;
  
  // Verificar cache em memória primeiro
  if (memoryCache.ipfsData[ipfsHash]) {
    return memoryCache.ipfsData[ipfsHash];
  }
  
  try {
    const ipfsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.IPFS_DATA) || '{}');
    const data = ipfsData[ipfsHash];
    
    if (data) {
      // Atualizar cache em memória
      memoryCache.ipfsData[ipfsHash] = data;
    }
    
    return data || null;
  } catch (error) {
    console.error('Erro ao obter dados IPFS:', error);
    return null;
  }
};

// ===== FUNÇÕES DE UTILIDADE =====

/**
 * Extrai a descrição de um objeto de dados IPFS
 * @param {Object} ipfsData - Dados IPFS
 * @returns {string} - Descrição encontrada ou string vazia
 */
export const extractDescription = (ipfsData) => {
  if (!ipfsData) return '';
  
  // Verificar várias possibilidades de campo de descrição
  if (ipfsData.description) return ipfsData.description;
  if (ipfsData.desc) return ipfsData.desc;
  if (ipfsData.descricao) return ipfsData.descricao;
  if (ipfsData.text) return ipfsData.text;
  
  return '';
};

/**
 * Extrai informações adicionais de um objeto de dados IPFS
 * @param {Object} ipfsData - Dados IPFS
 * @returns {string} - Informações adicionais encontradas ou string vazia
 */
export const extractAdditionalInfo = (ipfsData) => {
  if (!ipfsData) return '';
  
  // Verificar várias possibilidades de campo de informações adicionais
  if (ipfsData.additionalInfo) return ipfsData.additionalInfo;
  if (ipfsData.info) return ipfsData.info;
  if (ipfsData.informacoes) return ipfsData.informacoes;
  if (ipfsData.details) return ipfsData.details;
  
  return '';
};

/**
 * Limpa o cache em memória
 */
export const clearMemoryCache = () => {
  memoryCache.pledges = {};
  memoryCache.attestations = {};
  memoryCache.ipfsData = {};
  console.log('Cache em memória limpo com sucesso!');
};

/**
 * Limpa todos os dados do armazenamento local
 * CUIDADO: Esta função apaga todos os dados!
 */
export const clearAllData = () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
  
  clearMemoryCache();
  console.log('Todos os dados foram apagados!');
};

/**
 * Depura o armazenamento local
 * @returns {Object} - Objeto com todos os dados do armazenamento
 */
export const debugStorage = () => {
  console.log('=== DEPURAÇÃO DO ARMAZENAMENTO ===');
  
  const debug = {};
  
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        debug[name] = JSON.parse(value);
        console.log(`${name} (${key}):`, debug[name]);
      } else {
        console.log(`${name} (${key}): Não encontrado ou vazio`);
      }
    } catch (error) {
      console.error(`Erro ao depurar ${name} (${key}):`, error);
    }
  }
  
  console.log('=== FIM DA DEPURAÇÃO ===');
  return debug;
};

// Inicializar o sistema de armazenamento automaticamente
initStorage();

// Exportar constantes
export { STORAGE_KEYS };
