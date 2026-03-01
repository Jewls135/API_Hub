import { auth } from "../services/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Login() {
  const [user, loading, error] = useAuthState(auth); // hook automatically listens to auth state

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  if (!user) {
    return (
      <div>
        <h1>Sign in</h1>
        <button onClick={login}>Sign in with Google</button>
      </div>
    );
  } else {
    return (
      <div>
        <h1>Welcome, {user.displayName}</h1>
        <p>Email: {user.email}</p>
        <img src={user.photoURL} alt="avatar" />
        <button onClick={logout}>Sign Out</button>
      </div>
    );
  }
}