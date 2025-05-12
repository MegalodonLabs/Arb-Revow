import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerSchema } from '../utils/eas';

const RegisterEASSchema = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schemaUID, setSchemaUID] = useState('');

  const handleRegisterSchema = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Registrar o schema no EAS
      const uid = await registerSchema();
      setSchemaUID(uid);
      
      setSuccess(`Schema registrado com sucesso! UID: ${uid}`);
      
      // Atualizar o arquivo eas.js com o UID do schema
      console.log('Por favor, atualize o arquivo eas.js com o UID do schema:', uid);
    } catch (err) {
      console.error('Erro ao registrar schema:', err);
      setError(`Erro ao registrar schema: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Registrar Schema EAS</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <p className="text-gray-700 mb-4">
          Esta página é utilizada para registrar o schema personalizado para os pledges no Ethereum Attestation Service (EAS).
          Este processo precisa ser feito apenas uma vez.
        </p>
        
        <p className="text-gray-700 mb-6">
          O schema registrado terá os seguintes campos:
          <ul className="list-disc pl-6 mt-2">
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">string projectName</code> - Nome do projeto</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">uint8 commitmentType</code> - Tipo de compromisso (0 = Revenue, 1 = Token)</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">uint256 percentage</code> - Porcentagem do compromisso</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">uint256 startDate</code> - Data de início do compromisso</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">string ipfsHash</code> - Hash IPFS com dados adicionais</li>
          </ul>
        </p>
        
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
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
                {schemaUID && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">UID do Schema:</p>
                    <p className="font-mono text-sm break-all bg-gray-50 p-2 rounded mt-1">{schemaUID}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Importante: Copie este UID e atualize a constante <code>PLEDGE_SCHEMA_UID</code> no arquivo <code>src/utils/eas.js</code>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            onClick={handleRegisterSchema}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrar Schema'}
          </button>
          
          <Link to="/" className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
            Voltar para Home
          </Link>
        </div>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Nota:</strong> Após registrar o schema, você precisará atualizar o arquivo <code>src/utils/eas.js</code> com o UID gerado.
              Isso permitirá que a aplicação crie attestations usando este schema.
              <br /><br />
              <strong>Importante:</strong> Esta aplicação está configurada para usar a rede Arbitrum Sepolia. Você pode visualizar os attestations em <a href="https://sepolia.easscan.org" target="_blank" rel="noopener noreferrer" className="underline">https://sepolia.easscan.org</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterEASSchema;
