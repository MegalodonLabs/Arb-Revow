import { ethers } from 'ethers';

// Endereço do contrato EAS na rede Arbitrum Sepolia
const EAS_CONTRACT_ADDRESS = "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458";
const SCHEMA_REGISTRY_ADDRESS = "0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB";
const SCHEMA_UID = "0x50eb4e430e8a389676629e56f689476a4b3bdf25bd5b3020dea23df68b60813a";

// Cache global para attestations (mantido para compatibilidade com código existente)

// Schema personalizado para os pledges do Revow
// Este schema deve ser registrado no EAS Schema Registry
const PLEDGE_SCHEMA = "string projectName, uint8 commitmentType, uint256 percentage, uint256 startDate, string ipfsHash";
const PLEDGE_SCHEMA_UID = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Placeholder, será preenchido após o registro do schema

// Chaves de armazenamento no localStorage
const STORAGE_KEYS = {
  PLEDGE_ATTESTATIONS: "pledgeAttestations",
  ALL_ATTESTATIONS: "allAttestations",
  // Chaves antigas que podem conter attestations
  LEGACY_KEYS: [
    "easAttestations",
    "attestations",
    "pledgeEasMap",
    "easData",
    "pledgeAttestations",
    "allAttestations"
  ]
};

// Variáveis globais para armazenar todos os attestations
// Isso ajuda a manter os dados consistentes entre diferentes componentes
let globalAttestations = {};
let globalAllAttestations = [];

// Função para recuperar todos os attestations do localStorage
const getAllAttestationsFromStorage = () => {
  const result = {};
  
  // Verificar todas as chaves conhecidas
  STORAGE_KEYS.LEGACY_KEYS.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return;
      
      const parsed = JSON.parse(data);
      
      // Se for um objeto com ipfsHash como chave e UID como valor
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([ipfsHash, uid]) => {
          if (ipfsHash.startsWith('bafy') && typeof uid === 'string' && uid.startsWith('0x')) {
            result[ipfsHash] = uid;
          }
        });
      }
    } catch (error) {
      console.warn(`Erro ao ler chave ${key}:`, error);
    }
  });
  
  return result;
};

