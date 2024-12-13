import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import { auth } from "../FireBaseAuth";
import { addNewUserToDb, updateUserDisplayName } from "../../api/users";
import './GoogleLogin.css'

const GoogleLogin: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredentials = await signInWithPopup(auth, provider);
      const isNewUser: boolean = getAdditionalUserInfo(userCredentials)?.isNewUser || false;

      const user = userCredentials.user;
      if (!user.displayName) {
        setShowDisplayNamePrompt(true);
      } else if (isNewUser) {
        console.log("New User, adding to DB");  
        await addNewUserToDb(userCredentials, user.displayName);
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const handleDisplayNameSubmit = async () => {
    if (displayName) {
      const user = auth.currentUser;
      if (user) {
        await updateUserDisplayName(user.uid, displayName);
        setShowDisplayNamePrompt(false);
      }
    }
  };

  if (showDisplayNamePrompt) {
    return (
      <div>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
        />
        <button  onClick={handleDisplayNameSubmit}>Submit</button>
      </div>
    );
  }

  return (
    <button onClick={handleGoogleLogin} className="google-login-button">
      Sign in with Google
    </button>
  );
};

export default GoogleLogin;