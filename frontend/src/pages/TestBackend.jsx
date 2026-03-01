import { useEffect, useState } from "react";
import axios from "axios";

const token = await auth.currentUser.getIdToken(); // Fix later, will use tokens provided by firebase to check front/backend
export default function TestBackend() {
    const [data, setData] = useState(null);
    useEffect(() =>{
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/test-api`, {
            headers: {
                Authorization: `Bearer ${token}`
        }
         })
        .then(res => setData(res.data))
        .catch(err => console.log(err));

    }, []);

    return(
        <div>
            <h1>Backend / Frontend Connectivity Test</h1>
            <pre>{JSON.stringify(data, null)}</pre>
        </div>
    );
}