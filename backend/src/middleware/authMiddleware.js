import admin from "../config/firebaseadmin.js";

const verifyFirebaseToken = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = decodedToken; // attach user info
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export default verifyFirebaseToken;