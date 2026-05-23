import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("…");
  useEffect(() => {
    invoke<string>("healthcheck").then(setStatus);
  }, []);
  return <main style={{ padding: 16 }}>healthcheck: {status}</main>;
}
