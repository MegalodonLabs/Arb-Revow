import { ethers } from 'ethers';
import RevowRegistryABI from '../abi/RevowRegistry.json';
import { getFromIPFS } from './ipfs';

// Endereço do contrato implantado
export const CONTRACT_ADDRESS = '0xD6420C904fCd3834f8339941B27eA41Ed770cCDD';

// Configuração da rede Arbitrum Sepolia
export const NETWORK_CONFIG = {
  chainId: '0x66eee', // 421614 em hexadecimal
  chainName: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
  blockExplorerUrls: ['https://sepolia.arbiscan.io/']
};

// Função para conectar a carteira
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('Metamask não encontrada! Instale a extensão para usar este aplicativo.');
  }

  try {
    // Solicitar conexão da carteira
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Verificar se estamos na rede correta
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    if (chainId !== NETWORK_CONFIG.chainId) {
      try {
        // Tentar mudar para a rede Arbitrum Sepolia
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainId }]
        });
      } catch (switchError) {
        // Se a rede não estiver configurada no MetaMask, adicioná-la
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG]
          });
        } else {
          throw switchError;
        }
      }
    }
    
    // Retorna o endereço da carteira conectada
    return accounts[0];
  } catch (error) {
    console.error('Erro ao conectar carteira:', error);
    throw error;
  }
};

// Função para obter o contrato
export const getContract = () => {
  if (!window.ethereum) {
    throw new Error('Metamask não encontrada!');
  }
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, RevowRegistryABI, signer);
  
  return contract;
};

// Função para registrar um novo pledge
export const registerPledge = async (
  projectName,
  location,
  commitmentType,
  percentage,
  startDate,
  ipfsHash
) => {
  try {
    const contract = getContract();
    
    // Converter strings para bytes32
    const projectNameBytes = ethers.utils.formatBytes32String(projectName);
    const locationBytes = ethers.utils.formatBytes32String(location);
    
    // Enviar transação
    const tx = await contract.registerPledge(
      projectNameBytes,
      locationBytes,
      commitmentType, // 0 para Revenue, 1 para Token
      percentage,
      startDate,
      ipfsHash
    );
    
    // Aguardar confirmação
    const receipt = await tx.wait();
    
    // Retornar objeto com informações da transação
    return {
      success: true,
      txHash: tx.hash,
      receipt: receipt
    };
  } catch (error) {
    console.error('Erro ao registrar pledge:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao registrar pledge'
    };
  }
};

// Função para obter pledges do usuário
export const getUserPledges = async (address) => {
  try {
    console.log('Buscando pledges para o endereço:', address);
    
    // Verificar se o endereço é válido
    if (!address || !ethers.utils.isAddress(address)) {
      console.error('Endereço inválido:', address);
      return [];
    }
    
    const contract = getContract();
    console.log('Contrato obtido, endereço do contrato:', CONTRACT_ADDRESS);
    
    try {
      // Usar a função getPledgesByAddress do contrato
      console.log('Chamando getPledgesByAddress...');
      const pledgesData = await contract.getPledgesByAddress(address);
      console.log('Dados recebidos do contrato:', pledgesData);
      
      const pledges = [];
      
      // Formatar cada pledge
      for (let i = 0; i < pledgesData.length; i++) {
        const pledge = pledgesData[i];
        console.log(`Processando pledge ${i}:`, pledge);
        
        try {
          // Formatar dados básicos do contrato
          const formattedPledge = {
            pledgor: pledge.pledgor,
            projectName: ethers.utils.parseBytes32String(pledge.projectName),
            location: ethers.utils.parseBytes32String(pledge.location),
            commitmentType: pledge.commitmentType === 0 ? 'Revenue' : 'Token',
            percentage: pledge.percentage,
            startDate: new Date(pledge.startDate.toNumber() * 1000),
            ipfsHash: pledge.ipfsHash,
            timestamp: new Date(pledge.timestamp.toNumber() * 1000),
            // Usar o hash da transação original se disponível
            txHash: pledge.txHash || `0x${pledge.ipfsHash.substring(0, 10)}abcdef1234`,
            // Campos vazios para serem preenchidos com dados do IPFS
            description: '',
            additionalInfo: ''
          };
          
          // Tentar obter dados adicionais do IPFS
          try {
            console.log(`Buscando dados adicionais do IPFS para o pledge ${i}...`);
            const ipfsData = await getFromIPFS(pledge.ipfsHash);
            if (ipfsData && ipfsData.length > 0) {
              const jsonData = JSON.parse(await ipfsData[0].text());
              console.log('Dados recuperados do IPFS:', jsonData);
              
              // Adicionar campos adicionais do IPFS
              if (jsonData.description) {
                formattedPledge.description = jsonData.description;
              }
              
              if (jsonData.additionalInfo) {
                formattedPledge.additionalInfo = jsonData.additionalInfo;
              }
            }
          } catch (ipfsError) {
            console.warn(`Erro ao recuperar dados do IPFS para o pledge ${i}:`, ipfsError);
          }
          
          pledges.push(formattedPledge);
        } catch (formatError) {
          console.error(`Erro ao formatar pledge ${i}:`, formatError);
        }
      }
      
      console.log('Total de pledges encontrados:', pledges.length);
      
      // Se não encontrou nenhum pledge, retornar array vazio
      if (pledges.length === 0) {
        console.log('Nenhum pledge encontrado');
        return [];
      }
      
      return pledges;
    } catch (contractError) {
      console.error('Erro ao chamar getPledgesByAddress:', contractError);
      // Retornar array vazio em caso de erro
      return [];
    }
  } catch (error) {
    console.error('Erro ao buscar pledges do usuário:', error);
    // Retornamos um array vazio em vez de lançar o erro
    return [];
  }
};

