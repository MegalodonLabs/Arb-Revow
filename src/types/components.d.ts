import React from 'react';

// Interfaces para os componentes
declare module '../pages/UserPledges' {
  interface UserPledgesProps {
    account: string;
  }
  
  const UserPledges: React.FC<UserPledgesProps>;
  export default UserPledges;
}

declare module '../pages/RegisterPledge' {
  interface RegisterPledgeProps {
    account: string;
  }
  
  const RegisterPledge: React.FC<RegisterPledgeProps>;
  export default RegisterPledge;
}

declare module '../pages/Home' {
  interface HomeProps {
    account: string;
    onConnectWallet: () => Promise<void>;
  }
  
  const Home: React.FC<HomeProps>;
  export default Home;
}
