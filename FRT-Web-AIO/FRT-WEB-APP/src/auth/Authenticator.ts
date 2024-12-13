// src/auth/Authenticator.ts

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  // updatePassword,
  UserCredential,
  AuthError,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./FireBaseAuth";
import { addNewUserToDb } from "../api/users";
// import { addNewUserToDb } from "../api/users";

export function login(email: string, password: string): Promise<UserCredential | void> {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => userCredential)
    .catch((error: AuthError) => {
      console.log("Error in login caught" + error);
      throw error; // Re-throw to handle it in the component
    });
}

export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.log("Error in logout caught" + error);
    throw error;
  }
}

export async function signUp(email: string, password: string, displayName: string): Promise<{ status: boolean; userCredential?: UserCredential; message?: string }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(userCredential);
    
    await addNewUserToDb(userCredential, displayName);
    return { status: true, userCredential };
  } catch (error: any) {
    return { status: false, message: error.message };
  }
}

export async function resetPassword(email: string): Promise<{ status: boolean; message?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { status: true, message: "Password reset email sent successfully." };
  } catch (error: any) {
    return { status: false, message: error.message };
  }
}

export type User = {
  _id: string;  // Unique identifier for the user
  email: string;  // User's email address
  username?: string;  // User's chosen username (optional)
  displayName?: string;
  firstName?: string;  // User's first name (optional)
  lastName?: string;  // User's last name (optional)
  profilePictureUrl?: string;  // URL to the user's profile picture (optional)
  createdAt?: Date;  // Timestamp when the user account was created
  updatedAt?: Date;  // Timestamp of the last update to the user's profile (optional)
};

// export async function changePassword(user: User, newPassword: string): Promise<{ status: boolean; message?: string }> {
//   try {
//     await updatePassword(user, newPassword);
//     return { status: true };
//   } catch (error) {
//     return { status: false, message: error.message };
//   }
// }