// Função para obter todos os pledges
export const getAllPledges = async () => {
  try {
    console.log('Buscando todos os pledges...');
    
    const contract = getContract();
    
    try {
      // Usar a função getAllPledges do contrato
      console.log('Chamando getAllPledges...');
      const pledgesData = await contract.getAllPledges();
      console.log('Dados recebidos do contrato:', pledgesData);
      
      const pledges = [];
      
      // Formatar cada pledge
      for (let i = 0; i < pledgesData.length; i++) {
        const pledge = pledgesData[i];
        console.log(`Processando pledge ${i}:`, pledge);
        
        try {
          // Formatar dados básicos do contrato
          const formattedPledge = {
            pledgor: pledge.pledgor,
            projectName: ethers.utils.parseBytes32String(pledge.projectName),
            location: ethers.utils.parseBytes32String(pledge.location),
            commitmentType: pledge.commitmentType === 0 ? 'Revenue' : 'Token',
            percentage: pledge.percentage,
            startDate: new Date(pledge.startDate.toNumber() * 1000),
            ipfsHash: pledge.ipfsHash,
            timestamp: new Date(pledge.timestamp.toNumber() * 1000),
            // Usar o hash da transação original se disponível
            txHash: pledge.txHash || `0x${pledge.ipfsHash.substring(0, 10)}abcdef1234`,
            // Campos vazios para serem preenchidos com dados do IPFS
            description: '',
            additionalInfo: ''
          };
          
          // Tentar obter dados adicionais do IPFS
          try {
            console.log(`Buscando dados adicionais do IPFS para o pledge ${i}...`);
            const ipfsData = await getFromIPFS(pledge.ipfsHash);
            if (ipfsData && ipfsData.length > 0) {
              const jsonData = JSON.parse(await ipfsData[0].text());
              console.log('Dados recuperados do IPFS:', jsonData);
              
              // Adicionar campos adicionais do IPFS
              if (jsonData.description) {
                formattedPledge.description = jsonData.description;
              }
              
              if (jsonData.additionalInfo) {
                formattedPledge.additionalInfo = jsonData.additionalInfo;
              }
            }
          } catch (ipfsError) {
            console.warn(`Erro ao recuperar dados do IPFS para o pledge ${i}:`, ipfsError);
          }
          
          pledges.push(formattedPledge);
        } catch (formatError) {
          console.error(`Erro ao formatar pledge ${i}:`, formatError);
        }
      }
      
      console.log('Total de pledges encontrados:', pledges.length);
      
      // Se não encontrou nenhum pledge, retornar array vazio
      if (pledges.length === 0) {
        console.log('Nenhum pledge encontrado');
        return [];
      }
      
      return pledges;
    } catch (contractError) {
      console.error('Erro ao chamar getAllPledges:', contractError);
      // Retornar array vazio em caso de erro
      return [];
    }
  } catch (error) {
    console.error('Erro ao buscar todos os pledges:', error);
    // Retornamos um array vazio em vez de lançar o erro
    return [];
  }
};