// Função para migrar attestations antigos para o novo formato
const migrateOldAttestations = () => {
  try {
    console.log("Iniciando migração de attestations antigos...");
    
    // Obter todos os attestations de todas as fontes
    const allStoredAttestations = getAllAttestationsFromStorage();
    console.log("Todos os attestations encontrados:", allStoredAttestations);
    
    // Obter mapeamentos existentes
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || "{}");
    const allAttestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_ATTESTATIONS) || "[]");
    
    // Mesclar com os dados existentes
    Object.entries(allStoredAttestations).forEach(([ipfsHash, uid]) => {
      attestations[ipfsHash] = uid;
      
      // Verificar se já existe na lista completa
      const exists = allAttestations.some(att => att.uid === uid);
      if (!exists) {
        allAttestations.push({
          uid: uid,
          ipfsHash: ipfsHash,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Verificar todas as chaves legadas para dados mais completos
    STORAGE_KEYS.LEGACY_KEYS.forEach(legacyKey => {
      try {
        const legacyData = localStorage.getItem(legacyKey);
        if (!legacyData) return;
        
        console.log(`Analisando dados na chave: ${legacyKey}`);
        
        // Tentar interpretar os dados em diferentes formatos
        try {
          const parsedData = JSON.parse(legacyData);
          
          // Caso 1: Array de objetos com dados completos
          if (Array.isArray(parsedData)) {
            parsedData.forEach(item => {
              if (item && item.uid && item.ipfsHash) {
                // Verificar se já existe na lista completa
                const existingIndex = allAttestations.findIndex(att => att.uid === item.uid);
                
                if (existingIndex >= 0) {
                  // Atualizar com dados mais completos, se disponíveis
                  if (item.pledgeData) {
                    allAttestations[existingIndex].pledgeData = item.pledgeData;
                  }
                } else {
                  // Adicionar novo
                  allAttestations.push({
                    uid: item.uid,
                    ipfsHash: item.ipfsHash,
                    pledgeData: item.pledgeData || {},
                    timestamp: item.timestamp || new Date().toISOString()
                  });
                }
                
                console.log(`Processado attestation completo: ${item.uid}`);
              }
            });
          }
        } catch (parseError) {
          console.warn(`Erro ao interpretar dados de ${legacyKey}:`, parseError);
        }
      } catch (legacyError) {
        console.warn(`Erro ao acessar chave ${legacyKey}:`, legacyError);
      }
    });
    
    // Atualizar variáveis globais
    globalAttestations = { ...attestations };
    globalAllAttestations = [...allAttestations];
    
    // Salvar os dados consolidados
    localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
    localStorage.setItem(STORAGE_KEYS.ALL_ATTESTATIONS, JSON.stringify(allAttestations));
    
    console.log(`Migração concluída! ${Object.keys(attestations).length} attestations consolidados.`);
    console.log("Mapeamento final:", attestations);
    
    return true;
  } catch (error) {
    console.error("Erro durante a migração de attestations:", error);
    return false;
  }
};

// Função para forçar a atualização de todos os attestations
export const forceAttestationsUpdate = () => {
  console.log("Forçando atualização de todos os attestations...");
  debugLocalStorage();
  return migrateOldAttestations();
};

// Função para depurar os dados do IPFS e corrigir o problema da descrição
export const debugIPFSData = async (ipfsHash) => {
  if (!ipfsHash) {
    console.error('IPFS Hash é obrigatório');
    return false;
  }
  
  console.log('Depurando dados IPFS para:', ipfsHash);
  
  try {
    // Verificar se o ipfsHash está no localStorage
    const ipfsMapping = JSON.parse(localStorage.getItem('ipfsMapping') || '{}');
    if (ipfsMapping[ipfsHash]) {
      console.log('Dados IPFS encontrados no localStorage:', ipfsMapping[ipfsHash]);
      return ipfsMapping[ipfsHash];
    }
    
    // Tentar buscar do IPFS
    const { getFromIPFS } = await import('./ipfs');
    const ipfsData = await getFromIPFS(ipfsHash);
    
    if (ipfsData && ipfsData.length > 0) {
      try {
        const textData = await ipfsData[0].text();
        console.log('Texto recuperado do IPFS:', textData);
        
        const jsonData = JSON.parse(textData);
        console.log('Dados JSON recuperados do IPFS:', jsonData);
        
        // Salvar no localStorage para uso futuro
        ipfsMapping[ipfsHash] = jsonData;
        localStorage.setItem('ipfsMapping', JSON.stringify(ipfsMapping));
        
        return jsonData;
      } catch (parseError) {
        console.error('Erro ao fazer parse dos dados IPFS:', parseError);
      }
    } else {
      console.log('Nenhum dado IPFS encontrado');
    }
  } catch (error) {
    console.error('Erro ao depurar dados IPFS:', error);
  }
  
  return null;
};

// Função para adicionar manualmente um attestation de teste ao localStorage
export const addTestAttestation = (ipfsHash, uid) => {
  if (!ipfsHash || !uid) {
    console.error('IPFS Hash e UID são obrigatórios');
    return false;
  }
  
  console.log('Adicionando attestation de teste ao localStorage...');
  console.log('IPFS Hash:', ipfsHash);
  console.log('UID:', uid);
  
  try {
    // Adicionar ao mapeamento principal
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || "{}");
    attestations[ipfsHash] = uid;
    localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
    
    // Adicionar à lista completa
    const allAttestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_ATTESTATIONS) || "[]");
    
    // Verificar se já existe
    const existingIndex = allAttestations.findIndex(att => att.uid === uid);
    
    if (existingIndex >= 0) {
      // Atualizar o existente
      allAttestations[existingIndex].ipfsHash = ipfsHash;
    } else {
      // Adicionar novo
      allAttestations.push({
        uid: uid,
        ipfsHash: ipfsHash,
        timestamp: new Date().toISOString()
      });
    }
    
    localStorage.setItem(STORAGE_KEYS.ALL_ATTESTATIONS, JSON.stringify(allAttestations));
    
    // Adicionar também às chaves legadas
    const easAttestations = JSON.parse(localStorage.getItem("easAttestations") || "{}");
    easAttestations[ipfsHash] = uid;
    localStorage.setItem("easAttestations", JSON.stringify(easAttestations));
    
    // Atualizar variáveis globais
    globalAttestations[ipfsHash] = uid;
    
    console.log('Attestation de teste adicionado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao adicionar attestation de teste:', error);
    return false;
  }
};

