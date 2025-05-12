import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { connectWallet } from './utils/web3';
import Home from './pages/Home';
import RegisterPledge from './pages/RegisterPledge';
import UserPledges from './pages/UserPledges';
import AllPledges from './pages/AllPledges';
import RegisterEASSchema from './pages/RegisterEASSchema';
import AttestationView from './pages/AttestationView';
import AllAttestations from './pages/AllAttestations';

function App() {
  const [account, setAccount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Conectar carteira ao carregar a aplicação
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        if (window.ethereum && window.ethereum.selectedAddress) {
          const address = await connectWallet();
          setAccount(address);
        }
      } catch (error) {
        console.error(error);
      }
    };

    checkIfWalletIsConnected();

    // Adicionar evento para detectar mudanças na carteira
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
        }
      });
    }
  }, []);

  // Função para conectar carteira
  const handleConnectWallet = async () => {
    setLoading(true);
    setError('');
    
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please verify that you have MetaMask installed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: 'white' }}>Revow</Link>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
            <Link to="/register" style={{ marginRight: '1rem' }}>Register Pledge</Link>
            <Link to="/my-pledges" style={{ marginRight: '1rem' }}>My Pledges</Link>
            <Link to="/all-pledges" style={{ marginRight: '1rem' }}>All Pledges</Link>
            <Link to="/all-attestations" style={{ marginRight: '1rem' }}>Attestations</Link>
            
            {account ? (
              <div style={{ backgroundColor: 'white', color: '#6c5ce7', padding: '0.25rem 1rem', borderRadius: '50px', fontSize: '0.875rem', fontWeight: '500' }}>
                {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="btn btn-primary"
                style={{ backgroundColor: 'white', color: '#6c5ce7', border: 'none' }}
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mensagem de erro */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <Routes>
          <Route path="/" element={<Home account={account} onConnectWallet={handleConnectWallet} />} />
          <Route path="/register" element={<RegisterPledge account={account} />} />
          <Route path="/my-pledges" element={<UserPledges account={account} />} />
          <Route path="/all-pledges" element={<AllPledges />} />
          <Route path="/all-attestations" element={<AllAttestations />} />
          <Route path="/register-eas-schema" element={<RegisterEASSchema />} />
          <Route path="/attestation/:uid" element={<AttestationView />} />
        </Routes>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>Revow - Blockchain Commitment Registry</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Developed with ❤️ for the Arbitrum Sepolia network</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Contract: <a 
              href={`https://sepolia.arbiscan.io/address/0xD6420C904fCd3834f8339941B27eA41Ed770cCDD`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#a29bfe', textDecoration: 'none' }}
            >
              0xD6420C904fCd3834f8339941B27eA41Ed770cCDD
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
