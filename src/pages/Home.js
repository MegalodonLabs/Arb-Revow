import React from 'react';
import { Link } from 'react-router-dom';

const Home = ({ account, onConnectWallet }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Revow</h1>
        <p className="text-xl text-gray-600">
          Register your project commitments on the Arbitrum blockchain in a transparent and immutable way.
        </p>
      </div>

      {!account ? (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Connect your wallet to get started</h2>
          <p className="text-gray-600 mb-6">
            To use Revow, you need to connect your MetaMask wallet to the Arbitrum Sepolia network.
          </p>
          <button
            onClick={onConnectWallet}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            to="/register"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition flex flex-col items-center justify-center text-center"
          >
            <div className="bg-purple-100 text-purple-600 p-2 rounded-full mb-4" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Register New Pledge</h3>
            <p className="text-gray-600">
              Create a new commitment for your project and register it on the blockchain.
            </p>
          </Link>

          <Link
            to="/my-pledges"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition flex flex-col items-center justify-center text-center"
          >
            <div className="bg-purple-100 text-purple-600 p-2 rounded-full mb-4" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">My Pledges</h3>
            <p className="text-gray-600">
              View all the commitments you have registered.
            </p>
          </Link>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">About Revow</h2>
        <p className="text-gray-600 mb-4">
          Revow is a decentralized application (dApp) that allows you to register project commitments on the Arbitrum blockchain.
          These commitments can be of two types:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-700 mb-2">Revenue Commitment</h3>
            <p className="text-gray-700">
              Commit to allocating a percentage of your project's revenue to a specific cause.
            </p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-semibold text-indigo-700 mb-2">Token Commitment</h3>
            <p className="text-gray-700">
              Commit to allocating a percentage of your project's tokens to a specific cause.
            </p>
          </div>
        </div>
        
        <p className="text-gray-600">
          All commitments are stored transparently and immutably on the Arbitrum Sepolia blockchain,
          and associated documents are stored on IPFS (InterPlanetary File System).
        </p>
      </div>
    </div>
  );
};

export default Home;