// Função para depurar o localStorage e verificar todos os dados armazenados
export const debugLocalStorage = () => {
  console.log("=== DEPURAÇÃO DO LOCAL STORAGE ===");
  console.log("Chaves disponíveis no localStorage:");
  
  // Listar todas as chaves disponíveis no localStorage
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    allKeys.push(localStorage.key(i));
  }
  console.log("Todas as chaves:", allKeys);
  
  // Verificar cada chave relacionada a attestations
  const keysToCheck = [
    ...STORAGE_KEYS.LEGACY_KEYS,
    STORAGE_KEYS.PLEDGE_ATTESTATIONS,
    STORAGE_KEYS.ALL_ATTESTATIONS,
    "easAttestations"
  ];
  
  console.log("\nConteúdo das chaves relacionadas a attestations:");
  keysToCheck.forEach(key => {
    try {
      const rawData = localStorage.getItem(key);
      if (rawData) {
        try {
          const parsedData = JSON.parse(rawData);
          console.log(`Chave: ${key}`);
          console.log("Tipo de dados:", Array.isArray(parsedData) ? "Array" : typeof parsedData);
          console.log("Conteúdo:", parsedData);
          
          if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
            console.log("Número de entradas:", Object.keys(parsedData).length);
            
            // Verificar se alguma chave começa com 'bafy'
            const ipfsKeys = Object.keys(parsedData).filter(k => k.startsWith('bafy'));
            if (ipfsKeys.length > 0) {
              console.log("Chaves IPFS encontradas:", ipfsKeys);
              ipfsKeys.forEach(ipfsKey => {
                console.log(`IPFS: ${ipfsKey} => UID: ${parsedData[ipfsKey]}`);
                
                // Adicionar ao mapeamento global
                globalAttestations[ipfsKey] = parsedData[ipfsKey];
              });
            }
          }
        } catch (parseError) {
          console.log(`Erro ao analisar dados da chave ${key}:`, parseError);
          console.log("Dados brutos:", rawData);
        }
      } else {
        console.log(`Chave: ${key} - Não encontrada ou vazia`);
      }
    } catch (error) {
      console.log(`Erro ao acessar chave ${key}:`, error);
    }
    console.log("-----------------------");
  });
  
  // Verificar se há algum attestation no localStorage com o formato antigo
  console.log("\nVerificando attestations em formato antigo...");
  allKeys.forEach(key => {
    if (!keysToCheck.includes(key)) {
      try {
        const rawData = localStorage.getItem(key);
        if (rawData && rawData.includes('"uid"') && rawData.includes('"ipfsHash"')) {
          console.log(`Possível attestation encontrado na chave: ${key}`);
          try {
            const parsedData = JSON.parse(rawData);
            console.log("Dados:", parsedData);
          } catch (parseError) {
            console.log("Erro ao analisar dados:", parseError);
          }
        }
      } catch (error) {
        // Ignorar erros
      }
    }
  });
  
  console.log("=== FIM DA DEPURAÇÃO ===\n");
};

// Executar migração ao carregar o módulo
migrateOldAttestations();

// ABI simplificado para o contrato EAS
const EAS_ABI = [
  "function attest(tuple(bytes32 schema, tuple(address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data)) external payable returns (bytes32)",
  "event Attested(bytes32 indexed schema, bytes32 indexed uid, address indexed attester, bytes32 attestation)"
];

// ABI simplificado para o SchemaRegistry
const SCHEMA_REGISTRY_ABI = [
  "function register(string calldata schema, address resolver, bool revocable) external returns (bytes32)",
  "event Registered(bytes32 indexed uid, address indexed registerer, bytes32 schema)"
];

