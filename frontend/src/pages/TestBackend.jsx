import { useEffect, useState } from "react";
import axios from "axios";

export default function TestBackend() {
    const [data, setData] = useState(null);
    useEffect(() =>{
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/test-api`)
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