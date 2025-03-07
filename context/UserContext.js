import React, { createContext, useState } from 'react';

// Initialize context
export const UserContext = createContext();

export default function App() {
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState('');

  return (
    <UserContext.Provider value={{ profileImage, setProfileImage, fullName, setFullName }}>
      <YourNavigator />
    </UserContext.Provider>
  );
}