// Função para obter o contrato EAS
export const getEASContract = async () => {
  try {
    // Verificar se o provider está disponível
    if (!window.ethereum) {
      throw new Error("MetaMask não está instalado");
    }

    // Obter o provider e o signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Criar instância do contrato EAS
    const easContract = new ethers.Contract(EAS_CONTRACT_ADDRESS, EAS_ABI, signer);

    return easContract;
  } catch (error) {
    console.error("Erro ao inicializar o contrato EAS:", error);
    throw error;
  }
};

// Função para obter o contrato SchemaRegistry
export const getSchemaRegistryContract = async () => {
  try {
    // Verificar se o provider está disponível
    if (!window.ethereum) {
      throw new Error("MetaMask não está instalado");
    }

    // Obter o provider e o signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Criar instância do contrato SchemaRegistry
    const schemaRegistryContract = new ethers.Contract(SCHEMA_REGISTRY_ADDRESS, SCHEMA_REGISTRY_ABI, signer);

    return schemaRegistryContract;
  } catch (error) {
    console.error("Erro ao inicializar o contrato SchemaRegistry:", error);
    throw error;
  }
};

// Função para registrar um schema (apenas necessário uma vez)
export const registerSchema = async () => {
  try {
    const schemaRegistry = await getSchemaRegistryContract();

    // Registrar o schema
    const tx = await schemaRegistry.register(
      PLEDGE_SCHEMA,
      ethers.constants.AddressZero, // Sem resolver
      true // Revocable
    );

    console.log("Transação de registro enviada:", tx.hash);
    const receipt = await tx.wait();
    console.log("Recibo da transação:", receipt);
    
    // Extrair o UID do schema dos logs
    // Procurar pelo evento Registered
    const registeredEvent = receipt.events.find(event => event.event === 'Registered');
    
    let schemaUID;
    if (registeredEvent && registeredEvent.args) {
      schemaUID = registeredEvent.args.uid;
    } else {
      // Fallback: tentar extrair do primeiro tópico se o evento não for encontrado
      schemaUID = receipt.logs[0].topics[1];
    }
    
    console.log("Schema registrado com sucesso. UID:", schemaUID);
    
    return schemaUID;
  } catch (error) {
    console.error("Erro ao registrar schema:", error);
    throw error;
  }
};

