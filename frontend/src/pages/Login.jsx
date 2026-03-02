import { auth } from "../services/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import "./styles.css";

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
      <div className="full-page">
        <div className="login-container">
          <div className="login-box">
            <h1 className="accent-gold">Sign In</h1>
            <button className="btn btn-gold" onClick={login}>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="full-page">
        <div className="login-container">
          <div className="login-box">
            <h1 className="accent-gold">Welcome</h1>
            <p className="help accent-gold">{user.displayName}</p>
            <p className="help">{user.email}</p>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="avatar"
                style={{ borderRadius: "50%", marginTop: "0.75rem" }}
              />
            )}
            <button className="btn btn-danger" style={{ marginTop: "1rem", width: "100%" }} onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }
}