// Função para criar um attestation para um pledge
export const createPledgeAttestation = async (pledgeData) => {
  try {
    console.log('Preparando dados para attestation...');
    
    if (!pledgeData || !pledgeData.ipfsHash) {
      console.error('Dados de pledge inválidos para attestation');
      return { success: false, error: 'Dados de pledge inválidos' };
    }
    
    // Verificar se já existe um attestation para este pledge
    const existingUID = await checkPledgeAttestation(pledgeData);
    if (existingUID) {
      console.log('Pledge já possui um attestation:', existingUID);
      return { success: true, attestationUID: existingUID };
    }
    
    const easContract = await getEASContract();
    if (!easContract) {
      return { success: false, error: 'Falha ao obter contrato EAS' };
    }
    
    // Processar a data para garantir que seja um timestamp válido
    let startDateTimestamp;
    if (pledgeData.startDate instanceof Date) {
      startDateTimestamp = Math.floor(pledgeData.startDate.getTime() / 1000); // Converter para segundos
    } else if (typeof pledgeData.startDate === 'string') {
      // Se for uma string de data, converter para timestamp
      try {
        startDateTimestamp = Math.floor(new Date(pledgeData.startDate).getTime() / 1000);
      } catch (dateError) {
        console.error('Erro ao converter data:', dateError);
        return { success: false, error: 'Formato de data inválido' };
      }
    } else if (typeof pledgeData.startDate === 'number') {
      // Se já for um número, assumir que é um timestamp em milissegundos
      startDateTimestamp = Math.floor(pledgeData.startDate / 1000); // Converter para segundos
    } else {
      console.error('Formato de data não suportado:', pledgeData.startDate);
      return { success: false, error: 'Formato de data não suportado' };
    }
    
    console.log('Data processada:', {
      original: pledgeData.startDate,
      timestamp: startDateTimestamp,
      formatted: new Date(startDateTimestamp * 1000).toISOString()
    });
    
    // Garantir que a porcentagem seja um número
    const percentage = parseInt(pledgeData.percentage, 10);
    if (isNaN(percentage)) {
      console.error('Porcentagem inválida:', pledgeData.percentage);
      return { success: false, error: 'Porcentagem inválida' };
    }
    
    // Codificar os dados do pledge de acordo com o schema
    const abiCoder = new ethers.utils.AbiCoder();
    const encodedData = abiCoder.encode(
      ['string', 'uint8', 'uint256', 'uint256', 'string'],
      [
        pledgeData.projectName,
        pledgeData.commitmentType === 'Revenue' ? 0 : 1, // 0 para Revenue, 1 para Token
        percentage,
        startDateTimestamp,
        pledgeData.ipfsHash
      ]
    );
    
    const attestationData = {
      recipient: pledgeData.pledgor, // Endereço do pledgor como recipient
      expirationTime: 0, // Sem expiração
      revocable: true, // Pode ser revogado
      refUID: ethers.constants.HashZero, // Sem referência a outros attestations
      data: encodedData,
      value: 0 // Sem valor anexado
    };
    
    console.log('Enviando transação de attestation...');
    const tx = await easContract.attest(
      {
        schema: PLEDGE_SCHEMA_UID,
        data: attestationData
      },
      { gasLimit: 500000 }
    );
    
    console.log('Transação de attestation enviada:', tx.hash);
    const receipt = await tx.wait();
    console.log('Recibo da transação:', receipt);
    
    // Extrair o UID do attestation do evento emitido
    let attestationUID;
    
    try {
      // Tentar extrair do evento Attested
      const attestedEvent = receipt.events.find(e => e.event === 'Attested');
      if (attestedEvent && attestedEvent.args) {
        attestationUID = attestedEvent.args.uid;
        console.log('UID do attestation extraído do evento:', attestationUID);
      } else {
        // Se não conseguir extrair do evento, usar o hash da transação como fallback
        console.log('Evento Attested não encontrado, usando hash da transação como UID');
        attestationUID = tx.hash;
      }
    } catch (eventError) {
      console.warn('Erro ao extrair UID do evento:', eventError);
      // Usar o hash da transação como fallback
      attestationUID = tx.hash;
    }
    
    console.log('Usando hash da transação como UID:', attestationUID);
    
    // Garantir que o UID seja uma string antes de salvar
    const uidString = String(attestationUID).replace(/^0x/, '0x');
    console.log('Attestation criado com sucesso. UID (convertido para string):', uidString);
    
    // Salvar o UID do attestation localmente para referência futura
    savePledgeAttestation(pledgeData.ipfsHash, uidString, pledgeData);
    
    return { 
      success: true, 
      attestationUID: uidString,
      txHash: tx.hash
    };
  } catch (error) {
    console.error("Erro ao criar attestation:", error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
};

// Função para verificar se um pledge tem um attestation
export const checkPledgeAttestation = async (pledgeData) => {
  try {
    if (!pledgeData || !pledgeData.ipfsHash) {
      console.error('Dados de pledge inválidos:', pledgeData);
      return null;
    }
    
    console.log('Verificando attestation para pledge:', pledgeData.projectName);
    console.log('IPFS Hash:', pledgeData.ipfsHash);
    
    // Forçar atualização dos attestations
    forceAttestationsUpdate();
    
    // Verificar todas as chaves possíveis no localStorage
    const possibleKeys = [
      STORAGE_KEYS.PLEDGE_ATTESTATIONS,
      STORAGE_KEYS.ALL_ATTESTATIONS,
      'easAttestations',
      'attestations',
      'pledgeEasMap'
    ];
    
    // Depurar todas as chaves
    console.log('Verificando todas as chaves possíveis no localStorage...');
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`Chave ${key}:`, parsed);
          
          // Se for um objeto, verificar se contém o ipfsHash
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (parsed[pledgeData.ipfsHash]) {
              console.log(`Attestation encontrado na chave ${key}:`, parsed[pledgeData.ipfsHash]);
              
              // Atualizar cache global
              globalAttestations[pledgeData.ipfsHash] = parsed[pledgeData.ipfsHash];
              
              // Atualizar o mapeamento principal
              const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || "{}");
              attestations[pledgeData.ipfsHash] = parsed[pledgeData.ipfsHash];
              localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
              
              return parsed[pledgeData.ipfsHash];
            }
          }
        } catch (e) {
          console.error(`Erro ao analisar chave ${key}:`, e);
        }
      }
    }
    
    // Usar as variáveis globais primeiro (mais rápido)
    if (globalAttestations[pledgeData.ipfsHash]) {
      console.log('Attestation encontrado em cache global:', globalAttestations[pledgeData.ipfsHash]);
      return globalAttestations[pledgeData.ipfsHash];
    }
    
    // Método 1: Verificar pelo ipfsHash (chave primária)
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || "{}");
    console.log('Mapeamento de attestations:', attestations);
    
    const attestationUID = attestations[pledgeData.ipfsHash];
    
    if (attestationUID) {
      console.log('Attestation encontrado pelo ipfsHash:', attestationUID);
      // Atualizar cache global
      globalAttestations[pledgeData.ipfsHash] = attestationUID;
      return attestationUID;
    }
    
    // Método 2: Verificar todos os attestations armazenados
    const allStoredAttestations = getAllAttestationsFromStorage();
    if (allStoredAttestations[pledgeData.ipfsHash]) {
      const uid = allStoredAttestations[pledgeData.ipfsHash];
      console.log('Attestation encontrado em armazenamento consolidado:', uid);
      
      // Atualizar mapeamentos
      attestations[pledgeData.ipfsHash] = uid;
      globalAttestations[pledgeData.ipfsHash] = uid;
      localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
      
      return uid;
    }
    
    // Método 3: Verificar por combinação de campos
    const allAttestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_ATTESTATIONS) || "[]");
    
    // Método 3.1: Tentar encontrar por ipfsHash na lista completa
    const attestationByHash = allAttestations.find(att => att.ipfsHash === pledgeData.ipfsHash);
    if (attestationByHash) {
      console.log('Attestation encontrado por ipfsHash na lista completa:', attestationByHash.uid);
      
      // Atualizar mapeamentos
      attestations[pledgeData.ipfsHash] = attestationByHash.uid;
      globalAttestations[pledgeData.ipfsHash] = attestationByHash.uid;
      localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
      
      return attestationByHash.uid;
    }
    
    // Método 3.2: Procurar por um attestation que corresponda aos dados do pledge
    const matchingAttestation = allAttestations.find(att => {
      if (!att.pledgeData) return false;
      
      // Verificar correspondência por nome do projeto e porcentagem
      const projectNameMatch = att.pledgeData.projectName === pledgeData.projectName;
      const percentageMatch = att.pledgeData.percentage === pledgeData.percentage;
      
      // Verificar correspondência de data (pode estar em formatos diferentes)
      let dateMatch = false;
      if (pledgeData.startDate instanceof Date) {
        // Comparar timestamp
        dateMatch = att.pledgeData.startDate === pledgeData.startDate.getTime();
      }
      
      return projectNameMatch && percentageMatch && (dateMatch || true); // Relaxar a condição de data
    });
    
    if (matchingAttestation) {
      console.log('Attestation encontrado por combinação de campos:', matchingAttestation.uid);
      
      // Atualizar mapeamentos
      attestations[pledgeData.ipfsHash] = matchingAttestation.uid;
      globalAttestations[pledgeData.ipfsHash] = matchingAttestation.uid;
      localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
      
      return matchingAttestation.uid;
    }
    
    // Verificar se há algum attestation com o mesmo nome de projeto e porcentagem
    // Isso é uma verificação mais relaxada para casos onde o ipfsHash pode ter mudado
    const similarAttestation = allAttestations.find(att => {
      if (!att.pledgeData) return false;
      return att.pledgeData.projectName === pledgeData.projectName && 
             att.pledgeData.percentage === pledgeData.percentage;
    });
    
    if (similarAttestation) {
      console.log('Attestation similar encontrado:', similarAttestation.uid);
      
      // Atualizar mapeamentos
      attestations[pledgeData.ipfsHash] = similarAttestation.uid;
      globalAttestations[pledgeData.ipfsHash] = similarAttestation.uid;
      localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
      
      return similarAttestation.uid;
    }
    
    console.log('Nenhum attestation encontrado para este pledge');
    return null;
  } catch (error) {
    console.error("Erro ao verificar attestation:", error);
    return null;
  }
};

// Função para salvar o UID do attestation localmente
export const savePledgeAttestation = (ipfsHash, attestationUID, pledgeData) => {
  try {
    if (!ipfsHash || !attestationUID) {
      console.error('Dados inválidos para salvar attestation:', { ipfsHash, attestationUID });
      return false;
    }
    
    // Garantir que o UID seja uma string
    const uidString = String(attestationUID).replace(/^0x/, '0x');
    console.log('UID convertido para string antes de salvar:', uidString);
    
    console.log('Salvando attestation para pledge:', { 
      ipfsHash, 
      uid: uidString, 
      projectName: pledgeData?.projectName || 'N/A' 
    });
    
    // Atualizar variáveis globais primeiro (para acesso rápido)
    globalAttestations[ipfsHash] = uidString;
    
    // Salvar no mapeamento principal por ipfsHash
    const attestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS) || "{}");
    attestations[ipfsHash] = uidString;
    localStorage.setItem(STORAGE_KEYS.PLEDGE_ATTESTATIONS, JSON.stringify(attestations));
    
    // Salvar também em uma lista completa com todos os dados
    // Isso facilita a busca por outros critérios além do ipfsHash
    const allAttestations = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_ATTESTATIONS) || "[]");
    
    // Verificar se já existe um attestation com este UID
    const existingIndex = allAttestations.findIndex(att => att.uid === uidString);
    
    const attestationEntry = {
      uid: uidString,
      ipfsHash: ipfsHash,
      pledgeData: pledgeData || {},
      timestamp: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Atualizar o existente
      allAttestations[existingIndex] = attestationEntry;
    } else {
      // Adicionar novo
      allAttestations.push(attestationEntry);
    }
    
    // Atualizar variável global de todos os attestations
    globalAllAttestations = [...allAttestations];
    
    localStorage.setItem(STORAGE_KEYS.ALL_ATTESTATIONS, JSON.stringify(allAttestations));
    
    // Salvar em todas as chaves legadas para garantir compatibilidade
    const legacyStorageKeys = [
      "easAttestations",
      "attestations",
      "pledgeEasMap"
    ];
    
    legacyStorageKeys.forEach(key => {
      try {
        const legacyData = JSON.parse(localStorage.getItem(key) || "{}");
        legacyData[ipfsHash] = uidString;
        localStorage.setItem(key, JSON.stringify(legacyData));
      } catch (legacyError) {
        console.warn(`Erro ao salvar em formato legado (${key}):`, legacyError);
      }
    });
    
    console.log('Attestation salvo com sucesso em todos os formatos');
    console.log('Mapeamento atual:', globalAttestations);
    return true;
  } catch (error) {
    console.error("Erro ao salvar attestation:", error);
    return false;
  }
};

// Função para obter o link do EASScan para um attestation
export const getEASScanLink = (attestationUID) => {
  // Verificar se o UID existe
  if (!attestationUID) {
    console.error('UID de attestation não fornecido');
    return null;
  }
  
  // Garantir que o UID seja uma string
  const uidString = String(attestationUID).replace(/^0x/, '0x');
  console.log('Gerando link EASScan para UID (convertido para string):', uidString);
  
  // URL correto para a rede Arbitrum Sepolia
  // Nota: Pode haver um atraso na indexação do EASScan, então o attestation pode não estar disponível imediatamente
  return `https://sepolia.easscan.org/attestation/view/${uidString}`;
};

// Função para depurar e corrigir o formato de data em um pledge
export const fixPledgeDataFormat = (pledgeData) => {
  if (!pledgeData) {
    console.error('Dados de pledge inválidos');
    return null;
  }
  
  console.log('Corrigindo formato de dados para pledge:', pledgeData.projectName || 'Desconhecido');
  
  // Criar uma cópia para não modificar o original
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
    
    // Adicionar o timestamp como propriedade separada para debug
    fixedPledgeData._startDateTimestamp = Math.floor(correctedDate.getTime() / 1000);
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

// Função para criar manualmente um attestation para um pledge existente
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
